package com.margelo.nitro.nitrothemetransition

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorSpace
import android.graphics.HardwareRenderer
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.RenderNode
import android.graphics.Region
import android.hardware.HardwareBuffer
import android.media.Image
import android.media.ImageReader
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi

/**
 * A frozen copy of the app, drawn with a clip that shrinks over the transition.
 *
 * ── Why a copy at all ──
 * A Unistyles theme change is a whole-app style re-evaluation plus a shadow-tree
 * commit, synchronous on the JS thread. It cannot be animated frame by frame. So
 * the theme swap stays exactly as it is, and the ANIMATION runs on a copy of the
 * screen laid over the live app.
 *
 * ── Why the copy has to be rasterized ──
 * The obvious capture — record the view into a [RenderNode] with
 * `view.draw(recordingCanvas)` — DOES NOT WORK, and fails in a way that looks
 * like the animation is broken rather than the capture.
 *
 * `View.draw(Canvas)` delegates to `dispatchDraw` → `drawChild`, and on a
 * hardware canvas each child is emitted as `drawRenderNode(child.renderNode)` —
 * a REFERENCE to the child's live RenderNode, not a copy of its pixels. The
 * result is a live mirror of the app: the moment the theme changes, the
 * "snapshot" changes with it. Every mask, clip and opacity animation then plays
 * over content identical to what is underneath, so nothing appears to happen at
 * all — except `blur`, where the effect itself is visible even though it is
 * blurring the wrong frame.
 *
 * So the recording is only step one. Step two renders it into an offscreen
 * surface with [HardwareRenderer], which resolves every referenced RenderNode
 * into actual pixels, and the resulting [HardwareBuffer] is wrapped as a hardware
 * [Bitmap]. That bitmap is a genuine frozen frame, it lives in GPU memory, and it
 * is never read back to the CPU — the Android counterpart of iOS's
 * `snapshotView(afterScreenUpdates:)`.
 *
 * Below API 29 there is no public `HardwareRenderer`, so it falls back to a
 * software `Canvas` — which rasterizes for the same reason, since a software
 * canvas cannot reference RenderNodes and has to draw the pixels. That costs one
 * full-screen software draw at capture time; the animation itself is GPU-side
 * either way.
 */
@SuppressLint("ViewConstructor")
internal class SnapshotView(context: Context) : View(context) {

  /** Which clip [onDraw] applies. */
  enum class Clip {
    /** Draw everything — used by `fade` and `blur`, which animate the view itself. */
    NONE,

    /** A growing hole at ([holeX], [holeY]) — `circularRevealInverse`. */
    HOLE,

    /** A shrinking rect — `slide`, which is a wipe. */
    WIPE,
  }

  private var bitmap: Bitmap? = null

  /**
   * Held for the lifetime of the snapshot.
   *
   * [Bitmap.wrapHardwareBuffer] takes its own reference to the underlying buffer,
   * but keeping the reader and image open until [release] means the frame cannot
   * be recycled out from under us on any implementation.
   */
  private var reader: ImageReader? = null
  private var image: Image? = null

  /**
   * Size of the captured content, in px.
   *
   * Geometry is measured against THIS rather than the view's own `width`/
   * `height`: the overlay is configured the moment it is created, and a freshly
   * added view has not been laid out yet, so its own size is still zero.
   */
  private var contentWidth = 0
  private var contentHeight = 0

  /** Size of the captured content, in px — valid as soon as [capture] succeeds. */
  val capturedWidth: Int
    get() = contentWidth

  val capturedHeight: Int
    get() = contentHeight

  var clip = Clip.NONE
  var direction = ThemeTransitionDirection.BOTTOM
  var holeX = 0f
  var holeY = 0f

  /**
   * How far through the clip animation, 0..1, already eased by the animator's
   * interpolator. Setting it invalidates — which for a single bitmap draw is a
   * re-issue of one draw op with a different clip, not a real redraw.
   */
  var progress = 0f
    set(value) {
      field = value
      if (clip != Clip.NONE) invalidate()
    }

  /** Longest distance from the hole centre to a corner — the radius that covers all of it. */
  var holeMaxRadius = 0f
    private set

  // Reused every frame; allocating in onDraw is the classic way to make a smooth
  // animation stutter.
  private val clipPath = Path()
  private val clipRect = RectF()

  init {
    // Touches fall through to the live app underneath, which is already on the
    // new theme and is what the user means to hit.
    isClickable = false
    isFocusable = false
    setWillNotDraw(false)
  }

  /**
   * Tells Android the content never overlaps itself, so `alpha` is applied as a
   * plain colour filter on the single draw op instead of being routed through an
   * offscreen layer. Correct here by construction: the snapshot is one bitmap.
   */
  override fun hasOverlappingRendering(): Boolean = false

  /**
   * Copies [source] into this view. Returns false if nothing could be captured,
   * in which case the caller must fall back to an instant theme change.
   */
  fun capture(source: View): Boolean {
    if (source.width <= 0 || source.height <= 0) return false

    contentWidth = source.width
    contentHeight = source.height

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      bitmap = captureOnGpu(source)
      if (bitmap != null) return true
    }

    bitmap = captureOnCpu(source)
    return bitmap != null
  }

  /**
   * Records [source] and rasterizes the recording into a GPU buffer — see the
   * class comment for why the rasterization is not optional.
   */
  @RequiresApi(Build.VERSION_CODES.Q)
  private fun captureOnGpu(source: View): Bitmap? =
    runCatching {
        val width = source.width
        val height = source.height

        val node = RenderNode("ThemeTransitionSnapshot")
        node.setPosition(0, 0, width, height)
        val recording = node.beginRecording()
        try {
          source.draw(recording)
        } finally {
          node.endRecording()
        }

        val reader =
          ImageReader.newInstance(
            width,
            height,
            PixelFormat.RGBA_8888,
            1,
            HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE or HardwareBuffer.USAGE_GPU_COLOR_OUTPUT,
          )
        val renderer = HardwareRenderer()

        val captured =
          try {
            renderer.setSurface(reader.surface)
            renderer.setContentRoot(node)
            applyLightSource(renderer, width)

            // Blocks until the frame is presented, so the image is ready to
            // acquire. A few milliseconds of GPU wait, against a full-screen
            // software rasterization on the alternative path.
            renderer.createRenderRequest().setWaitForPresent(true).syncAndDraw()

            val image = reader.acquireNextImage()
            val buffer = image?.hardwareBuffer

            if (buffer == null) {
              image?.close()
              null
            } else {
              this.reader = reader
              this.image = image
              buffer.use { Bitmap.wrapHardwareBuffer(it, ColorSpace.get(ColorSpace.Named.SRGB)) }
            }
          } finally {
            renderer.destroy()
            node.discardDisplayList()
          }

        if (captured == null) reader.close()
        captured
      }
      .getOrNull()

  /**
   * Matches `ThreadedRenderer`'s own light source, so views with elevation cast
   * the same shadows in the capture as they do on screen. Without it they render
   * flat, and the snapshot does not quite match the frame it replaces.
   */
  @RequiresApi(Build.VERSION_CODES.Q)
  private fun applyLightSource(renderer: HardwareRenderer, width: Int) {
    val density = resources.displayMetrics.density

    renderer.setLightSourceGeometry(
      width / 2f,
      -LIGHT_Y_DP * density,
      LIGHT_Z_DP * density,
      LIGHT_RADIUS_DP * density,
    )
    renderer.setLightSourceAlpha(AMBIENT_SHADOW_ALPHA, SPOT_SHADOW_ALPHA)
  }

  /** API 28 and below. A software canvas has to rasterize, which is what we want. */
  private fun captureOnCpu(source: View): Bitmap? =
    runCatching {
        val bitmap = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
        source.draw(Canvas(bitmap))
        bitmap
      }
      // An OOM on a full-screen bitmap is survivable: skip the animation.
      .getOrNull()

  /** Precomputes the reveal radius. Requires [capture] to have run. */
  fun prepareHole(x: Float, y: Float) {
    holeX = x
    holeY = y
    val w = contentWidth.toFloat()
    val h = contentHeight.toFloat()

    holeMaxRadius = maxOf(hypot(x, y), hypot(w - x, y), hypot(x, h - y), hypot(w - x, h - y))
  }

  private fun hypot(x: Float, y: Float) = kotlin.math.hypot(x.toDouble(), y.toDouble()).toFloat()

  override fun onDraw(canvas: Canvas) {
    val bitmap = this.bitmap ?: return

    // A hardware bitmap cannot be drawn by a software canvas. In practice the
    // window is always hardware accelerated; this keeps a screenshot, or a
    // software-layered ancestor, from throwing.
    if (!canvas.isHardwareAccelerated && bitmap.config == Bitmap.Config.HARDWARE) return

    val save = canvas.save()

    when (clip) {
      Clip.NONE -> Unit
      Clip.HOLE -> clipOutHole(canvas)
      Clip.WIPE -> clipToWipe(canvas)
    }

    canvas.drawBitmap(bitmap, 0f, 0f, null)
    canvas.restoreToCount(save)
  }

  /** Punches a growing circle out of the old screen. */
  @Suppress("DEPRECATION")
  private fun clipOutHole(canvas: Canvas) {
    val radius = holeMaxRadius * progress
    if (radius <= 0f) return

    clipPath.rewind()
    clipPath.addCircle(holeX, holeY, radius, Path.Direction.CW)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      canvas.clipOutPath(clipPath)
    } else {
      // `clipOutPath`'s predecessor. Deprecated, but the only option on API 24/25
      // and still honoured by the hardware canvas there.
      canvas.clipPath(clipPath, Region.Op.DIFFERENCE)
    }
  }

  /**
   * Sweeps a straight edge across the screen.
   *
   * The old pixels do not move — they stop being drawn as the boundary passes
   * over them, so it reads as a line painting the new theme across the screen.
   * Translating the snapshot instead would drag the whole UI sideways, which
   * looks like a page transition rather than a theme change.
   *
   * [direction] names the edge the old screen leaves through: the surviving
   * sliver ends up against that edge.
   */
  private fun clipToWipe(canvas: Canvas) {
    val w = contentWidth.toFloat()
    val h = contentHeight.toFloat()
    val t = progress

    when (direction) {
      ThemeTransitionDirection.TOP -> clipRect.set(0f, 0f, w, h * (1f - t))
      ThemeTransitionDirection.BOTTOM -> clipRect.set(0f, h * t, w, h)
      ThemeTransitionDirection.LEFT -> clipRect.set(0f, 0f, w * (1f - t), h)
      ThemeTransitionDirection.RIGHT -> clipRect.set(w * t, 0f, w, h)
    }

    canvas.clipRect(clipRect)
  }

  /**
   * Drops the copy and its GPU buffer. Safe to call more than once.
   *
   * A full-screen frame is ~10 MB, and up to six can be alive at once, so this
   * frees all three references to the underlying [HardwareBuffer] **now** rather
   * than leaving the last one to the garbage collector:
   *
   *  - `recycle()` drops the [Bitmap]'s reference. Without it the buffer would
   *    survive until the Bitmap is collected — Android tracks it as native
   *    allocation pressure so it does come back eventually, but "eventually" is
   *    the wrong guarantee for something this size that is created on every
   *    theme change.
   *  - closing the [Image] returns the slot to the reader.
   *  - closing the [ImageReader] frees the reader's own reference.
   *
   * Recycling is safe here because the field is cleared first, so [onDraw] can no
   * longer reach the bitmap, and the view has already been detached by
   * `Transition.stop()`. A display list still being replayed by the RenderThread
   * holds its own native reference to the buffer, which refcounting handles.
   */
  fun release() {
    bitmap?.let {
      bitmap = null
      if (!it.isRecycled) it.recycle()
    }

    image?.close()
    image = null
    reader?.close()
    reader = null
  }

  private companion object {
    // ThreadedRenderer's own defaults, in dp.
    const val LIGHT_Y_DP = 600f
    const val LIGHT_Z_DP = 600f
    const val LIGHT_RADIUS_DP = 800f
    const val AMBIENT_SHADOW_ALPHA = 0.039f
    const val SPOT_SHADOW_ALPHA = 0.19f
  }
}

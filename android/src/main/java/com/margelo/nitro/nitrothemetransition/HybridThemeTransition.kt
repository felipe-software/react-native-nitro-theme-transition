package com.margelo.nitro.nitrothemetransition

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.View
import android.view.ViewAnimationUtils
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import androidx.annotation.RequiresApi
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Native theme-change transition for Android — the counterpart of
 * `ios/HybridThemeTransition.swift`, with the same behaviour and the same
 * guarantees.
 *
 * ── Why it is built this way ──
 * A Unistyles theme change is a whole-app style re-evaluation plus a shadow-tree
 * commit, synchronous on the JS thread. It cannot be animated frame by frame. So
 * the theme swap stays exactly as it is, and the ANIMATION is applied to a copy
 * of the screen instead (see [SnapshotView]).
 *
 * Every animation here is either driven by the platform's RenderThread
 * ([ViewAnimationUtils.createCircularReveal], property animations on the view) or
 * is a single clipped draw op per frame. Nothing round-trips through JavaScript,
 * so a busy JS thread cannot stutter them.
 *
 * ── Concurrent transitions ──
 * Switching again before a reveal finishes does NOT cancel anything. Each change
 * gets its own snapshot and its own animation, and they play at the same time:
 *
 *     android.R.id.content
 *       ├─ [0] React Native root  ← live app, already on the newest theme
 *       ├─ [1] snapshot B         ← newest change, animating away to reveal it
 *       └─ [2] snapshot A         ← oldest change, TOP-most, revealing B
 *
 * Each snapshot reveals whatever sits directly beneath it, which is exactly the
 * state the app was in one step later. Newer snapshots therefore go BELOW older
 * ones, and the stack stays visually consistent no matter how fast the user taps.
 *
 * In a `FrameLayout` with equal elevation, child index IS z-order — later
 * children draw on top — so "insert at index 1" puts the newest snapshot
 * directly above the live app and below every older snapshot. This is also why
 * only the React root is captured while the overlays are siblings of it: a
 * snapshot must contain the live app *without* the other snapshots, or each
 * capture would bake in a frozen copy of the animations still running above it.
 */
class HybridThemeTransition : HybridThemeTransitionSpec() {

  /** One in-flight transition: the snapshot and whatever is animating it. */
  private class Transition(val view: SnapshotView) {
    /**
     * Retained so it is not collected mid-flight, and so it can be cancelled if
     * this snapshot is torn down early.
     */
    var animator: Animator? = null

    fun stop() {
      // A no-op if it already ran to completion, so this cannot double-fire the
      // completion listener — `onAnimationCancel` is only reached from a genuine
      // early teardown.
      animator?.cancel()
      animator = null

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        view.setRenderEffect(null)
      }

      // Detach BEFORE releasing. Removing the view is what stops it being asked
      // to re-record a display list, so by the time the frame is recycled below
      // nothing can try to draw it again.
      (view.parent as? ViewGroup)?.removeView(view)
      view.release()
    }
  }

  /**
   * Live snapshots, oldest first.
   *
   * Oldest is the top-most view and finishes first; newest is the bottom-most,
   * sitting directly above the live app.
   */
  private val transitions = mutableListOf<Transition>()

  /**
   * Captured by [begin], waiting for its [commit]. Never more than one: callers
   * always pair the two within a single synchronous block.
   */
  private var pending: Transition? = null

  private val mainHandler = Handler(Looper.getMainLooper())

  // MARK: - Spec

  override fun begin(): Boolean =
    // The View system is main-thread only, and this must be SYNCHRONOUS: when
    // `begin()` returns, the screen has to already be covered, so no frame can
    // render between the capture and the caller's theme change.
    onMainSync(false) { capture() }

  override fun commit(options: ThemeTransitionOptions): Promise<Unit> {
    val promise = Promise<Unit>()

    mainHandler.post {
      val transition = pending
      if (transition == null) {
        // `begin()` never succeeded, or `abort()` already ran. The theme change
        // still happened — there is simply nothing to animate.
        promise.resolve(Unit)
        return@post
      }

      pending = null

      // Hold for a few frames so the theme swap — committed on the JS thread and
      // mounted a frame or two later — has actually painted underneath.
      // Revealing early would animate down to the OLD colours.
      waitFrames(options.settleFrames.toInt()) {
        if (!transitions.contains(transition)) {
          // Dropped by the overlay cap or by `dispose()` while we waited.
          promise.resolve(Unit)
          return@waitFrames
        }

        animate(transition, options) { promise.resolve(Unit) }
      }
    }

    return promise
  }

  override fun abort() {
    onMainSync(Unit) {
      val transition = pending ?: return@onMainSync
      pending = null
      remove(transition)
    }
  }

  /** Called if JS disposes the object mid-transition — never strand an overlay. */
  override fun dispose() {
    onMainSync(Unit) {
      pending = null
      transitions.forEach { it.stop() }
      transitions.clear()
    }
    super.dispose()
  }

  // MARK: - Capture

  /** Must run on the main thread. */
  private fun capture(): Boolean {
    // A previous `begin()` never reached its `commit()`. Don't leak it.
    pending?.let {
      pending = null
      remove(it)
    }

    val activity = NitroModules.applicationContext?.currentActivity ?: return false
    val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return false
    // The React Native root — the live app, never one of our own overlays. It is
    // index 0 in practice (overlays are inserted at 1 or above), but skipping
    // SnapshotViews explicitly means a capture can never nest a snapshot inside a
    // snapshot if anything else ever inserts a view below them.
    val root =
      (0 until content.childCount).map(content::getChildAt).firstOrNull { it !is SnapshotView }
        ?: return false

    val snapshot = SnapshotView(activity)
    if (!snapshot.capture(root)) return false

    // Sit exactly on top of the root rather than filling the parent, so the two
    // line up even if the root is inset.
    val params = FrameLayout.LayoutParams(root.width, root.height)
    params.leftMargin = root.left
    params.topMargin = root.top
    snapshot.layoutParams = params

    // Equal elevation is what makes child index decide z-order — see the class
    // comment. Without it a raised root would draw over its own snapshot.
    snapshot.elevation = root.elevation

    content.addView(snapshot, 1)

    val transition = Transition(snapshot)
    transitions.add(transition)
    pending = transition

    enforceOverlayCap()

    return true
  }

  /**
   * Ceiling on simultaneous snapshots.
   *
   * Each one is a full-screen layer the GPU composites every frame, so an
   * unbounded stack would eventually cost real time. Six is far past normal
   * interaction; beyond it the OLDEST is dropped, which is the least visible
   * choice — by then it is the furthest through its animation.
   */
  private fun enforceOverlayCap() {
    while (transitions.size > MAX_OVERLAYS) {
      remove(transitions.first())
    }
  }

  /** Drops a transition from the stack and the view hierarchy. */
  private fun remove(transition: Transition) {
    transitions.remove(transition)
    transition.stop()
  }

  // MARK: - Animation

  private fun animate(
    transition: Transition,
    options: ThemeTransitionOptions,
    completion: () -> Unit,
  ) {
    val duration = maxOf(0.0, options.durationMs).toLong()

    val finish = {
      remove(transition)
      completion()
    }

    if (duration == 0L) {
      finish()
      return
    }

    when (options.kind) {
      ThemeTransitionKind.FADE -> animateFade(transition, duration, finish)
      ThemeTransitionKind.CIRCULARREVEAL ->
        animateCircularReveal(transition, options, inverse = false, duration = duration, finish = finish)
      ThemeTransitionKind.CIRCULARREVEALINVERSE ->
        animateCircularReveal(transition, options, inverse = true, duration = duration, finish = finish)
      ThemeTransitionKind.SLIDE -> animateWipe(transition, options.direction, duration, finish)
      ThemeTransitionKind.BLUR -> animateBlur(transition, duration, finish)
    }
  }

  /** Straight opacity dissolve. */
  private fun animateFade(transition: Transition, duration: Long, finish: () -> Unit) {
    start(transition, duration, finish) { view, t -> view.alpha = 1f - t }
  }

  /**
   * Sweeps a straight edge across the screen, uncovering the new theme.
   *
   * Nothing translates — the clip does all the work, see [SnapshotView.Clip.WIPE].
   */
  private fun animateWipe(
    transition: Transition,
    direction: ThemeTransitionDirection,
    duration: Long,
    finish: () -> Unit,
  ) {
    transition.view.direction = direction
    transition.view.clip = SnapshotView.Clip.WIPE

    start(transition, duration, finish) { view, t -> view.progress = t }
  }

  /**
   * The circle at the origin, uncovering whatever sits beneath this snapshot.
   *
   *   inverse == false  the OLD screen shrinks INTO the circle — the new theme
   *                     arrives from the edges and closes in on the touch point.
   *   inverse == true   a HOLE opens at the circle and grows — the new theme
   *                     spreads outward from the touch point.
   *
   * Same shape, run the other way round, and they are each other's natural
   * counterpart: whichever one is used for light→dark, the other reads as "undo"
   * for dark→light.
   *
   * The forward case uses [ViewAnimationUtils.createCircularReveal], which sets a
   * reveal clip on the view's RenderNode and is interpolated entirely on the
   * RenderThread. There is no platform API for the inverse, so that one animates
   * [SnapshotView.progress] and clips the hole out in `onDraw` — one draw op per
   * frame against an already-recorded display list.
   */
  private fun animateCircularReveal(
    transition: Transition,
    options: ThemeTransitionOptions,
    inverse: Boolean,
    duration: Long,
    finish: () -> Unit,
  ) {
    val view = transition.view
    val density = view.resources.displayMetrics.density

    // JS measures in dp; the View system in px. (iOS points need no conversion,
    // which is why this only exists here.)
    val hasOrigin = options.originX >= 0 && options.originY >= 0
    val x = if (hasOrigin) (options.originX * density).toFloat() else view.capturedWidth / 2f
    val y = if (hasOrigin) (options.originY * density).toFloat() else view.capturedHeight / 2f

    view.prepareHole(x, y)

    if (inverse) {
      view.clip = SnapshotView.Clip.HOLE
      start(transition, duration, finish) { snapshot, t -> snapshot.progress = t }
      return
    }

    val animator =
      ViewAnimationUtils.createCircularReveal(view, x.toInt(), y.toInt(), view.holeMaxRadius, 0f)
    animator.duration = duration
    animator.interpolator = curve()
    onEnd(animator, finish)

    transition.animator = animator
    animator.start()
  }

  /**
   * Blurs the outgoing screen as it dissolves.
   *
   * [RenderEffect] is a GPU shader attached to the view's RenderNode, so the blur
   * costs nothing on the CPU — but unlike alpha it is not an animatable property,
   * so the radius has to be reassigned each frame.
   *
   * The slight scale-up stops it reading as a flat cross-fade; the old screen
   * feels like it is receding rather than just vanishing.
   *
   * Below API 31 there is no RenderEffect, and the honest fallback is the same
   * motion without the blur rather than a CPU blur that would drop frames.
   */
  private fun animateBlur(transition: Transition, duration: Long, finish: () -> Unit) {
    // `RenderEffect` radii are in px, so a fixed constant would be a heavy blur on
    // a 1x screen and a faint one on a 3x screen.
    val radius = BLUR_RADIUS_DP * transition.view.resources.displayMetrics.density

    start(transition, duration, finish) { view, t ->
      view.alpha = 1f - t
      view.scaleX = 1f + 0.04f * t
      view.scaleY = 1f + 0.04f * t

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        applyBlur(view, radius * t)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.S)
  private fun applyBlur(view: View, radius: Float) {
    // `createBlurEffect` rejects a zero radius, and zero blur is just no effect.
    view.setRenderEffect(
      if (radius <= 0f) null
      else RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP)
    )
  }

  /**
   * Runs a 0→1 animation with the shared curve, retaining the animator on the
   * transition so it survives and can be cancelled.
   *
   * `t` is already eased, so [onFrame] can interpolate linearly.
   */
  private fun start(
    transition: Transition,
    duration: Long,
    finish: () -> Unit,
    onFrame: (SnapshotView, Float) -> Unit,
  ) {
    val view = transition.view
    val animator = ValueAnimator.ofFloat(0f, 1f)
    animator.duration = duration
    animator.interpolator = curve()
    animator.addUpdateListener { onFrame(view, it.animatedValue as Float) }
    onEnd(animator, finish)

    transition.animator = animator
    animator.start()
  }

  /**
   * Calls [finish] when the animation runs to completion, but NOT when it is
   * cancelled — a cancellation comes from a teardown that has already removed the
   * view, and finishing again would double-resolve the promise.
   */
  private fun onEnd(animator: Animator, finish: () -> Unit) {
    animator.addListener(
      object : AnimatorListenerAdapter() {
        private var cancelled = false

        override fun onAnimationCancel(animation: Animator) {
          cancelled = true
        }

        override fun onAnimationEnd(animation: Animator) {
          if (!cancelled) finish()
        }
      }
    )
  }

  /** Matches `easing.standard` in `@repo/tokens`, so every platform agrees. */
  private fun curve() = PathInterpolator(0.2f, 0f, 0f, 1f)

  // MARK: - Frame waiting

  /**
   * Runs [work] after [frames] display frames. Must be called on the main thread.
   *
   * Several can be in flight at once, one per concurrent transition, and each
   * [work] re-checks that its overlay is still in the stack before touching it.
   */
  private fun waitFrames(frames: Int, work: () -> Unit) {
    if (frames <= 0) {
      work()
      return
    }

    var remaining = frames
    val choreographer = Choreographer.getInstance()

    lateinit var callback: Choreographer.FrameCallback
    callback =
      Choreographer.FrameCallback {
        remaining -= 1
        if (remaining <= 0) work() else choreographer.postFrameCallback(callback)
      }

    choreographer.postFrameCallback(callback)
  }

  // MARK: - Threading

  /**
   * Runs [block] on the main thread synchronously, without deadlocking when the
   * caller is already on it.
   *
   * The timeout is a safety valve, not an expectation: the JS thread blocking
   * here is only ever waiting on a view capture. If the main thread is so busy
   * that it cannot service the post in time, the [fallback] means the theme still
   * changes — just instantly, with no animation.
   */
  private fun <T> onMainSync(fallback: T, block: () -> T): T {
    if (Looper.myLooper() == Looper.getMainLooper()) return block()

    var result = fallback
    val latch = CountDownLatch(1)

    mainHandler.post {
      try {
        result = block()
      } finally {
        latch.countDown()
      }
    }

    return if (latch.await(SYNC_TIMEOUT_MS, TimeUnit.MILLISECONDS)) result else fallback
  }

  private companion object {
    const val MAX_OVERLAYS = 6
    const val SYNC_TIMEOUT_MS = 250L

    /** Matches the visual weight of iOS's `.systemThinMaterial`. */
    const val BLUR_RADIUS_DP = 12f
  }
}

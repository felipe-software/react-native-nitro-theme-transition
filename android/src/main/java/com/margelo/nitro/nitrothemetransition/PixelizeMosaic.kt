package com.margelo.nitro.nitrothemetransition

import android.graphics.Bitmap
import android.graphics.Color
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The geometry `pixlated` works in, and every mosaic level it can draw.
 *
 * Matches Skia's `pixelize` shader:
 *
 * ```
 * cell = (floor(xy / blockSize) + 0.5) * blockSize
 * color = source.eval(cell)
 * ```
 *
 * ── The insight that makes it cheap ──
 * The mosaic never draws a cell finer than [MIN_BLOCK_DP], at either end of its
 * triangle. A grid at exactly that resolution therefore already contains every
 * pixel any level of the effect can display — it IS the `blockSize == minBlock`
 * mosaic — and every coarser level is a subsample of it.
 *
 * So nothing here touches a screen-resolution bitmap. Both frames are captured
 * straight into this grid (roughly 180x400 rather than 1080x2400), and the whole
 * [ladder] is built from it once, up front. Playing the effect is then a matter
 * of pointing a view at a different pre-built frame; no pixel is sampled and no
 * bitmap is allocated while the animation runs.
 *
 * The previous version rebuilt two mosaics from full-resolution buffers on every
 * frame, which is what made this the one kind that dropped the UI.
 */
internal object PixelizeMosaic {

  /** Cell size at the ends and at the peak of the triangle, in dp. */
  const val MIN_BLOCK_DP = 2f
  const val MAX_BLOCK_DP = 52f

  /**
   * How many distinct mosaics are built.
   *
   * The level is picked from the triangle, so over a 650ms transition at 60fps
   * the index advances a little over one step per frame — finer than the eye can
   * follow, and the alpha crossfade underneath stays continuous regardless.
   * Levels shrink as `1/step²`, so all 24 together cost about 1.5x the finest
   * one on its own.
   */
  const val LEVELS = 24

  /** The finest grid — one cell per [MIN_BLOCK_DP] — for content this size in px. */
  fun gridWidth(contentWidthPx: Int, density: Float): Int =
    max(1, ceilDiv(contentWidthPx, max(1, (MIN_BLOCK_DP * density).roundToInt())))

  fun gridHeight(contentHeightPx: Int, density: Float): Int =
    max(1, ceilDiv(contentHeightPx, max(1, (MIN_BLOCK_DP * density).roundToInt())))

  /** How many of the finest cells make up one cell at [index]. */
  fun step(index: Int): Float {
    if (LEVELS <= 1) return 1f
    val t = index.toFloat() / (LEVELS - 1)
    return (MIN_BLOCK_DP + t * (MAX_BLOCK_DP - MIN_BLOCK_DP)) / MIN_BLOCK_DP
  }

  /** Which level a triangle value 0..1 lands on. */
  fun level(triangle: Float): Int =
    (triangle.coerceIn(0f, 1f) * (LEVELS - 1)).roundToInt().coerceIn(0, LEVELS - 1)

  private fun ceilDiv(value: Int, by: Int) = (value + by - 1) / by

  /** Raw ARGB buffer for fast cell-centre sampling. */
  class Buffer(val width: Int, val height: Int, val pixels: IntArray) {
    companion object {
      fun from(bitmap: Bitmap): Buffer? =
        runCatching {
            val software =
              if (bitmap.config == Bitmap.Config.HARDWARE) {
                bitmap.copy(Bitmap.Config.ARGB_8888, false)
                  ?: return@runCatching null
              } else {
                bitmap
              }
            val pixels = IntArray(software.width * software.height)
            software.getPixels(pixels, 0, software.width, 0, 0, software.width, software.height)
            if (software !== bitmap) software.recycle()
            Buffer(software.width, software.height, pixels)
          }
          .getOrNull()
    }

    fun sample(x: Float, y: Float): Int {
      val px = min(width - 1, max(0, x.toInt()))
      val py = min(height - 1, max(0, y.toInt()))
      return pixels[py * width + px]
    }

    /** Sparse mean RGB — used to detect when the new-theme capture differs. */
    fun meanRGB(): Triple<Double, Double, Double> {
      var r = 0.0
      var g = 0.0
      var b = 0.0
      var n = 0.0
      val step = max(1, width / 24)
      var y = 0
      while (y < height) {
        var x = 0
        while (x < width) {
          val c = sample(x.toFloat(), y.toFloat())
          r += Color.red(c).toDouble()
          g += Color.green(c).toDouble()
          b += Color.blue(c).toDouble()
          n += 1
          x += step
        }
        y += step
      }
      if (n <= 0) return Triple(0.0, 0.0, 0.0)
      return Triple(r / n, g / n, b / n)
    }
  }

  /**
   * Every level, from the finest grid. Safe to call off the main thread — it
   * only reads [source] and allocates bitmaps.
   *
   * Level 0 is the source verbatim; level `i` samples it every `step(i)` cells,
   * which is the same cell-centre arithmetic as the shader, one indirection
   * later. The caller owns the result and must [releaseLadder] it.
   */
  fun ladder(source: Buffer): List<Bitmap>? =
    runCatching {
        val levels = ArrayList<Bitmap>(LEVELS)
        try {
          for (index in 0 until LEVELS) levels.add(level(source, index))
        } catch (error: Throwable) {
          releaseLadder(levels)
          throw error
        }
        levels
      }
      .getOrNull()

  fun releaseLadder(levels: List<Bitmap>?) {
    levels?.forEach { if (!it.isRecycled) it.recycle() }
  }

  private fun level(source: Buffer, index: Int): Bitmap {
    val step = step(index)
    val cols = max(1, kotlin.math.ceil(source.width / step).toInt())
    val rows = max(1, kotlin.math.ceil(source.height / step).toInt())

    val pixels = IntArray(cols * rows)

    // Column centres are the same on every row, so they are resolved once.
    val columns = IntArray(cols) { min(source.width - 1, ((it + 0.5f) * step).toInt()) }

    for (row in 0 until rows) {
      val sourceRow = min(source.height - 1, ((row + 0.5f) * step).toInt()) * source.width
      val outRow = row * cols
      for (col in 0 until cols) {
        pixels[outRow + col] = source.pixels[sourceRow + columns[col]]
      }
    }

    val out = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
    out.setPixels(pixels, 0, cols, 0, 0, cols, rows)
    return out
  }
}

package com.margelo.nitro.nitrothemetransition

import android.graphics.Bitmap
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.sin

/**
 * The pre-built alpha masks behind `dissolve`, `stripes`, `ripple` and
 * `shatter`. The counterpart of `GrainMask` in
 * `ios/HybridThemeTransition.swift` — the hash below must stay identical to it,
 * or the two platforms speckle differently.
 *
 * ── Matching the Skia package without a shader ──
 * The reference dissolve is a fragment shader that discards a pixel when its
 * cell's noise falls below the current threshold:
 *
 * ```
 * cell = floor(xy / grain)
 * n    = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453)
 * if (n < threshold) discard
 * ```
 *
 * What makes it work without a shader is that the value is **static**: a cell's
 * threshold never changes, so a cell simply has a fixed time at which it
 * disappears. Every frame the effect can ever draw is therefore known in
 * advance, and the whole thing collapses to a pre-built stack of alpha masks —
 * the same trick as [PixelizeMosaic]'s ladder, one step further.
 *
 * ── Why four effects share one implementation ──
 * Nothing above depends on the value being NOISE. Any per-cell number in 0..1 is
 * a valid disappearing order, so the four patterns differ only in how that
 * number is computed:
 *
 *  - `DISSOLVE` the hash, unmodified — no order at all
 *  - `STRIPES`  position along the direction, roughened by a little of the hash
 *  - `RIPPLE`   distance from the origin, with a sine riding on it
 *  - `SHATTER`  the hash of the nearest of a fixed set of seeds — Voronoi cells
 *
 * Everything after [thresholds] is identical for all four.
 *
 * ── Why the ladders are cached ──
 * `DISSOLVE` and `SHATTER` depend on the grid alone, so their ladders are built
 * once and then serve every transition for the life of the process. `STRIPES`
 * adds the axis and `RIPPLE` the origin, which is why the cache holds several
 * rather than one. Nothing here is ever recycled: a ladder can be in use by any
 * number of concurrent transitions.
 */
internal object DissolveGrain {

  /**
   * Cell size in dp. Five is the reference default: coarse enough to read as
   * grain, fine enough not to look like a mosaic.
   */
  const val CELL_DP = 5f

  /**
   * Distinct masks in a ladder.
   *
   * This is the effect's frame rate: 40 over a 650ms transition is one step
   * every ~16ms, which is a frame. Going finer would only add memory.
   */
  const val STEPS = 40

  enum class Pattern {
    DISSOLVE,
    STRIPES,
    RIPPLE,
    SHATTER,
  }

  /** What a ladder is a function of — and therefore what it can be reused for. */
  data class Key(
    val pattern: Pattern,
    val cols: Int,
    val rows: Int,
    val axis: Int,
    val originCol: Int,
    val originRow: Int,
  ) {
    companion object {
      fun make(
        pattern: Pattern,
        cols: Int,
        rows: Int,
        direction: ThemeTransitionDirection,
        originCol: Int,
        originRow: Int,
      ): Key {
        val axis =
          when (direction) {
            ThemeTransitionDirection.TOP -> 0
            ThemeTransitionDirection.BOTTOM -> 1
            ThemeTransitionDirection.LEFT -> 2
            ThemeTransitionDirection.RIGHT -> 3
          }

        // Only the patterns that actually use a term include it, so a dissolve
        // never misses the cache because the user tapped somewhere new.
        return Key(
          pattern = pattern,
          cols = cols,
          rows = rows,
          axis = if (pattern == Pattern.STRIPES) axis else 0,
          originCol = if (pattern == Pattern.RIPPLE) originCol else 0,
          originRow = if (pattern == Pattern.RIPPLE) originRow else 0,
        )
      }
    }
  }

  /** Most recent first. Small on purpose: each entry is ~550 KB of masks. */
  private val cache = mutableListOf<Pair<Key, List<Bitmap>>>()
  private const val CACHE_LIMIT = 4

  fun columns(widthPx: Int, density: Float): Int =
    max(1, ceilDiv(widthPx, max(1, (CELL_DP * density).toInt())))

  fun rows(heightPx: Int, density: Float): Int =
    max(1, ceilDiv(heightPx, max(1, (CELL_DP * density).toInt())))

  private fun ceilDiv(value: Int, by: Int) = (value + by - 1) / by

  /** Main thread only. */
  fun cachedLadder(key: Key): List<Bitmap>? {
    val index = cache.indexOfFirst { it.first == key }
    if (index < 0) return null

    // Move to front, so the limit evicts what has gone unused rather than what
    // happens to be oldest.
    val entry = cache.removeAt(index)
    cache.add(0, entry)
    return entry.second
  }

  /** Main thread only. */
  fun store(key: Key, ladder: List<Bitmap>) {
    cache.removeAll { it.first == key }
    cache.add(0, key to ladder)
    while (cache.size > CACHE_LIMIT) {
      // Dropped, NOT recycled. A transition that is still playing holds its
      // own reference to these frames and may be drawing one right now;
      // recycling here would tear a bitmap out from under it. They are small,
      // and the collector takes them once nothing points at them.
      cache.removeAt(cache.size - 1)
    }
  }

  /** The 0..1 hash the reference shader uses, for a pair of numbers. */
  private fun hash(x: Double, y: Double): Double {
    val scaled = sin(x * 12.9898 + y * 78.233) * 43758.5453
    return scaled - floor(scaled)
  }

  /**
   * When each cell disappears, as a value in 0..1. Pure, so it is safe off the
   * main thread — which is where it runs.
   */
  private fun thresholds(key: Key): DoubleArray {
    val cols = key.cols
    val rows = key.rows
    val out = DoubleArray(cols * rows)

    when (key.pattern) {
      Pattern.DISSOLVE ->
        for (row in 0 until rows) {
          for (col in 0 until cols) {
            out[row * cols + col] = hash(col.toDouble(), row.toDouble())
          }
        }

      Pattern.STRIPES -> {
        // Mostly position, with enough hash mixed in to keep the leading edge
        // ragged. All position would just be a wipe; all hash would be dissolve.
        val grain = 0.32
        for (row in 0 until rows) {
          for (col in 0 until cols) {
            val across = if (cols > 1) col.toDouble() / (cols - 1) else 0.0
            val down = if (rows > 1) row.toDouble() / (rows - 1) else 0.0

            // Cells nearest the edge the old screen leaves through go LAST,
            // which is what makes this read as the motion a wipe has.
            val position =
              when (key.axis) {
                0 -> 1.0 - down
                1 -> down
                2 -> 1.0 - across
                else -> across
              }

            out[row * cols + col] =
              position * (1 - grain) + hash(col.toDouble(), row.toDouble()) * grain
          }
        }
      }

      Pattern.RIPPLE -> {
        val originX = key.originCol.toDouble()
        val originY = key.originRow.toDouble()
        val span =
          max(
            1.0,
            maxOf(
              hypot(originX, originY),
              hypot(cols - originX, originY),
              hypot(originX, rows - originY),
              hypot(cols - originX, rows - originY),
            ),
          )

        // Rings, but never enough to reverse the front: the sine's slope is
        // `2 * PI * rings * amplitude`, which has to stay under 1 or cells
        // further out would clear before nearer ones and the wave would break.
        val rings = 5.0
        val amplitude = 0.028

        for (row in 0 until rows) {
          for (col in 0 until cols) {
            val distance = hypot(col - originX, row - originY) / span
            val rippled = distance + amplitude * sin(distance * 2 * PI * rings)
            out[row * cols + col] = rippled.coerceIn(0.0, 1.0)
          }
        }
      }

      Pattern.SHATTER -> {
        // Voronoi: every cell takes the disappearing time of its nearest seed,
        // so whole shards leave together.
        val seedCount = 48
        val seedX = DoubleArray(seedCount)
        val seedY = DoubleArray(seedCount)
        val seedTime = DoubleArray(seedCount)

        for (seed in 0 until seedCount) {
          seedX[seed] = hash(seed.toDouble(), 1.0) * cols
          seedY[seed] = hash(seed.toDouble(), 2.0) * rows
          seedTime[seed] = hash(seed.toDouble(), 3.0)
        }

        for (row in 0 until rows) {
          for (col in 0 until cols) {
            var nearest = 0
            var best = Double.MAX_VALUE

            for (seed in 0 until seedCount) {
              val dx = col - seedX[seed]
              val dy = row - seedY[seed]
              val distance = dx * dx + dy * dy
              if (distance < best) {
                best = distance
                nearest = seed
              }
            }

            out[row * cols + col] = seedTime[nearest]
          }
        }
      }
    }

    return out
  }

  /**
   * Builds every mask for this key. Pure, and therefore safe to run on a
   * background thread.
   *
   * `ALPHA_8` because that is exactly what the masks are — the snapshot supplies
   * the colour, and `DST_IN` supplies the meaning. It is also a quarter of the
   * memory of ARGB: a whole ladder for a 1080x2400 screen is about 550 KB.
   *
   * Thresholds are spaced LINEARLY, so the ladder is a plain lookup table and
   * the shared easing is applied where the animation is driven — by the
   * animator's interpolator here, and by resampling the keyframes on iOS. Baking
   * the curve in here as well would apply it twice.
   */
  fun build(key: Key): List<Bitmap>? =
    runCatching {
        val cols = key.cols
        val rows = key.rows
        val count = cols * rows
        val order = thresholds(key)

        val ladder = ArrayList<Bitmap>(STEPS)
        val alpha = ByteArray(count)
        val buffer = java.nio.ByteBuffer.wrap(alpha)

        for (step in 0 until STEPS) {
          val threshold = step.toDouble() / max(1, STEPS - 1)

          for (index in 0 until count) {
            // Opaque where the old screen survives, clear where it has gone.
            alpha[index] = if (order[index] < threshold) 0 else 0xFF.toByte()
          }

          val mask = Bitmap.createBitmap(cols, rows, Bitmap.Config.ALPHA_8)
          buffer.rewind()
          mask.copyPixelsFromBuffer(buffer)
          ladder.add(mask)
        }

        ladder as List<Bitmap>
      }
      .getOrNull()
}

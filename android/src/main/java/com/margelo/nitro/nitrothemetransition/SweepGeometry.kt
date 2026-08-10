package com.margelo.nitro.nitrothemetransition

import android.graphics.Path
import kotlin.math.cos
import kotlin.math.sin

/**
 * The geometry behind `slide` and `split`: a straight boundary sweeping across
 * the screen, at any angle. The counterpart of `Sweep` in
 * `ios/HybridThemeTransition.swift` — keep the two in step, or the platforms
 * stop wiping identically.
 *
 * ── One idea, used twice ──
 * Both kinds are "stop drawing the old screen on one side of a line". A wipe has
 * one such line travelling across the whole screen; a split has two, starting
 * together at the middle and parting. Expressing them as half-planes rather than
 * as rectangles is what lets the line be tilted at all — an axis-aligned
 * `clipRect` has no way to say "40° off level".
 *
 * A half-plane is `dot(p, n) >= threshold`, where `n` is a unit normal pointing
 * the way the surviving side lies. Sweeping is then nothing but moving
 * `threshold` from one end of the screen's projection onto `n` to the other: at
 * the low end every corner satisfies it, at the high end none do, whatever the
 * angle. That is the whole reason this generalises for free, and why
 * `angleDeg == 0` still reduces exactly to the rectangle clip it replaced.
 */
internal object SweepGeometry {

  /**
   * The direction the surviving side of the screen lies in, tilted by [angleDeg].
   *
   * Un-tilted this is simply the edge the old screen leaves through. The
   * rotation is the standard matrix, which reads as CLOCKWISE on screen because
   * y grows downward here.
   *
   * Allocates, so it is resolved once per transition rather than per frame.
   */
  fun normal(direction: ThemeTransitionDirection, angleDeg: Double): FloatArray {
    val baseX: Float
    val baseY: Float

    when (direction) {
      ThemeTransitionDirection.TOP -> {
        baseX = 0f
        baseY = -1f
      }
      ThemeTransitionDirection.BOTTOM -> {
        baseX = 0f
        baseY = 1f
      }
      ThemeTransitionDirection.LEFT -> {
        baseX = -1f
        baseY = 0f
      }
      ThemeTransitionDirection.RIGHT -> {
        baseX = 1f
        baseY = 0f
      }
    }

    if (angleDeg == 0.0) return floatArrayOf(baseX, baseY)

    val radians = Math.toRadians(angleDeg)
    val cosine = cos(radians).toFloat()
    val sine = sin(radians).toFloat()

    return floatArrayOf(
      baseX * cosine - baseY * sine,
      baseX * sine + baseY * cosine,
    )
  }

  /** How far the frame's corners project along the normal — the sweep's travel. */
  fun projection(width: Float, height: Float, nx: Float, ny: Float): FloatArray {
    val a = 0f
    val b = width * nx
    val c = height * ny
    val d = width * nx + height * ny

    return floatArrayOf(minOf(a, b, c, d), maxOf(a, b, c, d))
  }

  /**
   * How far a half-plane quad extends past the boundary line.
   *
   * Deliberately far larger than the frame: the quad is only ever used as a clip
   * against a canvas that is already bounded, so overshooting costs nothing and
   * saves having to intersect the half-plane with the rectangle — which would
   * change the shape as the line crossed each corner.
   */
  fun reach(width: Float, height: Float): Float = 2f * (width + height)

  /** Adds the quad covering `dot(p, n) >= threshold` as a new subpath. */
  fun addHalfPlane(path: Path, nx: Float, ny: Float, threshold: Float, reach: Float) {
    // Perpendicular to the normal: the direction the boundary line runs in.
    val px = -ny
    val py = nx

    val anchorX = threshold * nx
    val anchorY = threshold * ny

    path.moveTo(anchorX + px * reach, anchorY + py * reach)
    path.lineTo(anchorX - px * reach, anchorY - py * reach)
    path.lineTo(anchorX + nx * reach - px * reach, anchorY + ny * reach - py * reach)
    path.lineTo(anchorX + nx * reach + px * reach, anchorY + ny * reach + py * reach)
    path.close()
  }

  /**
   * Adds the quad covering `from <= dot(p, n) <= to` — a band between two
   * parallel boundaries.
   *
   * `barnDoor` is one of these closing on the middle; `blinds` is a row of them
   * each closing on its own far edge.
   */
  fun addSlab(path: Path, nx: Float, ny: Float, from: Float, to: Float, reach: Float) {
    val px = -ny
    val py = nx

    path.moveTo(nx * from + px * reach, ny * from + py * reach)
    path.lineTo(nx * from - px * reach, ny * from - py * reach)
    path.lineTo(nx * to - px * reach, ny * to - py * reach)
    path.lineTo(nx * to + px * reach, ny * to + py * reach)
    path.close()
  }
}

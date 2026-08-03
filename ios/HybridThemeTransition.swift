import Foundation
import NitroModules
import QuartzCore
import UIKit

/**
 * Native theme-change transition for iOS.
 *
 * ── Why it is built this way ──
 * A Unistyles theme change is a whole-app style re-evaluation plus a shadow-tree
 * commit, synchronous on the JS thread. It cannot be animated frame by frame.
 * So the theme swap stays exactly as it is, and the ANIMATION is applied to a
 * copy of the screen instead.
 *
 * The copy is a `UIView.snapshotView(afterScreenUpdates:)`, which is backed by a
 * render-server-side copy — no bitmap is ever read back to the CPU, encoded, or
 * decoded. Earlier attempts at this effect all round-tripped full-screen pixels
 * through JavaScript, and that latency is what made them feel laggy.
 *
 * Every animation here is UIKit/Core Animation. Once submitted they are
 * interpolated by the render server, so a busy (or blocked) JS thread cannot
 * drop a frame of them.
 *
 * ── Concurrent transitions ──
 * Switching again before a reveal finishes does NOT cancel anything. Each change
 * gets its own snapshot and its own animation, and they play at the same time:
 *
 *     window
 *       ├─ snapshot A   ← oldest change, TOP-most, animating away to reveal B
 *       ├─ snapshot B   ← next change, animating away to reveal the live view
 *       └─ rootViewController.view   ← live app, already on the newest theme
 *
 * Each snapshot reveals whatever sits directly beneath it, which is exactly the
 * state the app was in one step later. Newer snapshots therefore go BELOW older
 * ones, and the stack stays visually consistent no matter how fast the user taps.
 *
 * This is why snapshots live on the WINDOW while only
 * `rootViewController.view` is captured: a snapshot must contain the live app
 * *without* the other snapshots, or each capture would bake in a frozen copy of
 * the animations still running above it.
 */

/// Timing shared by every kind — matches `easing.standard` in `@repo/tokens`,
/// so the native transitions and the web wipe agree.
private enum Curve {
  static let controlPoint1 = CGPoint(x: 0.2, y: 0)
  static let controlPoint2 = CGPoint(x: 0, y: 1)

  static var media: CAMediaTimingFunction {
    CAMediaTimingFunction(
      controlPoints:
        Float(controlPoint1.x), Float(controlPoint1.y),
        Float(controlPoint2.x), Float(controlPoint2.y)
    )
  }
}

/**
 * Counts display frames, then fires once.
 *
 * Its own `NSObject` because `CADisplayLink` needs an ObjC selector target, and
 * Nitro's generated `HybridThemeTransitionSpec_base` is a plain Swift class —
 * `@objc` members are not available on it.
 */
private final class FrameWaiter: NSObject {
  private var link: CADisplayLink?
  private var remaining: Int
  private var work: (() -> Void)?

  init(frames: Int, work: @escaping () -> Void) {
    self.remaining = frames
    self.work = work
    super.init()

    let link = CADisplayLink(target: self, selector: #selector(onFrame))
    link.add(to: .main, forMode: .common)
    self.link = link
  }

  @objc private func onFrame() {
    remaining -= 1
    guard remaining <= 0 else { return }

    let work = self.work
    cancel()
    work?()
  }

  func cancel() {
    link?.invalidate()
    link = nil
    work = nil
  }
}

/// One in-flight transition: the snapshot and whatever is animating it.
private final class Transition {
  let view: UIView
  /// Retained so the animator is not deallocated mid-flight, and so it can be
  /// stopped if this snapshot is torn down early.
  var animator: UIViewPropertyAnimator?

  init(view: UIView) {
    self.view = view
  }

  func stop() {
    if let animator, animator.state == .active {
      animator.stopAnimation(true)
    }
    animator = nil

    view.layer.mask?.removeAllAnimations()
    view.layer.removeAllAnimations()
    view.layer.mask = nil
    view.removeFromSuperview()
  }
}

final class HybridThemeTransition: HybridThemeTransitionSpec {
  /**
   * Live snapshots, oldest first.
   *
   * Oldest is the top-most view and finishes first; newest is the bottom-most,
   * sitting directly above the live app.
   */
  private var transitions: [Transition] = []

  /// Captured by `begin()`, waiting for its `commit()`. Never more than one:
  /// callers always pair the two within a single synchronous block.
  private var pending: Transition?

  /**
   * Ceiling on simultaneous snapshots.
   *
   * Each one is a full-screen layer the GPU composites every frame, so an
   * unbounded stack would eventually cost real time. Six is far past normal
   * interaction; beyond it the OLDEST is dropped, which is the least visible
   * choice — by then it is the furthest through its animation.
   */
  private static let maxOverlays = 6

  // MARK: - Spec

  func begin() throws -> Bool {
    // UIKit is main-thread only, and this must be SYNCHRONOUS: when `begin()`
    // returns, the screen has to already be covered, so no frame can render
    // between the capture and the caller's theme change.
    var didCapture = false
    onMainSync { didCapture = self.capture() }
    return didCapture
  }

  func commit(options: ThemeTransitionOptions) throws -> Promise<Void> {
    let promise = Promise<Void>()

    DispatchQueue.main.async { [weak self] in
      guard let self, let transition = self.pending else {
        // `begin()` never succeeded, or `abort()` already ran. The theme change
        // still happened — there is simply nothing to animate.
        promise.resolve(withResult: ())
        return
      }

      self.pending = nil

      // Hold for a few frames so the theme swap — committed on the JS thread and
      // mounted a frame or two later — has actually painted underneath.
      // Revealing early would animate down to the OLD colours.
      self.waitFrames(Int(options.settleFrames)) { [weak self] in
        guard let self, self.transitions.contains(where: { $0 === transition }) else {
          // Dropped by the overlay cap or by `dispose()` while we waited.
          promise.resolve(withResult: ())
          return
        }

        self.animate(transition, options: options) {
          promise.resolve(withResult: ())
        }
      }
    }

    return promise
  }

  func abort() throws {
    onMainSync {
      guard let transition = self.pending else { return }
      self.pending = nil
      self.remove(transition)
    }
  }

  /// Called if JS disposes the object mid-transition — never strand an overlay.
  func dispose() {
    onMainSync {
      self.pending = nil
      self.transitions.forEach { $0.stop() }
      self.transitions.removeAll()
    }
  }

  // MARK: - Capture

  /// Must run on the main thread.
  private func capture() -> Bool {
    // A previous `begin()` never reached its `commit()`. Don't leak it.
    if let stranded = pending {
      pending = nil
      remove(stranded)
    }

    guard
      let window = Self.keyWindow(),
      let content = window.rootViewController?.view
    else { return false }

    /*
     * `afterScreenUpdates: false` is deliberate.
     *
     * `true` forces a synchronous layout + render pass of the entire app on the
     * main thread before capturing — exactly the stall this design exists to
     * avoid. It is also unnecessary: the screen is already displaying the state
     * we want to preserve, so copying what the render server has is both correct
     * and nearly free.
     *
     * Capturing `content` rather than the window is what keeps concurrent
     * transitions correct — see the note at the top of this file.
     */
    guard let snapshot = content.snapshotView(afterScreenUpdates: false) else { return false }

    snapshot.frame = content.convert(content.bounds, to: window)
    snapshot.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    // Touches fall through to the live view underneath, which is already correct.
    snapshot.isUserInteractionEnabled = false

    // Newest goes BELOW every existing snapshot, directly above the live app.
    if let bottomMost = transitions.last {
      window.insertSubview(snapshot, belowSubview: bottomMost.view)
    } else {
      window.addSubview(snapshot)
    }

    let transition = Transition(view: snapshot)
    transitions.append(transition)
    pending = transition

    enforceOverlayCap()

    return true
  }

  private func enforceOverlayCap() {
    while transitions.count > Self.maxOverlays, let oldest = transitions.first {
      remove(oldest)
    }
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first { $0.isKeyWindow }
  }

  /// Drops a transition from the stack and the view hierarchy.
  private func remove(_ transition: Transition) {
    transitions.removeAll { $0 === transition }
    transition.stop()
  }

  // MARK: - Animation

  private func animate(
    _ transition: Transition,
    options: ThemeTransitionOptions,
    completion: @escaping () -> Void
  ) {
    let duration = max(0, options.durationMs / 1000)

    let finish: () -> Void = { [weak self] in
      self?.remove(transition)
      completion()
    }

    guard duration > 0 else {
      finish()
      return
    }

    switch options.kind {
    case .circularreveal:
      animateCircularReveal(
        transition, options: options, inverse: false, duration: duration, finish: finish)
    case .circularrevealinverse:
      animateCircularReveal(
        transition, options: options, inverse: true, duration: duration, finish: finish)
    case .fade:
      run(transition, duration: duration, finish: finish) { view in
        view.alpha = 0
      }
    case .slide:
      animateWipe(transition, direction: options.direction, duration: duration, finish: finish)
    case .blur:
      animateBlur(transition, duration: duration, finish: finish)
    }
  }

  /// Runs `animations` on the snapshot with the shared curve, retaining the
  /// animator on the transition so it survives and can be stopped.
  private func run(
    _ transition: Transition,
    duration: Double,
    finish: @escaping () -> Void,
    animations: @escaping (UIView) -> Void
  ) {
    let view = transition.view
    let animator = UIViewPropertyAnimator(
      duration: duration,
      controlPoint1: Curve.controlPoint1,
      controlPoint2: Curve.controlPoint2
    ) {
      animations(view)
    }

    // `position != .end` means it was stopped early by a teardown, which has
    // already removed the view — finishing again would double-resolve.
    animator.addCompletion { position in
      if position == .end { finish() }
    }

    transition.animator = animator
    animator.startAnimation()
  }

  /**
   * The zero-area rect the wipe collapses the old screen into.
   *
   * Collapsing toward an edge means the boundary sweeps in that direction and
   * the last surviving sliver of the old screen sits against it — so the old
   * screen "leaves through" that edge.
   */
  private static func wipeEndRect(
    for direction: ThemeTransitionDirection,
    in bounds: CGRect
  ) -> CGRect {
    switch direction {
    case .top: return CGRect(x: 0, y: 0, width: bounds.width, height: 0)
    case .bottom: return CGRect(x: 0, y: bounds.height, width: bounds.width, height: 0)
    case .left: return CGRect(x: 0, y: 0, width: 0, height: bounds.height)
    case .right: return CGRect(x: bounds.width, y: 0, width: 0, height: bounds.height)
    }
  }

  /**
   * Sweeps a straight edge across the screen, uncovering the new theme.
   *
   * Nothing translates — this is a MASK animation, so the old pixels stay
   * exactly where they are and simply stop being drawn as the boundary passes
   * over them. The new theme is already sitting underneath, so the effect reads
   * as a line painting the new colours across the screen.
   *
   * (Translating the snapshot instead would drag the whole UI sideways, which
   * looks like a page transition rather than a theme change.)
   */
  private func animateWipe(
    _ transition: Transition,
    direction: ThemeTransitionDirection,
    duration: Double,
    finish: @escaping () -> Void
  ) {
    let bounds = transition.view.bounds

    animateMask(
      transition,
      from: UIBezierPath(rect: bounds).cgPath,
      to: UIBezierPath(rect: Self.wipeEndRect(for: direction, in: bounds)).cgPath,
      duration: duration,
      finish: finish
    )
  }

  /**
   * Blurs the outgoing screen as it dissolves.
   *
   * A `UIVisualEffectView` over the snapshot: its backdrop is the snapshot
   * itself (opaque, directly beneath), so animating `effect` from `nil` to a
   * blur ramps the blur up on exactly that content. `UIViewPropertyAnimator` is
   * the only way to interpolate `effect` — it is not a plain animatable
   * property.
   *
   * The slight scale-up stops it reading as a flat cross-fade; the old screen
   * feels like it is receding rather than just vanishing.
   */
  private func animateBlur(
    _ transition: Transition,
    duration: Double,
    finish: @escaping () -> Void
  ) {
    let view = transition.view

    let effectView = UIVisualEffectView(effect: nil)
    effectView.frame = view.bounds
    effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    effectView.isUserInteractionEnabled = false
    view.addSubview(effectView)

    run(transition, duration: duration, finish: finish) { snapshot in
      // Adapts to light/dark, so the blur tints toward the incoming theme.
      effectView.effect = UIBlurEffect(style: .systemThinMaterial)
      snapshot.alpha = 0
      snapshot.transform = CGAffineTransform(scaleX: 1.04, y: 1.04)
    }
  }

  /**
   * The circle at `origin`, uncovering whatever sits beneath this snapshot.
   *
   *   inverse == false  the OLD screen shrinks INTO the circle — the new theme
   *                     arrives from the edges and closes in on the touch point.
   *   inverse == true   a HOLE opens at the circle and grows — the new theme
   *                     spreads outward from the touch point.
   *
   * Same shape, run the other way round, and they are each other's natural
   * counterpart: whichever one is used for light→dark, the other reads as
   * "undo" for dark→light.
   *
   * The inverse is the same mask with the fill rule flipped. Both paths are
   * `rect + circle` so they have identical subpath structure, which is what
   * lets Core Animation interpolate between them — a `CABasicAnimation` on
   * `path` produces garbage if the two paths differ in point count or order.
   * (The rect subpath is constant; only the circle moves.)
   */
  private func animateCircularReveal(
    _ transition: Transition,
    options: ThemeTransitionOptions,
    inverse: Bool,
    duration: Double,
    finish: @escaping () -> Void
  ) {
    let bounds = transition.view.bounds
    let origin: CGPoint = {
      guard options.originX >= 0, options.originY >= 0 else {
        return CGPoint(x: bounds.midX, y: bounds.midY)
      }
      return CGPoint(x: options.originX, y: options.originY)
    }()

    // Radius that still covers the farthest corner from the origin.
    let maxRadius = max(
      hypot(origin.x, origin.y),
      hypot(bounds.maxX - origin.x, origin.y),
      hypot(origin.x, bounds.maxY - origin.y),
      hypot(bounds.maxX - origin.x, bounds.maxY - origin.y)
    )

    let circle: (CGFloat) -> UIBezierPath = { radius in
      UIBezierPath(
        arcCenter: origin,
        // Never exactly zero: a degenerate arc has no drawable subpath, which
        // would change the path's structure and break the interpolation.
        radius: max(radius, 0.01),
        startAngle: 0,
        endAngle: .pi * 2,
        clockwise: true
      )
    }

    let path: (CGFloat) -> CGPath = { radius in
      guard inverse else { return circle(radius).cgPath }
      // Even-odd: covered by the rect but NOT the circle stays drawn, so the
      // circle punches a hole through the old screen.
      let path = UIBezierPath(rect: bounds)
      path.append(circle(radius))
      return path.cgPath
    }

    animateMask(
      transition,
      from: path(inverse ? 0 : maxRadius),
      to: path(inverse ? maxRadius : 0),
      fillRule: inverse ? .evenOdd : .nonZero,
      duration: duration,
      finish: finish
    )
  }

  /**
   * Animates a `CAShapeLayer` mask on the snapshot from one path to another.
   *
   * Shared by the circle and the wipe: both are "stop drawing the old screen in
   * this shape", they only differ in the shape. The mask goes on the SNAPSHOT,
   * never on the live view — masking the real tree would make RN's views
   * re-composite every frame, whereas the snapshot is a single flattened layer
   * the render server can mask essentially for free.
   */
  private func animateMask(
    _ transition: Transition,
    from startPath: CGPath,
    to endPath: CGPath,
    fillRule: CAShapeLayerFillRule = .nonZero,
    duration: Double,
    finish: @escaping () -> Void
  ) {
    let layer = transition.view.layer

    let mask = CAShapeLayer()
    mask.frame = transition.view.bounds
    mask.fillColor = UIColor.white.cgColor
    mask.fillRule = fillRule
    mask.path = startPath
    layer.mask = mask

    CATransaction.begin()
    CATransaction.setCompletionBlock { finish() }

    let animation = CABasicAnimation(keyPath: "path")
    animation.fromValue = startPath
    animation.toValue = endPath
    animation.duration = duration
    animation.timingFunction = Curve.media

    // Set the model value too, so the mask stays collapsed if the completion
    // block is delayed — otherwise the old screen would flash back for a frame.
    mask.path = endPath
    mask.add(animation, forKey: "themeTransitionReveal")

    CATransaction.commit()
  }

  // MARK: - Frame waiting

  /**
   * Runs `work` after `frames` display frames. Must be called on the main thread.
   *
   * The waiter needs no tracking here: `CADisplayLink` retains its target, so it
   * stays alive until it invalidates itself on fire. Several can be in flight at
   * once, one per concurrent transition, and each `work` closure re-checks that
   * its overlay is still in the stack before touching it.
   */
  private func waitFrames(_ frames: Int, work: @escaping () -> Void) {
    guard frames > 0 else {
      work()
      return
    }

    _ = FrameWaiter(frames: frames, work: work)
  }

  // MARK: - Threading

  /// Runs `block` on the main thread synchronously, without deadlocking when the
  /// caller is already on it.
  private func onMainSync(_ block: () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.sync(execute: block)
    }
  }
}

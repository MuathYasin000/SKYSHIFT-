// Presentation only: neither scientific pixels nor saved investigation state
// enter this controller. Loading and errors remain owned by the native viewer.
export function createRouteTransitions({
  motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)"),
  page = globalThis.document,
} = {}) {
  let sequence = 0,
    active = null,
    completed = 0,
    interrupted = 0;
  const animations = new Set();
  function clearAnimations() {
    for (const animation of animations) {
      try {
        animation.cancel();
      } catch {
        /* Animation support is optional. */
      }
    }
    animations.clear();
  }
  function cancel() {
    sequence++;
    if (active) interrupted++;
    active = null;
    clearAnimations();
  }
  async function fade(element, from, to, duration) {
    let animation;
    try {
      animation = element.animate([{ opacity: from }, { opacity: to }], {
        duration,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        fill: "both",
      });
      animations.add(animation);
      await animation.finished;
    } catch {
      /* Cancelled/unsupported animation must never block navigation. */
    }
    return animation;
  }
  async function run({
    outgoing,
    incoming,
    commit,
    isCurrent = () => true,
    animate = true,
  }) {
    // Preserve the currently displayed opacity when a fast second click arrives.
    let opacity = 1;
    try {
      opacity = Number(globalThis.getComputedStyle(outgoing).opacity);
    } catch {}
    cancel();
    const ticket = sequence;
    if (!isCurrent()) return false;
    const allowed = () =>
      animate &&
      !motion?.matches &&
      !page?.hidden &&
      typeof outgoing?.animate === "function" &&
      typeof incoming?.animate === "function";
    active = { phase: "exit" };
    let exit, entry;
    try {
      if (allowed()) exit = await fade(outgoing, opacity, 0, 110);
      if (ticket !== sequence || !isCurrent()) return false;
      active.phase = "enter";
      // Start the existing loader immediately. Fade its incoming surface while
      // it works, rather than holding visitors on a blank screen for a fetch.
      const update = Promise.resolve(commit());
      const entrance = allowed()
        ? fade(incoming, 0, 1, 240)
        : Promise.resolve();
      // The incoming effect now owns opacity, including same-surface navigation.
      exit?.cancel();
      animations.delete(exit);
      [entry] = await Promise.all([entrance, update]);
      if (ticket !== sequence || !isCurrent()) return false;
      completed++;
      return true;
    } finally {
      // A superseded job must not cancel its successor's animations.
      if (ticket === sequence) {
        clearAnimations();
        active = null;
      } else {
        exit?.cancel();
        entry?.cancel();
        animations.delete(exit);
        animations.delete(entry);
      }
    }
  }
  const onPreference = () => clearAnimations();
  motion?.addEventListener?.("change", onPreference);
  page?.addEventListener?.("visibilitychange", onPreference);
  return {
    run,
    cancel,
    diagnostics: () => ({
      active: Boolean(active),
      phase: active?.phase || "idle",
      reduced_motion: Boolean(motion?.matches),
      completed,
      interrupted,
    }),
    dispose() {
      cancel();
      motion?.removeEventListener?.("change", onPreference);
      page?.removeEventListener?.("visibilitychange", onPreference);
    },
  };
}

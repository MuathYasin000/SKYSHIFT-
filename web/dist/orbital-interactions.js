/* Navigation adapted from Vengeance UI Spotlight Navbar.
   Copyright (c) 2025-2026 Ashutoshx7, MIT; full notice in
   vendor/ui-patterns/Vengeance-LICENSE.txt. Ported from React/Motion to
   native DOM/CSS: keyboard equivalents, bounded pointer updates, no animation
   loop, no runtime package/network dependency. The hero movement is original. */
export function installOrbitalInteractions() {
  const nav = document.querySelector(".site-navigation"),
    hero = document.querySelector(".hero-observatory"),
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!nav || !hero) return;
  let frame = 0,
    updates = 0,
    pointer = null;
  function activePosition() {
    const active = nav.querySelector("[aria-current=page]");
    if (!active) {
      nav.style.setProperty("--ambience-x", "-100px");
      return;
    }
    const r = active.getBoundingClientRect(),
      n = nav.getBoundingClientRect(),
      x = r.left - n.left + r.width / 2;
    nav.style.setProperty("--ambience-x", x + "px");
    nav.style.setProperty("--spotlight-x", x + "px");
  }
  nav.addEventListener(
    "pointermove",
    (event) => {
      if (!fine.matches || reduce.matches) return;
      const r = nav.getBoundingClientRect();
      nav.style.setProperty("--spotlight-x", event.clientX - r.left + "px");
    },
    { passive: true },
  );
  nav.addEventListener("pointerleave", activePosition);
  nav.addEventListener("focusin", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const r = link.getBoundingClientRect(),
      n = nav.getBoundingClientRect();
    nav.style.setProperty(
      "--spotlight-x",
      r.left - n.left + r.width / 2 + "px",
    );
  });
  new MutationObserver(activePosition).observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current"],
  });
  const observer = new ResizeObserver(activePosition);
  observer.observe(nav);
  function resetHero() {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    hero.style.removeProperty("--craft-x");
    hero.style.removeProperty("--craft-y");
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!fine.matches || reduce.matches || document.hidden) return;
      const r = hero.getBoundingClientRect();
      pointer = {
        x: Math.max(
          -1,
          Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1),
        ),
        y: Math.max(
          -1,
          Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1),
        ),
      };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pointer || reduce.matches || document.hidden) return;
        hero.style.setProperty("--craft-x", (pointer.x * 7).toFixed(2) + "px");
        hero.style.setProperty("--craft-y", (pointer.y * 5).toFixed(2) + "px");
        updates++;
      });
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", resetHero);
  reduce.addEventListener("change", resetHero);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetHero();
  });
  activePosition();
  Object.defineProperty(window, "skyshiftOrbital", {
    value: Object.freeze({
      diagnostics: () => ({
        pointer_updates: updates,
        pending_frame: Boolean(frame),
        reduced_motion: reduce.matches,
        fine_pointer: fine.matches,
      }),
    }),
  });
}

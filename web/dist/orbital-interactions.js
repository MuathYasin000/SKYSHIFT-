/* Navigation adapted from Vengeance UI Spotlight Navbar.
   Copyright (c) 2025-2026 Ashutoshx7, MIT; full notice in
   vendor/ui-patterns/Vengeance-LICENSE.txt. Ported from React/Motion to
   native DOM/CSS: keyboard equivalents, bounded pointer updates, no animation
   loop, no runtime package/network dependency. */
export function installOrbitalInteractions() {
  const nav = document.querySelector(".site-navigation"),
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!nav) return;
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
  activePosition();
  Object.defineProperty(window, "skyshiftOrbital", {
    value: Object.freeze({
      diagnostics: () => ({
        reduced_motion: reduce.matches,
        fine_pointer: fine.matches,
      }),
    }),
  });
}

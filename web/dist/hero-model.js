// Reuses the actual SPHEREx model/viewer. Graphics never gate scientific code.
export function installHeroModel() {
  const $ = (id) => document.getElementById(id),
    container = document.querySelector(".hero-observatory"),
    controls = container?.querySelector(".hero-model-controls"),
    components = {
      shields: "Photon shields",
      radiators: "V-groove radiators",
      telescope: "Telescope aperture",
      panel: "Fixed solar panel",
      bus: "Spacecraft bus",
    };
  if(!container)return;
  let model = null,
    starting = false,
    intersecting = false,
    failed = false,
    factory = null;
  function visible() {
    const route = (location.hash.slice(1) ||
      new URLSearchParams(location.search).get("view") || "home").split("/")[0];
    return (
      (intersecting || Boolean(document.documentElement.dataset.arrival)) &&
      !document.hidden &&
      document.body?.dataset.surface === "home" &&
      !["observations", "compare", "classic", "universe", "investigation", "sequence-example", "target-example", "imported-investigation"].includes(route)
    );
  }
  function waiting() {
    container.dataset.modelState = "waiting";
    if ($("hero-readiness")) $("hero-readiness").textContent = "LOCAL VIEW STANDBY";
    $("hero-model-message").hidden = false;
    $("hero-model-message").textContent = "3D starts when this section is visible.";
  }
  function fail(message) {
    failed = true;
    model?.dispose();
    model = null;
    container.dataset.modelState = "failed";
    if ($("hero-readiness"))
      $("hero-readiness").textContent = "3D UNAVAILABLE · SCIENCE AVAILABLE";
    $("hero-model-message").hidden = false;
    $("hero-model-message").textContent =
      "3D is unavailable. Your observations still work.";
    $("hero-model-message").title = String(message);
    $("hero-model-retry").hidden = false;
    controls.hidden = true;
    window.dispatchEvent(new Event('skyshift:hero-failed'));
  }
  async function start() {
    if (starting || model || !visible()) return;
    starting = true;
    container.dataset.modelState = "loading";
    $("hero-model-retry").hidden = true;
    $("hero-model-message").hidden = false;
    $("hero-model-message").textContent = "Loading the SPHEREx model…";
    try {
      if (!factory) {
        let timeout;
        try {
          const module = await Promise.race([
            import("./mission-model.js"),
            new Promise((_, reject) => {
              timeout = setTimeout(() => reject(Error("The 3D model files took too long to load. Retry the model.")), 12000);
            }),
          ]);
          factory = module.createMissionModel;
        } finally { clearTimeout(timeout); }
      }
      if (!visible()) { waiting(); return; }
      if (failed) {
        const old = $("hero-model-canvas");
        old.replaceWith(old.cloneNode(false));
        failed = false;
      }
      model = factory($("hero-model-canvas"), {
        presentation: "hero",
        onError: fail,
        onFirstFrame: () => {
          container.dataset.modelState = "ready";
          if ($("hero-readiness")) $("hero-readiness").textContent = "LOCAL VIEW READY";
          $("hero-model-message").hidden = true;
          controls.hidden = false;
          window.dispatchEvent(new Event('skyshift:hero-frame'));
        },
        onComponent: (key) => {
          model?.focusComponent(key);
          $("hero-model-description").textContent =
            (components[key] || "SPHEREx") + " · AI-generated illustrative geometry";
        },
      });
      model.setVisible(visible());
    } catch (e) {
      fail(e.message);
    } finally {
      starting = false;
      if (!model && !failed && visible()) sync();
    }
  }
  function sync() {
    model?.setVisible(visible());
    if (visible() && !model && !failed) start();
  }
  waiting();
  new IntersectionObserver(
    (entries) => {
      intersecting = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.08 },
  ).observe(container);
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-surface"],
  });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("hashchange", sync);
  window.addEventListener('skyshift:arrival-start',sync);
  window.addEventListener('skyshift:arrival-end',sync);
  $("hero-model-retry").onclick = () => {
    if (factory) start();
    else location.reload();
  };
  $("hero-model-reset").onclick = () => {
    model?.reset();
    $("hero-model-description").textContent =
      "AI-generated geometry · Illustrative 3D spacecraft model";
  };
  $("hero-model-zoom-in").onclick = () => model?.zoom(0.85);
  $("hero-model-zoom-out").onclick = () => model?.zoom(1.18);
  Object.defineProperty(window, "skyshiftHero", {
    value: Object.freeze({
      arrivalOrbit: (duration) => model?.playArrivalOrbit(duration),
      diagnostics: () => ({
        state: container.dataset.modelState || "waiting",
        visible: visible(),
        model: model?.diagnostics() || null,
      }),
    }),
  });
}

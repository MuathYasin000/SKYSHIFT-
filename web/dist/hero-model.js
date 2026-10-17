// Reuses the actual SPHEREx model/viewer. Graphics never gate scientific code.
export function installHeroModel() {
  const $ = (id) => document.getElementById(id),
    container = document.querySelector(".hero-observatory"),
    controls = container.querySelector(".hero-model-controls"),
    components = {
      shields: "Photon shields",
      radiators: "V-groove radiators",
      telescope: "Telescope aperture",
      panel: "Fixed solar panel",
      bus: "Spacecraft bus",
    };
  let model = null,
    starting = false,
    intersecting = false,
    failed = false,
    factory = null;
  function visible() {
    return (
      intersecting &&
      !document.hidden &&
      document.body.dataset.surface === "home"
    );
  }
  function fail(message) {
    failed = true;
    model?.dispose();
    model = null;
    container.dataset.modelState = "failed";
    $("hero-model-message").hidden = false;
    $("hero-model-message").textContent =
      "3D is unavailable. Your observations still work.";
    $("hero-model-message").title = String(message);
    $("hero-model-retry").hidden = false;
    controls.hidden = true;
  }
  async function start() {
    if (starting || model || !visible()) return;
    starting = true;
    container.dataset.modelState = "loading";
    $("hero-model-retry").hidden = true;
    $("hero-model-message").hidden = false;
    $("hero-model-message").textContent = "Loading the SPHEREx model…";
    try {
      factory ||= (await import("./mission-model.js")).createMissionModel;
      if (!visible()) return;
      if (failed) {
        const old = $("hero-model-canvas");
        old.replaceWith(old.cloneNode(false));
        failed = false;
      }
      model = factory($("hero-model-canvas"), {
        presentation: "hero",
        onError: fail,
        onComponent: (key) => {
          model?.focusComponent(key);
          $("hero-model-description").textContent =
            (components[key] || "SPHEREx") + " · Illustrative model";
        },
      });
      model.setVisible(visible());
      container.dataset.modelState = "ready";
      $("hero-model-message").hidden = true;
      controls.hidden = false;
    } catch (e) {
      fail(e.message);
    } finally {
      starting = false;
    }
  }
  function sync() {
    model?.setVisible(visible());
    if (visible() && !model && !failed) start();
  }
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
  $("hero-model-retry").onclick = () => {
    if (factory) start();
    else location.reload();
  };
  $("hero-model-reset").onclick = () => {
    model?.reset();
    $("hero-model-description").textContent =
      "Interactive 3D · Illustrative spacecraft model";
  };
  $("hero-model-zoom-in").onclick = () => model?.zoom(0.85);
  $("hero-model-zoom-out").onclick = () => model?.zoom(1.18);
  Object.defineProperty(window, "skyshiftHero", {
    value: Object.freeze({
      diagnostics: () => ({
        state: container.dataset.modelState || "waiting",
        visible: visible(),
        model: model?.diagnostics() || null,
      }),
    }),
  });
}

document.body.dataset.controller = "starting";
try {
  await import("./website.js");
  document.body.dataset.controller = "ready";
  // Automatic hero graphics are independent of scientific startup and recovery.
  import("./hero-model.js")
    .then(({ installHeroModel }) => installHeroModel())
    .catch(() => {
      document.getElementById("hero-model-message").textContent =
        "3D could not load. Observations and comparison remain available.";
      const retry = document.getElementById("hero-model-retry");
      retry.hidden = false;
      retry.onclick = () => location.reload();
    });
  // Cosmetic enhancements never gate scientific loading or file recovery.
  import("./orbital-interactions.js")
    .then(({ installOrbitalInteractions }) => installOrbitalInteractions())
    .catch((error) =>
      console.warn("Optional interface details unavailable:", error),
    );
  import("./infrared-experience.js")
    .then(({ installInfraredExperience }) => installInfraredExperience())
    .catch((error) =>
      console.warn("Optional infrared presentation unavailable:", error),
    );
} catch (error) {
  document.body.dataset.controller = "failed";
  const box = document.getElementById("site-error");
  box.hidden = false;
  box.textContent =
    "The main interface could not load. Reload, or use the independent scientific tools below. ";
  for (const [text, href] of [
    ["Open observations", "./explore.html"],
    ["Open comparison", "./compare.html"],
  ]) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    box.append(a);
  }
  console.error("SKYSHIFT website startup:", error);
}

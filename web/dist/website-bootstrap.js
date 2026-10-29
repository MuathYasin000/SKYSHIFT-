import("./site-chrome.js").catch(e=>console.warn("Shared navigation enhancement unavailable:",e));
document.body.dataset.controller = "starting";
// Routes own their scroll targets. Browser restoration can otherwise reopen
// the root homepage midway down before/after the asynchronous controller loads.
history.scrollRestoration = "manual";
if (["", "#home"].includes(location.hash) &&
    !new URLSearchParams(location.search).has("view")) {
  window.scrollTo({top: 0, left: 0, behavior: "instant"});
}
  // Automatic hero graphics are independent of scientific startup and recovery.
  import("./hero-model.js")
    .then(({ installHeroModel }) => installHeroModel())
    .catch(() => {
      document.getElementById("hero-model-message").textContent =
        "3D could not load. Observations and comparison remain available.";
      const retry = document.getElementById("hero-model-retry");
      retry.hidden = false;
      retry.onclick = () => location.reload();
      window.dispatchEvent(new Event('skyshift:hero-import-failed'));
    });

try {
  await import("./website.js");
  document.body.dataset.controller = "ready";
  // Cosmetic enhancements never gate scientific loading or file recovery.
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


import("./mission-interactions.js").then(m=>m.installMissionInteractions()).catch(e=>console.warn("Optional presentation unavailable:",e));

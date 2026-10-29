import { readPreferences, savePreferences } from "./space-preferences.js";

// Optional chrome only: failure never prevents opening scientific observations.
export function installMissionInteractions() {
  let effectsEnabled = readPreferences().effects;
  document.addEventListener("skyshift:effects", (e) => {
    effectsEnabled = Boolean(e.detail);
  });
  let keyboardMode = false;
  document.addEventListener(
    "keydown",
    () => {
      keyboardMode = true;
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    () => {
      keyboardMode = false;
    },
    true,
  );
  const body = document.body,
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(pointer:fine)"),
    cursor = document.createElement("div");
  cursor.className = "observatory-cursor";
  cursor.setAttribute("aria-hidden", "true");
  body.append(cursor);
  document.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "k" &&
      body.dataset.surface === "home"
    ) {
      e.preventDefault();
      document.getElementById("home-field-search").focus();
      return;
    }
    if (
      e.key.toLowerCase() === "l" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.target.closest(
        "input,textarea,select,[contenteditable],dialog,#space-workspace",
      )
    )
      document.getElementById("vision-effects").click();
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      const active =
        fine.matches &&
        !reduce.matches &&
        !body.classList.contains("reduced-effects") &&
        body.dataset.surface === "home" &&
        !e.target.closest("input,textarea,dialog,canvas,a,button,summary");
      cursor.classList.toggle("active", active);
      if (active)
        cursor.style.transform = `translate3d(${e.clientX - 13}px,${e.clientY - 13}px,0)`;
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () =>
    cursor.classList.remove("active"),
  );
  document.querySelector(".observatory-hero").addEventListener(
    "pointermove",
    (e) => {
      if (reduce.matches || body.classList.contains("reduced-effects")) return;
      const r = e.currentTarget.getBoundingClientRect();
      document.getElementById("hero-cursor-position").textContent =
        `DISPLAY POSITION / x ${Math.round(e.clientX - r.left)} · y ${Math.round(e.clientY - r.top)} px`;
    },
    { passive: true },
  );
  const chips = [...document.querySelectorAll("[data-website-component]")],
    modelPanel = document.querySelector(".mission-model");
  chips.forEach((chip, i) => {
    const b = document.createElement("button");
    b.className = "model-hotspot";
    b.dataset.modelHotspot = chip.dataset.websiteComponent;
    const number = document.createElement("span");
    number.textContent = String(i + 1).padStart(2, "0");
    b.append(number);
    const leader = document.createElement("i");
    leader.className = "hotspot-leader";
    leader.setAttribute("aria-hidden", "true");
    const callout = document.createElement("span");
    callout.className = "hotspot-callout";
    callout.textContent = chip.textContent;
    b.append(leader, callout);
    b.hidden = true;
    b.title = chip.textContent;
    b.setAttribute("aria-label", "Inspect " + chip.textContent);
    b.onclick = () => chip.click();
    modelPanel.append(b);
  });
  let manualUntil = 0,
    lastComponent = -1,
    walkFrame = 0;
  modelPanel.addEventListener(
    "pointerdown",
    () => (manualUntil = performance.now() + 2000),
  );
  document
    .getElementById("website-components")
    .addEventListener(
      "pointerdown",
      () => (manualUntil = performance.now() + 2000),
    );
  addEventListener(
    "scroll",
    () => {
      if (
        walkFrame ||
        body.dataset.surface !== "home" ||
        reduce.matches ||
        !effectsEnabled
      )
        return;
      walkFrame = requestAnimationFrame(() => {
        walkFrame = 0;
        const section = document.getElementById("mission-section");
        if (
          !section.classList.contains("walkthrough-enabled") ||
          performance.now() < manualUntil ||
          (keyboardMode && section.contains(document.activeElement))
        )
          return;
        const r = section.getBoundingClientRect(),
          progress = (innerHeight * 0.45 - r.top) / r.height;
        if (progress < 0 || progress > 1) return;
        const index = Math.min(
          chips.length - 1,
          Math.floor(progress * chips.length),
        );
        if (index !== lastComponent) {
          lastComponent = index;
          chips[index]?.click();
        }
      });
    },
    { passive: true },
  );
  const dot = document.createElement("i");
  dot.className = "portal-orbit-dot";
  dot.setAttribute("aria-hidden", "true");
  document.querySelector(".universe-entry").append(dot);
  document.querySelector(".universe-entry a").addEventListener("click", () => {
    if (reduce.matches || !effectsEnabled) return;
    const home = document.getElementById("home-view");
    home.classList.add("portal-opening");
    setTimeout(() => home.classList.remove("portal-opening"), 600);
  });
  if (reduce.matches || !effectsEnabled)
    document.body.classList.add("intro-complete");
  else setTimeout(() => document.body.classList.add("intro-complete"), 1000);
}

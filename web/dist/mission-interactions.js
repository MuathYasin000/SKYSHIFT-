import { readPreferences, savePreferences } from "./space-preferences.js";
import { CHANNEL_COUNT, channelColor } from "./infrared-layout.js";

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
  document.querySelector(".orbital-hero").addEventListener(
    "pointermove",
    (e) => {
      if (reduce.matches || body.classList.contains("reduced-effects")) return;
      const r = e.currentTarget.getBoundingClientRect();
      document.getElementById("hero-cursor-position").textContent =
        `DISPLAY POSITION / x ${Math.round(e.clientX - r.left)} · y ${Math.round(e.clientY - r.top)} px`;
    },
    { passive: true },
  );
  try {
    if (
      !sessionStorage.getItem("skyshift.observatory.boot") &&
      body.dataset.surface === "home" &&
      !reduce.matches
    ) {
      sessionStorage.setItem("skyshift.observatory.boot", "1");
      const boot = document.createElement("aside");
      boot.className = "boot-readout";
      boot.setAttribute("aria-label", "Interface preparation");
      boot.innerHTML =
        "<p>PREPARING YOUR INFRARED EXPLORER</p><div data-spectrum></div><button>Skip intro</button>";
      body.append(boot);
      for (let i = 0; i < CHANNEL_COUNT; i++) {
        const bar = document.createElement("i");
        bar.style.setProperty("--channel-color", channelColor(i));
        boot.querySelector("[data-spectrum]").append(bar);
      }
      boot.querySelector("button").onclick = () => boot.remove();
      setTimeout(() => boot.remove(), 1100);
    }
  } catch {
    /* Private mode must not prevent exploration. */
  }
  const chips = [...document.querySelectorAll("[data-website-component]")],
    modelPanel = document.querySelector(".mission-model");
  chips.forEach((chip, i) => {
    const b = document.createElement("button");
    b.className = "model-hotspot";
    b.dataset.modelHotspot = chip.dataset.websiteComponent;
    b.textContent = String(i + 1).padStart(2, "0");
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
  const principlePaths = [
    '<path d="M5 3h14l6 6v20H5zM19 3v7h6M10 16h10M10 21h7"/>',
    '<rect x="3" y="6" width="26" height="20"/><path d="M16 6v20M12 16h8"/>',
    '<path d="M7 3h18v26H7zM11 10h10M11 15h10M11 20h6"/><circle cx="23" cy="24" r="5"/>',
  ];
  document.querySelectorAll(".trust-section article").forEach((article, i) => {
    const n = document.createElement("b");
    n.className = "principle-number";
    n.textContent = String(i + 1).padStart(2, "0");
    n.setAttribute("aria-hidden", "true");
    const icon = document.createElement("span");
    icon.className = "principle-icon";
    icon.innerHTML =
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' +
      principlePaths[i] +
      "</svg>";
    article.prepend(n, icon);
  });
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

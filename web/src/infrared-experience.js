import { readPreferences, savePreferences } from "./space-preferences.js";
import { CHANNEL_COUNT, channelColor, representativeChannelColor } from "./infrared-layout.js";

// Optional UI presentation; imported only after the scientific controller boots.
export function installInfraredExperience() {
  const $ = (id) => document.getElementById(id),
    body = document.body,
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)"),
    hero = document.querySelector(".observatory-hero"),
    lens = $("infrared-lens"),
    model = lens.parentElement,
    lensToggle = $("vision-effects");
  let enabled = readPreferences().effects,
    pointerFrame = 0,
    scrollFrame = 0,
    smoothFrame = 0,
    lenis = null,
    triggers = [],
    tweens = [],
    libs = null,
    generation = 0,
    lensUpdates = 0,
    pointer,
    visibleHero = true;
  for (const strip of document.querySelectorAll("[data-spectrum]")) {
    strip.setAttribute("aria-hidden", "true");
    const fragment = document.createDocumentFragment();
    const readout = strip.closest(".hero-spectrum")?.querySelector("[data-spectrum-readout]");
    for (let i = 0; i < CHANNEL_COUNT; i++) {
      const bar = document.createElement("i");
      bar.style.setProperty("--channel-color", readout ? representativeChannelColor(i) : channelColor(i));
      if (readout) bar.dataset.spectrumChannel = String(i + 1);
      fragment.append(bar);
    }
    strip.replaceChildren(fragment);
    if (readout) {
      const hint = readout.textContent;
      strip.addEventListener("pointerover", (event) => {
        if (!fine.matches || event.pointerType === "touch") return;
        const bar = event.target.closest("i[data-spectrum-channel]");
        if (!bar || bar.parentElement !== strip) return;
        readout.textContent = `Channel ${bar.dataset.spectrumChannel} / ${CHANNEL_COUNT}`;
        readout.style.setProperty('--hover-channel-color',bar.style.getPropertyValue('--channel-color'));
        readout.dataset.active = "true";
      });
      strip.addEventListener("pointerleave", () => {
        readout.textContent = hint;
        readout.style.removeProperty('--hover-channel-color');
        delete readout.dataset.active;
      });
    }
  }
  function home() {
    return body.dataset.surface === "home";
  }
  function effects() {
    return enabled && !reduce.matches && !document.hidden && home();
  }
  function hideLens() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    lens.classList.remove("active");
  }

  function updatePointer() {
    pointerFrame = 0;
    if (!effects()) return;
    const { x, y, target, buttons } = pointer;
    hero.style.setProperty("--depth-x", (x / innerWidth - 0.5) * 10 + "px");
    hero.style.setProperty("--depth-y", (y / innerHeight - 0.5) * 7 + "px");
    if (
      target.id !== "hero-model-canvas" ||
      !model.contains(target) ||
      model.dataset.modelState !== "ready" ||
      buttons ||
      document.documentElement.hasAttribute("data-arrival")
    ) {
      hideLens();
      return;
    }
    const bounds = lens.getBoundingClientRect();
    if (x < bounds.left || x >= bounds.right || y < bounds.top || y >= bounds.bottom) {
      hideLens();
      return;
    }
    lens.style.setProperty("--lens-x", `${x - bounds.left}px`);
    lens.style.setProperty("--lens-y", `${y - bounds.top}px`);
    lens.classList.add("active");
    lensUpdates++;
  }
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        !effects() ||
        !fine.matches ||
        event.pointerType === "touch" ||
        !hero.contains(event.target)
      ) {
        hideLens();
        return;
      }
      pointer = { x: event.clientX, y: event.clientY, target: event.target, buttons: event.buttons };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(updatePointer);
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      if (event.target.id === "hero-model-canvas") hideLens();
    },
    { passive: true },
  );
  document.addEventListener("pointerdown", hideLens, { passive: true });
  document.addEventListener("pointercancel", hideLens);
  window.addEventListener("blur", hideLens);
  document.addEventListener("focusin", hideLens);
  const vela = document.querySelector(".intro-image");
  let revealStep = null;
  function reveal(value, interactive = false) {
    const n = Math.max(0, Math.min(100, Number(value)));
    vela.style.setProperty("--vela-reveal", n + "%");
    $("vela-reveal").value = n;
    $("vela-reveal-value").value = Math.round(n) + "%";
    // One soft detent per 2%; the shared sound service also limits bursts.
    // Initial rendering and scripted updates never create sound.
    const step = Math.floor(n / 2);
    if (interactive && revealStep !== null && step !== revealStep)
      document.dispatchEvent(new CustomEvent('skyshift-sound', {detail:'swipe_tick'}));
    revealStep = step;
  }
  $("vela-reveal").addEventListener("input", (e) => reveal(e.target.value, e.isTrusted));
  let dragging = false;
  const divider = vela.querySelector(".vela-divider");
  divider.addEventListener("pointerdown", (e) => {
    dragging = true;
    divider.setPointerCapture(e.pointerId);
  });
  divider.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const r = vela.getBoundingClientRect();
    reveal(100 - ((e.clientX - r.left) / r.width) * 100, e.isTrusted);
  });
  divider.addEventListener("pointerup", () => (dragging = false));
  divider.addEventListener("lostpointercapture", () => (dragging = false));
  reveal(55);
  const rail = document.createElement("nav");
  rail.className = "story-rail";
  rail.setAttribute("aria-label", "Observation journey");
  for (const [id, text] of [
    ["fields-heading", "01 / Observe"],
    ["infrared-story-heading", "02 / Compare light"],
    ["mission-heading", "03 / Investigate"],
  ]) {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = () =>
      $(id).scrollIntoView({
        behavior: effects() ? "smooth" : "instant",
        block: "start",
      });
    b.dataset.chapter = id;
    rail.append(b);
  }
  document.querySelector(".field-section").before(rail);
  function progress() {
    scrollFrame = 0;
    if (!home()) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    document
      .querySelector(".reading-spectrum")
      .style.setProperty("--read", max > 0 ? Math.min(1, scrollY / max) : 0);
    hideLens();
  }
  addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(progress);
    },
    { passive: true },
  );
  addEventListener("resize", progress, { passive: true });
  const chapterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting)
          rail.querySelectorAll("button").forEach((b) => {
            const active = b.dataset.chapter === entry.target.id;
            if (active) b.setAttribute("aria-current", "step");
            else b.removeAttribute("aria-current");
          });
    },
    { rootMargin: "-15% 0px -55%" },
  );
  for (const id of [
    "fields-heading",
    "infrared-story-heading",
    "mission-heading",
  ])
    chapterObserver.observe($(id));
  new IntersectionObserver((entries) => {
    visibleHero = entries[0].isIntersecting;
    hero.classList.toggle("hero-offscreen", !visibleHero);
    if (!visibleHero) hideLens();
  }).observe(hero);

  async function libraries() {
    if (!libs) libs = import("./vendor/scroll/lenis.mjs").then(({default: Lenis})=>({Lenis})).catch(error=>{libs=null;throw error;});
    return libs;
  }
  function cleanup() {
    lenis?.destroy();
    lenis = null;
    cancelAnimationFrame(smoothFrame);
    smoothFrame = 0;
    for (const trigger of triggers) trigger.kill();
    triggers = [];
    for (const tween of tweens) tween.kill();
    tweens = [];
    document
      .querySelectorAll("[data-count]")
      .forEach((e) => (e.textContent = e.dataset.count));
  }
  async function animateStory(ticket) {
    try {
      const { Lenis } = await libraries();
      if (ticket !== generation || !effects()) return;
      // Native touch/keyboard scroll. Smooth only fine-pointer homepage wheels.
      if (fine.matches) {
        lenis = new Lenis({
          autoRaf: false,
          smoothWheel: true,
          duration: 0.7,
          prevent: (n) =>
            Boolean(
              n.closest(
                "dialog, canvas, input, textarea, select, [data-lenis-prevent]",
              ),
            ),
          virtualScroll: () =>
            effects() && !document.querySelector("dialog[open]"),
        });

      }
      // Native observers replace the restricted GSAP/ScrollTrigger dependency.
      const chapters = new IntersectionObserver(entries => {
        if (ticket !== generation || !effects()) return;
        for (const entry of entries) entry.target.classList.toggle("chapter-in-view", entry.isIntersecting);
      }, {rootMargin: "0px 0px -20% 0px"});
      document.querySelectorAll(".field-section,.infrared-story,.mission-section,.trust-section").forEach(el=>chapters.observe(el));
      triggers.push({kill:()=>chapters.disconnect()});
      const counters = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || ticket !== generation || !effects()) continue;
          const el=entry.target, target=Number(el.dataset.count), start=performance.now();
          counters.unobserve(el);
          let frame=0;
          const tick=now=>{
            if(ticket!==generation || !effects()) return;
            const t=Math.min(1,(now-start)/1200);
            el.textContent=String(Math.round(target*(1-Math.pow(1-t,3))));
            if(t<1) frame=requestAnimationFrame(tick); else el.textContent=el.dataset.count;
          };
          frame=requestAnimationFrame(tick);
          tweens.push({kill:()=>cancelAnimationFrame(frame)});
        }
      }, {rootMargin:"0px 0px 5% 0px"});
      document.querySelectorAll("[data-count]").forEach(el=>counters.observe(el));
      triggers.push({kill:()=>counters.disconnect()});
    } catch (e) {
      console.warn(
        e.message + "; native scrolling and all content remain available.",
      );
    }
  }
  function smoothTick(time) {
    smoothFrame = 0;
    if (!lenis || !effects()) return;
    lenis.raf(time);
    if (lenis.isScrolling) smoothFrame = requestAnimationFrame(smoothTick);
  }
  addEventListener(
    "wheel",
    () => {
      if (lenis && !smoothFrame && effects())
        smoothFrame = requestAnimationFrame(smoothTick);
    },
    { passive: true },
  );
  function sync() {
    const ticket = ++generation;
    hideLens();
    cleanup();
    body.classList.toggle("infrared-effects", enabled && !reduce.matches);
    body.classList.toggle("effects-paused", !effects());
    lensToggle.setAttribute("aria-pressed", String(enabled));
    $("lens-state").textContent = enabled ? "On" : "Off";
    if (effects()) animateStory(ticket);
    progress();
  }
  lensToggle.onclick = () => {
    enabled = !enabled;
    const p = readPreferences();
    p.effects = enabled;
    savePreferences(p);
    document.dispatchEvent(
      new CustomEvent("skyshift:effects", { detail: enabled }),
    );
  };
  document.addEventListener("skyshift:effects", (e) => {
    enabled = Boolean(e.detail);
    sync();
  });
  new MutationObserver(sync).observe(body, {
    attributes: true,
    attributeFilter: ["data-surface"],
  });
  document.addEventListener("visibilitychange", sync);
  reduce.addEventListener("change", sync);
  fine.addEventListener("change", sync);
  window.skyshiftInfrared = Object.freeze({
    diagnostics: () => ({
      enabled,
      reduced_motion: reduce.matches,
      lens_active: effects() && fine.matches && lens.classList.contains("active"),
      lens_updates: lensUpdates,
      smooth_scroll: Boolean(lenis),
      smooth_frame_pending: Boolean(smoothFrame),
      hero_visible: visibleHero,
      spectrum_channels: CHANNEL_COUNT,
      scroll_triggers: triggers.length,
    }),
  });
  sync();
}

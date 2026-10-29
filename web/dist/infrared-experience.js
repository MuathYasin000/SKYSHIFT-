import { readPreferences, savePreferences } from "./space-preferences.js";
import { CHANNEL_COUNT, channelColor, representativeChannelColor } from "./infrared-layout.js";

// Optional UI presentation; imported only after the scientific controller boots.
export function installInfraredExperience() {
  const $ = (id) => document.getElementById(id),
    body = document.body,
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)"),
    hero = document.querySelector(".observatory-hero"),
    lens = $("infrared-lens");
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
    pointer = null,
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
    lens.classList.remove("active");
    hero.classList.remove("lens-active");
  }
  function resetPointer() {
    hideLens();
    document.querySelectorAll(".field-card").forEach((c) => {
      c.style.removeProperty("--tilt-x");
      c.style.removeProperty("--tilt-y");
    });
    document
      .querySelectorAll(".primary-link")
      .forEach((b) => b.style.removeProperty("translate"));
  }
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        !effects() ||
        !fine.matches ||
        event.pointerType === "touch" ||
        event.target.closest("dialog, #space-workspace")
      )
        return;
      pointer = { x: event.clientX, y: event.clientY, target: event.target };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!effects()) return;
        const { x, y, target } = pointer;
        // Keep the real pointer, text and scientific canvases unobscured.
        lens.style.transform = `translate3d(${x - 116}px,${y - 116}px,0)`;
        lens.classList.add("active");
        lensUpdates++;
        const r = hero.getBoundingClientRect(),
          inside = y >= r.top && y <= r.bottom;
        hero.classList.toggle("lens-active", inside);
        if (inside) {
          hero.style.setProperty("--lens-x", x - r.left + "px");
          hero.style.setProperty("--lens-y", y - r.top + "px");
          const panel = hero
            .querySelector(".hero-observatory")
            .getBoundingClientRect();
          hero.style.setProperty("--lens-panel-x", x - panel.left + "px");
          hero.style.setProperty("--lens-panel-y", y - panel.top - 48 + "px");
          hero.style.setProperty(
            "--depth-x",
            (x / innerWidth - 0.5) * 10 + "px",
          );
          hero.style.setProperty(
            "--depth-y",
            (y / innerHeight - 0.5) * 7 + "px",
          );
          const ghost = hero
            .querySelector(".observatory-lettering")
            .getBoundingClientRect();
          hero.style.setProperty("--ghost-x", x - ghost.left + "px");
          hero.style.setProperty("--ghost-y", y - ghost.top + "px");
        }
        const card = target.closest(".field-card");
        if (card) {
          const c = card.getBoundingClientRect(),
            image = card.querySelector(".field-image").getBoundingClientRect();
          card.style.setProperty("--reveal-x", x - image.left + "px");
          card.style.setProperty("--reveal-y", y - image.top + "px");
          // Actual curated field coordinates, never cursor-generated RA/Dec.
          $("hero-field-coordinates").textContent =
            card.querySelector(".field-coordinates").textContent +
            " · field centre";
          lens.querySelector("span").textContent =
            "IR LENS / CURATED FIELD CENTRE / " +
            card.querySelector(".field-coordinates").textContent +
            " / Not spacecraft pointing";
        }
      });
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      const card = e.target.closest?.(".field-card");
      if (card && !card.contains(e.relatedTarget)) {
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      }
      const b = e.target.closest?.(".primary-link");
      if (b && !b.contains(e.relatedTarget))
        b.style.removeProperty("translate");
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", hideLens);
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
    resetPointer();
    cleanup();
    body.classList.toggle("infrared-effects", enabled && !reduce.matches);
    body.classList.toggle("effects-paused", !effects());
    $("vision-effects").setAttribute("aria-pressed", String(enabled));
    $("vision-effects").textContent = enabled
      ? reduce.matches
        ? "◉ Lens off · reduced motion"
        : "◉ Infrared lens on"
      : "◉ Infrared lens off";
    if (effects()) animateStory(ticket);
    progress();
  }
  $("vision-effects").onclick = () => {
    enabled = !enabled;
    const p = readPreferences();
    p.effects = enabled;
    savePreferences(p);
    document.dispatchEvent(
      new CustomEvent("skyshift:effects", { detail: enabled }),
    );
    sync();
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
      lens_active: lens.classList.contains("active"),
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

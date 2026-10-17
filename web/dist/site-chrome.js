import { readPreferences, savePreferences } from "./space-preferences.js";
import {pageName,isPlainLinkClick,navigationRoute} from './navigation-links.js';
let installed = false;
export function installSiteChrome() {
  if (installed) return;
  installed = true;
  const $ = (id) => document.getElementById(id),
    header = $("site-header"),
    nav = $("site-nav"),
    menu = $("resources-menu"),
    more = $("site-more"),
    toggle = $("site-menu-toggle");
  if (!header) return;
  document.querySelectorAll(".status-pending,.review-tag").forEach(e=>{e.title="What does pending mean? Engineering checks are documented; qualified scientific approval has not been completed.";});
  const effects = document.createElement("button");
  effects.id = "reduce-effects";
  effects.className = "reduce-effects";
  menu.append(effects);
  function effectState(enabled) {
    document.body.classList.toggle("reduced-effects", !enabled);
    effects.textContent = enabled ? "Reduce effects" : "Restore effects";
    effects.setAttribute("aria-pressed", String(!enabled));
  }
  effectState(readPreferences().effects);
  effects.onclick = () => {
    const p = readPreferences();
    p.effects = !document.body.classList.contains("reduced-effects")
      ? false
      : true;
    savePreferences(p);
    document.dispatchEvent(
      new CustomEvent("skyshift:effects", { detail: p.effects }),
    );
  };
  document.addEventListener("skyshift:effects", (e) =>
    effectState(Boolean(e.detail)),
  );
  const index = pageName(location.pathname) === 'index';
  function closeMenus() {
    nav.classList.remove("open");
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    more.setAttribute("aria-expanded", "false");
    document.body.classList.remove("navigation-open");
  }
  function active() {
    const route = navigationRoute(location.pathname, location.hash);
    nav.querySelectorAll("[data-route]").forEach((a) => {
      if (a.dataset.route === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.body.dataset.route = route;
    header.querySelector(".header-launch").hidden = route === "compare";
    header.classList.remove("nav-away");
    closeMenus();
  }
  toggle.onclick = () => {
    const open = !nav.classList.contains("open");
    closeMenus();
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    document.body.classList.toggle("navigation-open", open);
  };
  more.onclick = () => {
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open;
    more.setAttribute("aria-expanded", String(open));
  };
  $("resources-information").onclick = () => {
    closeMenus();
    $("site-information").showModal();
  };
  $("site-information-close").onclick = () => $("site-information").close();
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && index && isPlainLinkClick(e,a)) {
      const u = new URL(a.href, location.href);
      if (u.origin === location.origin && pageName(u.pathname)==='index' &&
          new URL('.',u).pathname===new URL('.',location.href).pathname && !u.search &&
          (!u.hash || ['home','observations','compare','universe','mission','classic'].includes(u.hash.slice(1).split('/')[0]))) {
        e.preventDefault();
        const hash=u.hash || '#home';
        if(location.hash===hash){
          window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }else location.hash = hash;
      }
    }
    if (a || e.target.closest("[data-open-sound]")) closeMenus();
    else if (!header.contains(e.target)) closeMenus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const mobile = nav.classList.contains("open"),
        resources = !menu.hidden;
      closeMenus();
      if (mobile) toggle.focus();
      else if (resources) more.focus();
    }
    if (e.key === "Tab" && nav.classList.contains("open")) {
      const links = [toggle, ...nav.querySelectorAll("a")];
      const first = links[0],
        last = links.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  let previous = scrollY,
    frame = 0;
  addEventListener(
    "scroll",
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const fullScene = document.body.classList.contains("universe-active");
        header.classList.toggle(
          "nav-away",
          !fullScene &&
            scrollY > 200 &&
            scrollY > previous + 2 &&
            !header.contains(document.activeElement) &&
            !nav.classList.contains("open") &&
            menu.hidden,
        );
        previous = scrollY;
      });
    },
    { passive: true },
  );
  addEventListener("hashchange", active);
  new MutationObserver(active).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-surface"],
  });
  import("./application-sound.js")
    .then((m) => m.installApplicationSound())
    .catch(() => {
      document.querySelectorAll("[data-sound-toggle]").forEach((b) => {
        b.disabled = true;
        b.title = "Sound unavailable; scientific viewing remains available";
      });
    });
  active();
}
installSiteChrome();

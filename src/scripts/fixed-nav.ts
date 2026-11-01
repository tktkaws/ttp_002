import { getPreferences, setAnimation, setTheme } from "./preferences";
import type { Animation, Theme } from "../config/preferences";

const nav = document.querySelector<HTMLElement>("#fixed-nav");

if (nav) {
  const root = document.documentElement;
  const disclosures = Array.from(nav.querySelectorAll<HTMLElement>(".fixed-nav__item")).map((item) => ({
    item,
    trigger: item.querySelector<HTMLButtonElement>(".fixed-nav__trigger")!,
    panel: item.querySelector<HTMLUListElement>(".fixed-nav__panel")!,
  }));

  const closeMenus = () => {
    for (const { trigger, panel } of disclosures) {
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    }
  };

  for (const { item, trigger, panel } of disclosures) {
    trigger.addEventListener("click", () => {
      const open = panel.hidden;
      closeMenus();
      // Keep focus on the disclosure on browsers that do not focus clicked buttons.
      trigger.focus({ preventScroll: true });
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    });

    item.addEventListener("focusout", (event) => {
      if (!(event.relatedTarget instanceof Node) || !item.contains(event.relatedTarget)) {
        trigger.setAttribute("aria-expanded", "false");
        panel.hidden = true;
      }
    });

    item.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        trigger.focus({ preventScroll: true });
        closeMenus();
      }
    });

    panel.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const option = event.target.closest<HTMLButtonElement | HTMLAnchorElement>("button, a");
      if (!option) return;

      if (option instanceof HTMLAnchorElement) {
        const section = document.querySelector<HTMLElement>(option.hash);
        if (section) {
          section.tabIndex = -1;
          section.focus({ preventScroll: true });
          section.addEventListener("blur", () => section.removeAttribute("tabindex"), { once: true });
        }
      } else {
        const theme = option.dataset.theme;
        const animation = option.dataset.animation;
        if (theme === "light" || theme === "dark") applyTheme(theme);
        if (animation === "on" || animation === "off") applyAnimation(animation);
        trigger.focus({ preventScroll: true });
      }
      closeMenus();
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && !nav.contains(event.target)) closeMenus();
  });

  const labelText = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  const applyTheme = (theme: Theme, save = true) => {
    setTheme(theme, save);
    nav.querySelector<HTMLElement>("[data-theme-label]")!.textContent = labelText(theme);
    nav.querySelectorAll<HTMLButtonElement>("button[data-theme]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
    });
  };

  const applyAnimation = (animation: Animation, save = true) => {
    setAnimation(animation, save);
    nav.querySelector<HTMLElement>("[data-animation-label]")!.textContent = labelText(animation);
    nav.querySelectorAll<HTMLButtonElement>("button[data-animation]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.animation === animation));
    });
  };

  const preferences = getPreferences();
  applyTheme(preferences.theme, false);
  applyAnimation(preferences.animation, false);

  const getScrollY = () => Math.max(0, Math.min(window.scrollY, root.scrollHeight - window.innerHeight));
  let previousY = getScrollY();
  let scrollPending = false;

  const updateVisibility = () => {
    scrollPending = false;
    const currentY = getScrollY();
    const delta = currentY - previousY;
    if (currentY > 0 && Math.abs(delta) < 6) return;
    previousY = currentY;

    // Keep keyboard users' focused controls visible even when scrolling.
    const active = document.activeElement;
    if (active instanceof HTMLElement && nav.contains(active) && active.matches(":focus-visible")) return;

    const hidden = currentY > 0 && delta > 0;
    if (hidden) {
      if (active instanceof HTMLElement && nav.contains(active)) active.blur();
      closeMenus();
    }
    nav.classList.toggle("fixed-nav--hidden", hidden);
  };

  window.addEventListener("scroll", () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateVisibility);
    }
  }, { passive: true });

  // Hidden controls remain reachable with Tab and reveal before receiving input.
  nav.addEventListener("focusin", () => nav.classList.remove("fixed-nav--hidden"));
  window.addEventListener("pageshow", () => {
    previousY = getScrollY();
    nav.classList.remove("fixed-nav--hidden");
  });
}

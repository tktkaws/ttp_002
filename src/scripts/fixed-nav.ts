import {
  getPreferences,
  preferencesChangeEvent,
  setAnimation,
  setTheme,
} from "./preferences.ts";

export function initFixedNav(
  nav = document.querySelector<HTMLElement>("#fixed-nav"),
) {
  if (!nav) return () => {};
  const root = document.documentElement;
  const items = [
    ...nav.querySelectorAll<HTMLDetailsElement>(".fixed-nav__item"),
  ];
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  let abort: AbortController | undefined;
  let frame = 0;
  let disposed = false;

  const fallback = () => {
    disposed = true;
    abort?.abort();
    if (frame) cancelAnimationFrame(frame);
    delete nav.dataset.enhanced;
    nav.classList.remove("fixed-nav--hidden");
    for (const item of items) {
      item.hidden = item.hasAttribute("data-preference-item");
      item.open = item.hasAttribute("data-contents-item");
    }
    for (const button of buttons) button.disabled = true;
  };
  const safely = (action: () => void) => {
    if (disposed) return;
    try {
      action();
    } catch {
      fallback();
    }
  };
  const closeMenus = () =>
    items.forEach((item) => {
      item.open = false;
    });
  const listen = (
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
  ) => {
    target.addEventListener(type, (event) => safely(() => handler(event)), {
      signal: abort!.signal,
    });
  };

  try {
    const disclosures = items.map((item) => ({
      item,
      trigger: item.querySelector<HTMLElement>(".fixed-nav__trigger"),
      panel: item.querySelector<HTMLElement>(".fixed-nav__panel"),
    }));
    const themeLabel = nav.querySelector<HTMLElement>("[data-theme-label]");
    const animationLabel = nav.querySelector<HTMLElement>(
      "[data-animation-label]",
    );
    if (
      !themeLabel ||
      !animationLabel ||
      !items.some((item) => item.hasAttribute("data-contents-item")) ||
      disclosures.some(({ trigger, panel }) => !trigger || !panel)
    ) {
      fallback();
      return fallback;
    }
    abort = new AbortController();
    const labelText = (value: string) =>
      value.charAt(0).toUpperCase() + value.slice(1);
    const syncPreferenceControls = () => {
      const { theme, animation } = getPreferences();
      themeLabel.textContent = labelText(theme);
      animationLabel.textContent = labelText(animation);
      for (const button of buttons) {
        const value = button.dataset.theme ?? button.dataset.animation;
        button.setAttribute(
          "aria-pressed",
          String(value === (button.dataset.theme ? theme : animation)),
        );
      }
    };

    for (const { item, trigger, panel } of disclosures) {
      listen(item, "toggle", () => {
        if (item.open)
          items.forEach((other) => {
            if (other !== item) other.open = false;
          });
      });
      listen(item, "focusout", (event) => {
        const { relatedTarget } = event as FocusEvent;
        if (!(relatedTarget instanceof Node) || !item.contains(relatedTarget))
          item.open = false;
      });
      listen(item, "keydown", (event) => {
        if ((event as KeyboardEvent).key === "Escape" && item.open) {
          event.preventDefault();
          item.open = false;
          trigger!.focus({ preventScroll: true });
        }
      });
      listen(panel!, "click", (event) => {
        if (!(event.target instanceof Element)) return;
        const option = event.target.closest<
          HTMLButtonElement | HTMLAnchorElement
        >("button, a");
        if (!option) return;
        if (option instanceof HTMLAnchorElement) {
          const click = event as MouseEvent;
          if (
            click.button !== 0 ||
            click.metaKey ||
            click.ctrlKey ||
            click.shiftKey ||
            click.altKey
          )
            return;
        } else {
          const { theme, animation } = option.dataset;
          if (theme === "light" || theme === "dark") setTheme(theme);
          if (animation === "on" || animation === "off")
            setAnimation(animation);
          trigger!.focus({ preventScroll: true });
        }
        closeMenus();
      });
    }
    listen(document, "pointerdown", (event) => {
      if (event.target instanceof Node && !nav.contains(event.target))
        closeMenus();
    });
    listen(document, preferencesChangeEvent, syncPreferenceControls);
    syncPreferenceControls();

    const getScrollY = () =>
      Math.max(
        0,
        Math.min(window.scrollY, root.scrollHeight - window.innerHeight),
      );
    let previousY = getScrollY();
    listen(window, "scroll", () => {
      if (frame) return;
      frame = requestAnimationFrame(() =>
        safely(() => {
          frame = 0;
          const currentY = getScrollY(),
            delta = currentY - previousY;
          if (getComputedStyle(nav).position !== "fixed") {
            previousY = currentY;
            nav.classList.remove("fixed-nav--hidden");
            return;
          }
          if (currentY > 0 && Math.abs(delta) < 6) return;
          previousY = currentY;
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            nav.contains(active) &&
            active.matches(":focus-visible")
          )
            return;
          const hidden = currentY > 0 && delta > 0;
          if (hidden) {
            if (active instanceof HTMLElement && nav.contains(active))
              active.blur();
            closeMenus();
          }
          nav.classList.toggle("fixed-nav--hidden", hidden);
        }),
      );
    });
    listen(nav, "focusin", () => nav.classList.remove("fixed-nav--hidden"));
    listen(window, "pageshow", () => {
      previousY = getScrollY();
      nav.classList.remove("fixed-nav--hidden");
    });

    // Publish the enhanced state only after all handlers and labels are ready.
    closeMenus();
    for (const button of buttons) button.disabled = false;
    for (const item of items) item.hidden = false;
    nav.dataset.enhanced = "true";
  } catch {
    fallback();
  }
  return fallback;
}

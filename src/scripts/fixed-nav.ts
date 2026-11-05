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
  const menuButton = nav.querySelector<HTMLButtonElement>("[data-menu-button]");
  const popover = nav.querySelector<HTMLElement>("#fixed-nav-popover");
  const items = [...nav.querySelectorAll<HTMLElement>(".fixed-nav__item")];
  const buttons = [
    ...nav.querySelectorAll<HTMLButtonElement>("[data-preference-item] button"),
  ];
  let abort: AbortController | undefined;

  let disposed = false;

  const fallback = () => {
    disposed = true;
    abort?.abort();
    if (popover) {
      if (popover.matches(":popover-open")) popover.hidePopover();
      popover.removeAttribute("popover");
    }
    if (menuButton) menuButton.hidden = true;
    delete nav.dataset.enhanced;
    nav.classList.remove("fixed-nav--hidden");
    for (const item of items) {
      item.hidden = item.hasAttribute("data-preference-item");
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
    const panels = items.map((item) =>
      item.querySelector<HTMLElement>(".fixed-nav__panel"),
    );
    if (
      !menuButton ||
      !popover ||
      !items.some((item) => item.hasAttribute("data-contents-item")) ||
      panels.some((panel) => !panel)
    ) {
      fallback();
      return fallback;
    }
    abort = new AbortController();
    const syncPreferenceControls = () => {
      const { theme, animation } = getPreferences();
      for (const button of buttons) {
        const value = button.dataset.theme ?? button.dataset.animation;
        button.setAttribute(
          "aria-pressed",
          String(value === (button.dataset.theme ? theme : animation)),
        );
      }
    };

    for (const panel of panels) {
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
        }
      });
    }
    listen(document, preferencesChangeEvent, syncPreferenceControls);
    syncPreferenceControls();

    const syncMenu = () => {
      const open = popover.matches(":popover-open");
      menuButton.textContent = open ? "閉じる" : "メニュー";
      menuButton.setAttribute("aria-expanded", String(open));
    };
    listen(popover, "toggle", syncMenu);
    listen(nav, "keydown", (event) => {
      if (
        (event as KeyboardEvent).key === "Escape" &&
        popover.matches(":popover-open")
      ) {
        event.preventDefault();
        popover.hidePopover();
        syncMenu();
        menuButton.focus({ preventScroll: true });
      }
    });
    listen(nav, "focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (
        next instanceof Node &&
        !nav.contains(next) &&
        popover.matches(":popover-open")
      ) {
        popover.hidePopover();
        syncMenu();
      }
    });
    listen(popover, "click", (event) => {
      const click = event as MouseEvent;
      if (
        event.target instanceof Element &&
        event.target.closest('a[href^="#"]') &&
        click.button === 0 &&
        !click.metaKey &&
        !click.ctrlKey &&
        !click.shiftKey &&
        !click.altKey
      ) {
        popover.hidePopover();
        syncMenu();
      }
    });
    popover.setAttribute("popover", "auto");
    menuButton.hidden = false;

    // Publish the enhanced state only after all handlers and labels are ready.
    for (const button of buttons) button.disabled = false;
    for (const item of items) item.hidden = false;
    nav.dataset.enhanced = "true";
  } catch {
    fallback();
  }
  return fallback;
}

export function initFixedNav(
  nav = document.querySelector<HTMLElement>("#fixed-nav"),
) {
  if (!nav) return () => {};
  const menuButton = nav.querySelector<HTMLButtonElement>("[data-menu-button]");
  const popover = nav.querySelector<HTMLElement>("#fixed-nav-popover");
  const links = [
    ...nav.querySelectorAll<HTMLAnchorElement>("#contents-options a"),
  ];
  const lines = [...nav.querySelectorAll<HTMLElement>("[data-section-line]")];
  const abort = new AbortController();
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let observer: ResizeObserver | undefined;
  let pinned = false;
  let disposed = false;

  const cleanup = () => {
    disposed = true;
    abort.abort();
    clearTimeout(closeTimer);
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    if (popover?.matches(":popover-open")) popover.hidePopover();
    menuButton?.removeAttribute("aria-expanded");
    delete nav.dataset.enhanced;
  };
  const safely = (action: () => void) => {
    if (disposed) return;
    try {
      action();
    } catch {
      cleanup();
    }
  };
  const listen = (
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
  ) => {
    target.addEventListener(type, (event) => safely(() => handler(event)), {
      signal: abort.signal,
    });
  };

  try {
    if (
      !menuButton ||
      !popover ||
      !links.length ||
      lines.length !== links.length
    ) {
      cleanup();
      return cleanup;
    }
    const isOpen = () => popover.matches(":popover-open");
    const syncMenu = () => {
      menuButton.setAttribute("aria-expanded", String(isOpen()));
      if (!isOpen()) pinned = false;
    };
    const close = () => {
      clearTimeout(closeTimer);
      if (isOpen()) popover.hidePopover();
      syncMenu();
    };
    const open = () => {
      clearTimeout(closeTimer);
      if (!isOpen()) popover.showPopover();
      syncMenu();
    };
    listen(popover, "toggle", syncMenu);
    listen(menuButton, "click", (event) => {
      event.preventDefault();
      // A mouse click after hover keeps the menu open; a second click closes it.
      if (isOpen() && (pinned || (event as MouseEvent).detail === 0)) close();
      else {
        open();
        pinned = true;
      }
    });
    for (const target of [menuButton, popover]) {
      listen(target, "pointerenter", (event) => {
        if ((event as PointerEvent).pointerType !== "mouse") return;
        clearTimeout(closeTimer);
        if (
          target === menuButton &&
          window.matchMedia("(hover: hover)").matches
        )
          open();
      });
      listen(target, "pointerleave", (event) => {
        if ((event as PointerEvent).pointerType !== "mouse") return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(
          () =>
            safely(() => {
              if (!pinned && !popover.contains(document.activeElement)) close();
            }),
          180,
        );
      });
    }
    listen(nav, "keydown", (event) => {
      if ((event as KeyboardEvent).key === "Escape" && isOpen()) {
        event.preventDefault();
        close();
        menuButton.focus({ preventScroll: true });
      }
    });
    listen(nav, "focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (next instanceof Node && !nav.contains(next)) close();
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
      )
        close();
    });

    const sections = links.map((link) =>
      document.getElementById(decodeURIComponent(link.hash.slice(1))),
    );
    const syncCurrent = () => {
      const readingLine = Math.min(160, window.innerHeight * 0.3);
      let current = 0;
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= readingLine)
          current = index;
      });
      if (
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2
      )
        current = links.length - 1;
      links.forEach((link, index) => {
        if (index === current) {
          link.setAttribute("aria-current", "location");
          lines[index].setAttribute("data-current", "");
        } else {
          link.removeAttribute("aria-current");
          lines[index].removeAttribute("data-current");
        }
      });
    };
    const scheduleCurrent = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        safely(syncCurrent);
      });
    };
    listen(window, "scroll", scheduleCurrent);
    listen(window, "resize", scheduleCurrent);
    listen(window, "pageshow", scheduleCurrent);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleCurrent);
      observer.observe(document.body);
    }
    syncMenu();
    syncCurrent();
    nav.dataset.enhanced = "true";
  } catch {
    cleanup();
  }
  return cleanup;
}

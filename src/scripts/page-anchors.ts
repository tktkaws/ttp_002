export function focusPageAnchor(hash: string) {
  if (!hash || hash === "#") return;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!(target instanceof HTMLElement)) return;

  // Preserve tabindex supplied by the document or another interaction.
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener(
      "blur",
      () => {
        if (target.getAttribute("tabindex") === "-1")
          target.removeAttribute("tabindex");
      },
      { once: true },
    );
  }
  target.focus({ preventScroll: true });
}

export function initPageAnchors() {
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    const url = new URL(link.href, location.href);
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.search !== location.search
    )
      return;
    // Native navigation owns the hash, scrolling and back/forward history.
    focusPageAnchor(url.hash);
  };
  const onHashChange = () => focusPageAnchor(location.hash);

  document.addEventListener("click", onClick);
  window.addEventListener("hashchange", onHashChange);
  // Allow the initial native fragment scroll to finish before moving focus.
  if (document.readyState === "complete") onHashChange();
  else window.addEventListener("load", onHashChange, { once: true });
  return () => {
    document.removeEventListener("click", onClick);
    window.removeEventListener("hashchange", onHashChange);
    window.removeEventListener("load", onHashChange);
  };
}

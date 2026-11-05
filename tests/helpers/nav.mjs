import { ElementStub } from "./dom.mjs";

export function createNav(dom) {
  Object.assign(dom.root, { scrollHeight: 2000 });
  Object.assign(dom.window, { innerHeight: 800, scrollY: 0 });
  const option = (key, value) => {
    const button = new ElementStub();
    button.dataset[key] = value;
    button.disabled = true;
    button.closest = () => button;
    return button;
  };
  const themes = [option("theme", "light"), option("theme", "dark")];
  const animations = [option("animation", "off"), option("animation", "on")];
  const panels = Array.from({ length: 3 }, () => new ElementStub());
  const items = panels.map((panel, index) => {
    const item = new ElementStub();
    item.setAttribute(
      index === 2 ? "data-contents-item" : "data-preference-item",
      "",
    );
    item.hidden = index !== 2;
    item.querySelector = () => panel;
    return item;
  });
  const nav = new ElementStub();
  const menuButton = new ElementStub();
  const popover = new ElementStub();
  popover.matches = () => false;
  nav.querySelector = (selector) =>
    selector === "[data-menu-button]"
      ? menuButton
      : selector === "#fixed-nav-popover"
        ? popover
        : null;
  nav.querySelectorAll = (selector) =>
    selector === ".fixed-nav__item"
      ? items
      : selector === "[data-preference-item] button"
        ? [...themes, ...animations]
        : [];
  dom.document.querySelector = (selector) =>
    selector === "#fixed-nav" ? nav : dom.meta;
  return {
    nav,
    items,
    panels,
    themes,
    animations,
  };
}

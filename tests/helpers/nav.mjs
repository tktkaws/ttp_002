import { ElementStub } from "./dom.mjs";

export function createNav(dom) {
  Object.assign(dom.root, { scrollHeight: 2000 });
  Object.assign(dom.window, { innerHeight: 800, scrollY: 0 });
  const themeLabel = new ElementStub(),
    animationLabel = new ElementStub();
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
  const triggers = panels.map(() => new ElementStub());
  const items = panels.map((panel, index) => {
    const item = new ElementStub();
    item.setAttribute(
      index === 2 ? "data-contents-item" : "data-preference-item",
      "",
    );
    item.hidden = index !== 2;
    item.open = index === 2;
    item.querySelector = (selector) =>
      selector.endsWith("trigger") ? triggers[index] : panel;
    return item;
  });
  const nav = new ElementStub();
  nav.querySelector = (selector) =>
    selector.includes("theme") ? themeLabel : animationLabel;
  nav.querySelectorAll = (selector) =>
    selector === ".fixed-nav__item"
      ? items
      : selector === "button"
        ? [...themes, ...animations]
        : [];
  dom.document.querySelector = (selector) =>
    selector === "#fixed-nav" ? nav : dom.meta;
  return {
    nav,
    items,
    panels,
    triggers,
    themeLabel,
    animationLabel,
    themes,
    animations,
  };
}

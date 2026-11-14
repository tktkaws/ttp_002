import { ElementStub } from "./dom.mjs";

export function createNav(dom) {
  Object.assign(dom.root, { scrollHeight: 2000 });
  Object.assign(dom.window, { innerHeight: 800, scrollY: 0 });
  const nav = new ElementStub();
  const menuButton = new ElementStub();
  const popover = new ElementStub();
  menuButton.hidden = false;
  popover.setAttribute("popover", "auto");
  popover.matches = () => false;
  const links = Array.from({ length: 4 }, (_, index) => {
    const link = new ElementStub();
    link.hash = `#section0${index + 1}`;
    return link;
  });
  const lines = links.map(() => new ElementStub());
  nav.querySelector = (selector) =>
    selector === "[data-menu-button]"
      ? menuButton
      : selector === "#fixed-nav-popover"
        ? popover
        : null;
  nav.querySelectorAll = (selector) =>
    selector === "#contents-options a"
      ? links
      : selector === "[data-section-line]"
        ? lines
        : [];
  dom.document.querySelector = (selector) =>
    selector === "#fixed-nav" ? nav : dom.meta;
  return { nav, menuButton, popover, links, lines };
}

export function createPreferenceControls() {
  const controls = new ElementStub();
  const animation = new ElementStub();
  const theme = new ElementStub();
  animation.disabled = theme.disabled = true;
  controls.querySelector = (selector) =>
    selector === "[data-animation-toggle]"
      ? animation
      : selector === "[data-theme-toggle]"
        ? theme
        : null;
  return { controls, animation, theme };
}

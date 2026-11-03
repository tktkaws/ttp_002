export function restoreTextCards(root: HTMLElement) {
  root.dataset.active = "false";
  root.dataset.state = "static";
  for (const card of root.querySelectorAll<HTMLElement>("[data-card]")) {
    for (const property of ["opacity", "transform", "z-index", "will-change"])
      card.style.removeProperty(property);
  }
  root.querySelector<SVGSVGElement>("[data-skin]")?.replaceChildren();
  const controls = root.querySelector<HTMLElement>("[data-controls-container]");
  if (controls) controls.hidden = true;
}

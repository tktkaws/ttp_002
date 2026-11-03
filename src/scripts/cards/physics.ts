import Matter from "matter-js";
import { mountCardControls } from "./controls.ts";
import { cardPhysicsDefaults } from "../../config/card-physics.ts";
import { restoreTextCards } from "./fallback.ts";

const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = Matter;
const NS = "http://www.w3.org/2000/svg";

export function mountTextCards(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  const skin = root.querySelector<SVGSVGElement>("[data-skin]")!;
  if (!stage || !skin || !cards.length) {
    restoreTextCards(root);
    return () => restoreTextCards(root);
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  const defaults = {
    ...cardPhysicsDefaults,
    soft: root.dataset.soft === "true",
    dropDistance: Number(root.dataset.distance), dropInterval: Number(root.dataset.interval),
  };
  const params = { ...defaults };
  const key = root.dataset.settingsKey;
  if (key) {
    const query = new URL(location.href).searchParams;
    const mode = query.get(`${key}.physics`);
    if (mode === "soft" || mode === "rigid") params.soft = mode === "soft";
  }
  let engine: ReturnType<typeof Engine.create> | undefined;
  let items: ReturnType<typeof makeItem>[] = [];
  let frame = 0, resizeFrame = 0, last = 0, elapsed = 0, accumulator = 0;
  let visible = false, settled = false, active = false, disposed = false;
  let measuredWidth = 0, measuredHeight = 0;
  let pane: ReturnType<typeof mountCardControls> | undefined;
  let observer: IntersectionObserver | undefined;
  let resize: ResizeObserver | undefined;
  let animationPreference: MutationObserver | undefined;

  function dispose() {
    disposed = true;
    restoreTextCards(root);
    const cleanup = [
      pause,
      () => cancelAnimationFrame(resizeFrame),
      () => abort.abort(),
      () => observer?.disconnect(),
      () => resize?.disconnect(),
      () => animationPreference?.disconnect(),
      () => pane?.dispose(),
      () => { if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); } },
    ];
    for (const action of cleanup) {
      try { action(); } catch { /* Continue restoring the remaining resources. */ }
    }
  }

  function safely(action: () => void) {
    if (disposed) return;
    try { action(); } catch { dispose(); }
  }

  function saveSettings() {
    if (!key) return;
    const url = new URL(location.href);
    url.searchParams.set(`${key}.physics`, params.soft ? "soft" : "rigid");
    history.replaceState(history.state, "", url);
  }

  function svgElement<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string>) {
    const element = document.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
  }

  function makeItem(element: HTMLElement, index: number, bounds: DOMRect) {
    const rect = element.getBoundingClientRect();
    const home = { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + rect.height / 2, width: rect.width, height: rect.height };
    const filter = { group: index + 1, category: 1, mask: 0 };
    const options = { restitution: params.restitution, friction: 0.25, frictionStatic: 0.4, frictionAir: params.frictionAir, sleepThreshold: 40, collisionFilter: filter };
    const composite = Composite.create();
    const rests: { x: number; y: number }[] = [];
    let surface: SVGPathElement | null = null;
    let skeleton: SVGPathElement | null = null;
    const outline: number[] = [];
    let bottomExtent = 0;
    if (params.soft) {
      const dx = home.width / (params.columns - 1), dy = home.height / (params.rows - 1);
      const radius = Math.max(3, Math.min(dx, dy) * 0.12);
      for (let row = 0; row < params.rows; row++) for (let col = 0; col < params.columns; col++) {
        const rest = { x: col * dx - home.width / 2, y: row * dy - home.height / 2 };
        rests.push(rest);
        Composite.add(composite, Bodies.circle(home.x + rest.x, home.y + rest.y, radius, options));
      }
      const bodies = composite.bodies;
      for (let row = 0; row < params.rows; row++) for (let col = 0; col < params.columns; col++) {
        const id = row * params.columns + col;
        const connect = (other: number, stiffness: number) => Composite.add(composite, Constraint.create({ bodyA: bodies[id], bodyB: bodies[other], stiffness, damping: 0.08 }));
        if (col < params.columns - 1) connect(id + 1, 0.72);
        if (row < params.rows - 1) connect(id + params.columns, 0.72);
        if (col < params.columns - 1 && row < params.rows - 1) connect(id + params.columns + 1, 0.45);
      }
      bottomExtent = bodies[0].bounds.max.y - bodies[0].position.y;
      for (let col = 0; col < params.columns; col++) outline.push(col);
      for (let row = 1; row < params.rows; row++) outline.push(row * params.columns + params.columns - 1);
      for (let col = params.columns - 2; col >= 0; col--) outline.push((params.rows - 1) * params.columns + col);
      for (let row = params.rows - 2; row > 0; row--) outline.push(row * params.columns);
      surface = svgElement("path", { fill: getComputedStyle(element).backgroundColor, opacity: "0" });
      skeleton = svgElement("path", { fill: "none", stroke: "#ffcc00", "stroke-width": "1", display: "none" });
      skin.append(surface, skeleton);
    } else {
      rests.push({ x: 0, y: 0 });
      Composite.add(composite, Bodies.rectangle(home.x, home.y, home.width, home.height, options));
    }
    const shelf = Bodies.rectangle(home.x, home.y + home.height / 2 + bottomExtent + 110, home.width + home.height, 220, { ...options, isStatic: true });
    Composite.add(engine!.world, shelf);
    return { element, home, composite, rests, surface, skeleton, outline, index, dropped: false, locked: false, settling: false, calm: 0, fade: 0 };
  }

  function drop(item: ReturnType<typeof makeItem>) {
    const angle = (item.index % 2 ? 1 : -1) * params.angle * Math.PI / 180;
    item.composite.bodies.forEach((body, index) => {
      const rest = item.rests[index];
      Body.setPosition(body, { x: item.home.x + rest.x * Math.cos(angle) - rest.y * Math.sin(angle), y: item.home.y - item.home.height * params.dropDistance + rest.x * Math.sin(angle) + rest.y * Math.cos(angle) });
      if (!params.soft) Body.setAngle(body, angle);
    });
    Composite.add(engine!.world, item.composite);
    item.dropped = true;
  }

  function update(item: ReturnType<typeof makeItem>) {
    const bodies = item.composite.bodies, home = item.home;
    const center = () => ({ x: bodies.reduce((s, b) => s + b.position.x, 0) / bodies.length, y: bodies.reduce((s, b) => s + b.position.y, 0) / bodies.length });
    if (!item.locked) {
      if (item.settling) {
        let remaining = 0;
        bodies.forEach((body, index) => {
          const dx = home.x + item.rests[index].x - body.position.x, dy = home.y + item.rests[index].y - body.position.y;
          remaining = Math.max(remaining, Math.hypot(dx, dy));
          Body.setPosition(body, { x: body.position.x + dx * 0.2, y: body.position.y + dy * 0.2 });
        });
        if (remaining < 0.05) {
          bodies.forEach((body, index) => Body.setPosition(body, { x: home.x + item.rests[index].x, y: home.y + item.rests[index].y }));
          item.locked = true;
        }
      } else {
        const point = center(), offset = home.x - point.x;
        bodies.forEach(body => {
          Body.setPosition(body, { x: body.position.x + offset, y: body.position.y });
          Body.setVelocity(body, { x: 0, y: body.velocity.y });
          if (point.y < home.y - 12 && body.isSleeping) Sleeping.set(body, false);
        });
        const calm = point.y > home.y - 12 && bodies.every(b => Math.abs(b.velocity.y) < 0.65 && (params.soft || Body.getAngularSpeed(b) < 0.15));
        item.calm = calm ? item.calm + 1 : 0;
        if (item.calm >= params.lockFrames) {
          bodies.forEach(body => { Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0); Body.setStatic(body, true); });
          item.fade = 1;
          if (params.soft) item.settling = true;
          else { Body.setPosition(bodies[0], home); Body.setAngle(bodies[0], 0); item.locked = true; }
        }
      }
    }
    const point = center(), distance = home.height * params.dropDistance;
    item.fade = Math.max(item.fade, Math.min(1, Math.max(0, distance ? (point.y - home.y + distance) / distance : 1)));
    item.element.style.opacity = String(item.fade);
    if (!params.soft) {
      item.element.style.transform = `translateY(${point.y - home.y}px) rotate(${bodies[0].angle}rad)`;
      return;
    }
    item.surface!.setAttribute("d", `M${item.outline.map(id => `${bodies[id].position.x},${bodies[id].position.y}`).join(" L")} Z`);
    item.surface!.setAttribute("opacity", String(item.fade));
    const edge = (ids: number[]) => ({ x: ids.reduce((s, id) => s + bodies[id].position.x, 0) / ids.length, y: ids.reduce((s, id) => s + bodies[id].position.y, 0) / ids.length });
    const left = edge(Array.from({ length: params.rows }, (_, r) => r * params.columns));
    const right = edge(Array.from({ length: params.rows }, (_, r) => r * params.columns + params.columns - 1));
    const top = edge(Array.from({ length: params.columns }, (_, c) => c));
    const bottom = edge(Array.from({ length: params.columns }, (_, c) => (params.rows - 1) * params.columns + c));
    // Move only the original HTML object and its label; the description stays in place.
    item.element.style.transform = `matrix(${(right.x - left.x) / home.width},${(right.y - left.y) / home.width},${(bottom.x - top.x) / home.height},${(bottom.y - top.y) / home.height},${point.x - home.x},${point.y - home.y})`;
    item.element.style.zIndex = "1";
    paintSkeleton(item);
  }

  function paintSkeleton(item: ReturnType<typeof makeItem>) {
    if (!item.skeleton) return;
    item.skeleton.setAttribute("display", params.skeleton && item.dropped ? "inline" : "none");
    item.skeleton.setAttribute("d", item.composite.constraints.map(({ bodyA, bodyB }) => `M${bodyA.position.x},${bodyA.position.y} L${bodyB.position.x},${bodyB.position.y}`).join(" "));
  }

  function pause() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function resume() {
    if (!disposed && active && !settled && !document.hidden && visible && !frame) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    safely(() => updateFrame(now));
  }

  function updateFrame(now: number) {
    frame = 0;
    const delta = last ? Math.min(now - last, 64) : 0;
    last = now; elapsed += delta; accumulator += delta;
    for (const item of items) if (!item.dropped && elapsed >= item.index * params.dropInterval) drop(item);
    while (accumulator >= 1000 / 60) { Engine.update(engine!, 1000 / 60); accumulator -= 1000 / 60; }
    for (const item of items) if (item.dropped) update(item);
    settled = items.every(item => item.locked);
    root.dataset.state = settled ? "settled" : "falling";
    if (settled) cards.forEach(card => { card.style.willChange = "auto"; });
    else resume();
  }

  function rebuild() {
    safely(rebuildScene);
  }

  function rebuildScene() {
    pause();
    if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); engine = undefined; }
    skin.replaceChildren();
    items = [];
    root.dataset.active = "false";
    root.dataset.mode = params.soft ? "soft" : "rigid";
    root.style.setProperty("--drop-distance", String(params.dropDistance));
    for (const card of cards) {
      for (const property of ["opacity", "transform", "z-index", "will-change"]) card.style.removeProperty(property);
    }
    // Measure after activating the animation's reserved space.
    active = root.dataset.animate !== "false" && document.documentElement.dataset.animation === "on" && !reduced.matches;
    root.dataset.active = String(active);
    const bounds = stage.getBoundingClientRect();
    measuredWidth = bounds.width; measuredHeight = bounds.height;
    // Honor the site's Animation control as well as the OS motion preference.
    root.dataset.state = "static";
    if (!active) return;
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = params.gravity;
    engine.positionIterations = 10; engine.velocityIterations = 8;
    skin.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    items = cards.map((card, index) => makeItem(card, index, bounds));
    elapsed = 0; accumulator = 0; settled = false;
    resume();
  }

  safely(() => {
    pane = root.dataset.controls === "true"
      ? mountCardControls(root.querySelector<HTMLElement>("[data-controls-container]")!, params, defaults, {
          saveSettings: () => safely(saveSettings),
          rebuild,
          paintSkeleton: () => safely(() => items.forEach(paintSkeleton)),
        })
      : undefined;

    const controls = root.querySelector<HTMLElement>("[data-controls-container]");
    if (controls) controls.hidden = !pane;
    const scheduleRebuild = () => safely(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(rebuild); });
    animationPreference = new MutationObserver(scheduleRebuild);
    animationPreference.observe(document.documentElement, { attributes: true, attributeFilter: ["data-animation"] });
    reduced.addEventListener("change", scheduleRebuild, { signal: abort.signal });
    document.addEventListener("visibilitychange", () => safely(() => document.hidden ? pause() : resume()), { signal: abort.signal });
    window.addEventListener("pagehide", () => safely(pause), { signal: abort.signal });
    window.addEventListener("pageshow", () => safely(resume), { signal: abort.signal });
    observer = new IntersectionObserver(([entry]) => safely(() => { visible = entry.isIntersecting; if (visible) resume(); else pause(); }), { rootMargin: "0px 0px -20% 0px" });
    observer.observe(stage);
    resize = new ResizeObserver(() => safely(() => {
      const bounds = stage.getBoundingClientRect();
      if (Math.abs(bounds.width - measuredWidth) > 0.5 || Math.abs(bounds.height - measuredHeight) > 0.5) scheduleRebuild();
    }));
    rebuild();
    if (!disposed) resize.observe(stage);
  });
  return dispose;
}

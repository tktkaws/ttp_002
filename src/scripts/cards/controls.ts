import { Pane } from "tweakpane";
import type { CardPhysicsParams } from "../../config/card-physics";

interface Callbacks {
  saveSettings: () => void;
  rebuild: () => void;
  paintSkeleton: () => void;
}

export function mountCardControls(
  container: HTMLElement,
  params: CardPhysicsParams,
  defaults: CardPhysicsParams,
  callbacks: Callbacks,
) {
  const pane = new Pane({ title: "調整", container, expanded: false });
  let resetting = false;
  pane.addBinding(params, "soft", { label: "Soft" }).on("change", () => {
    if (!resetting) {
      callbacks.saveSettings();
      callbacks.rebuild();
    }
  });
  const softControls = pane.addFolder({
    title: "Softの調整",
    expanded: false,
    hidden: !params.soft,
  });
  pane.on("change", () => {
    softControls.hidden = !params.soft;
  });
  softControls
    .addBinding(params, "skeleton", { label: "骨格を表示" })
    .on("change", () => callbacks.paintSkeleton());
  const controls = [
    ["columns", "列数（横）", 2, 20, 1],
    ["rows", "行数（縦）", 2, 20, 1],
    ["angle", "傾き（度）", 0, 25, 0.1],
    ["restitution", "反発", 0, 1, 0.01],
    ["dropDistance", "落ち始めの高さ", 0, 3, 0.05],
    ["gravity", "重力", 0, 3, 0.05],
    ["frictionAir", "空気抵抗", 0, 0.05, 0.001],
    ["dropInterval", "落下の間隔", 0, 800, 10],
    ["lockFrames", "止まるまでのフレーム", 1, 90, 1],
  ] as const;
  for (const [key, label, min, max, step] of controls) {
    const folder = key === "columns" || key === "rows" ? softControls : pane;
    folder
      .addBinding(params, key, { label, min, max, step })
      .on("change", ({ last }) => {
        if (last && !resetting) callbacks.rebuild();
      });
  }
  pane.addButton({ title: "もう一度落とす" }).on("click", callbacks.rebuild);
  pane.addButton({ title: "初期状態に戻す" }).on("click", () => {
    resetting = true;
    Object.assign(params, defaults);
    pane.refresh();
    resetting = false;
    callbacks.saveSettings();
    callbacks.rebuild();
  });
  return pane;
}

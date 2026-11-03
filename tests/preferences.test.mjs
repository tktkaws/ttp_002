import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { defaultPreferences } from "../src/config/preferences.ts";
import { getPreferences, initPreferenceSync, preferencesChangeEvent, readStoredPreferences, setAnimation, setTheme } from "../src/scripts/preferences.ts";
import { createDOM, ElementStub, eventWith, installDOM } from "./helpers/dom.mjs";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const bootstrap = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .find((match) => !match[1].includes("src=") && match[2].includes("preferenceKeys"));

test("テーマ復元と背景のCSSが、外部CSSとbodyより前にある", () => {
  assert.ok(bootstrap);
  assert.doesNotMatch(bootstrap[1], /\b(?:src|async|defer|type)\s*=/);
  assert.ok(bootstrap.index < html.indexOf('<link rel="stylesheet"'));
  assert.ok(bootstrap.index < html.indexOf("<body"));
  const critical = html.slice(0, bootstrap.index);
  assert.match(critical, /html\[data-theme="light"\][\s\S]*?color-scheme:\s*light/);
  assert.match(critical, /html\[data-theme="dark"\][\s\S]*?color-scheme:\s*dark/);
  assert.match(critical, /background-color:\s*var\(--color-gray-900,\s*#111827\)/);
});

for (const theme of ["light", "dark"]) {
  for (const animation of ["off", "on"]) {
    test(`保存した${theme}/${animation}を同期scriptが初回描画前に復元する`, () => {
      const dom = createDOM({ saved: { theme, animation } });
      vm.runInNewContext(bootstrap[2], { document: dom.document, localStorage: dom.storage });
      assert.deepEqual(dom.root.dataset, { theme, animation });
      assert.equal(dom.root.classList.contains("dark"), theme === "dark");
      assert.equal(dom.meta.getAttribute("content"), theme);
      assert.deepEqual(dom.writes, []);
    });
  }
}

for (const options of [{}, { saved: { theme: "invalid", animation: "invalid" } }, { deniedKeys: ["theme", "animation"] }]) {
  test(`未保存・不正値・利用不可でも既定値になる: ${JSON.stringify(options)}`, (t) => {
    const dom = installDOM(t, options);
    vm.runInNewContext(bootstrap[2], { document: dom.document, localStorage: dom.storage });
    assert.deepEqual(dom.root.dataset, defaultPreferences);
    assert.deepEqual(readStoredPreferences(), defaultPreferences);
  });
}

test("一方のキーだけ読めなくても、他方の保存値を復元する", (t) => {
  const dom = installDOM(t, { saved: { theme: "dark", animation: "on" }, deniedKeys: ["animation"] });
  vm.runInNewContext(bootstrap[2], { document: dom.document, localStorage: dom.storage });
  assert.deepEqual(dom.root.dataset, { theme: "dark", animation: "off" });
  assert.deepEqual(readStoredPreferences(), dom.root.dataset);
});

test("ストレージ自体へのアクセス拒否でも初期化できる", () => {
  const dom = createDOM();
  const sandbox = { document: dom.document };
  Object.defineProperty(sandbox, "localStorage", { get() { throw new Error("SecurityError"); } });
  vm.runInNewContext(bootstrap[2], sandbox);
  assert.deepEqual(dom.root.dataset, defaultPreferences);
});

test("設定変更はDOMと保存値を同期し、再読み込みで復元する", (t) => {
  const dom = installDOM(t);
  const updates = [];
  dom.document.addEventListener(preferencesChangeEvent, (event) => updates.push(event.detail));
  setTheme("dark");
  setAnimation("on");
  assert.deepEqual(getPreferences(), { theme: "dark", animation: "on" });
  assert.equal(dom.meta.getAttribute("content"), "dark");
  assert.ok(dom.root.classList.contains("dark"));
  assert.deepEqual(updates.at(-1), getPreferences());
  const reloaded = createDOM({ saved: Object.fromEntries(dom.values) });
  vm.runInNewContext(bootstrap[2], { document: reloaded.document, localStorage: reloaded.storage });
  assert.deepEqual(reloaded.root.dataset, getPreferences());
  setTheme("light");
  setAnimation("off");
  assert.equal(dom.root.classList.contains("dark"), false);
  assert.equal(dom.meta.getAttribute("content"), "light");
  assert.equal(dom.values.get("theme"), "light");
  assert.equal(dom.values.get("animation"), "off");
});

test("保存失敗や保存しない更新でも、画面内の選択を利用できる", (t) => {
  const dom = installDOM(t, { deniedKeys: ["theme", "animation"] });
  setTheme("dark");
  setAnimation("on");
  const dispose = initPreferenceSync();
  dom.window.dispatchEvent(new Event("pageshow"));
  assert.deepEqual(getPreferences(), { theme: "dark", animation: "on" });
  setTheme("light", false);
  assert.equal(getPreferences().theme, "light");
  assert.deepEqual(dom.writes, []);
  dispose();
});

test("別タブの変更・削除・履歴復帰を反映し、保存し直さない", (t) => {
  const dom = installDOM(t);
  const dispose = initPreferenceSync();
  dom.values.set("theme", "dark");
  dom.values.set("animation", "on");
  dom.window.dispatchEvent(eventWith("storage", { key: "theme", storageArea: {} }));
  assert.deepEqual(getPreferences(), defaultPreferences);
  dom.window.dispatchEvent(eventWith("storage", { key: "theme", storageArea: dom.storage }));
  assert.deepEqual(getPreferences(), { theme: "dark", animation: "on" });
  dom.values.delete("theme");
  dom.window.dispatchEvent(eventWith("storage", { key: "theme", storageArea: dom.storage }));
  assert.equal(getPreferences().theme, "light");
  dom.values.clear();
  dom.window.dispatchEvent(eventWith("storage", { key: null, storageArea: dom.storage }));
  assert.deepEqual(getPreferences(), defaultPreferences);
  dom.values.set("theme", "dark");
  dom.window.dispatchEvent(new Event("pageshow"));
  assert.equal(getPreferences().theme, "dark");
  assert.deepEqual(dom.writes, []);
  dispose();
});

test("保存しない更新は、既存の保存値を書き換えない", (t) => {
  const dom = installDOM(t, { saved: { theme: "dark", animation: "on" } });
  setTheme("light", false);
  setAnimation("off", false);
  assert.deepEqual(getPreferences(), { theme: "light", animation: "off" });
  assert.deepEqual(Object.fromEntries(dom.values), { theme: "dark", animation: "on" });
  assert.deepEqual(dom.writes, []);
});

test("設定ボタン・復元・別タブ変更でラベルと選択状態も同期する", async (t) => {
  const dom = installDOM(t);
  Object.assign(dom.root, { scrollHeight: 2000 });
  Object.assign(dom.window, { innerHeight: 800, scrollY: 0 });
  const themeLabel = new ElementStub(), animationLabel = new ElementStub();
  const option = (key, value) => {
    const button = new ElementStub();
    button.dataset[key] = value;
    button.closest = () => button;
    return button;
  };
  const themes = [option("theme", "light"), option("theme", "dark")];
  const animations = [option("animation", "off"), option("animation", "on")];
  const panels = Array.from({ length: 3 }, () => new ElementStub());
  const items = panels.map((panel) => {
    const item = new ElementStub(), trigger = new ElementStub();
    item.querySelector = (selector) => selector.endsWith("trigger") ? trigger : panel;
    return item;
  });
  const nav = new ElementStub();
  nav.querySelector = (selector) => selector.includes("theme") ? themeLabel : animationLabel;
  nav.querySelectorAll = (selector) => selector === ".fixed-nav__item" ? items : selector.includes("theme") ? themes : animations;
  dom.document.querySelector = (selector) => selector === "#fixed-nav" ? nav : dom.meta;
  await import("../src/scripts/fixed-nav.ts");
  assert.equal(themeLabel.textContent, "Light");
  panels[1].dispatchEvent(eventWith("click", { target: themes[1], button: 0 }));
  assert.equal(themeLabel.textContent, "Dark");
  assert.equal(themes[1].getAttribute("aria-pressed"), "true");
  assert.equal(themes[0].getAttribute("aria-pressed"), "false");
  assert.equal(dom.values.get("theme"), "dark");
  const dispose = initPreferenceSync();
  dom.values.set("animation", "on");
  dom.window.dispatchEvent(eventWith("storage", { key: "animation", storageArea: dom.storage }));
  assert.equal(animationLabel.textContent, "On");
  assert.equal(animations[1].getAttribute("aria-pressed"), "true");
  dom.values.delete("theme");
  dom.window.dispatchEvent(new Event("pageshow"));
  assert.equal(themeLabel.textContent, "Light");
  assert.equal(themes[0].getAttribute("aria-pressed"), "true");
  dispose();
});

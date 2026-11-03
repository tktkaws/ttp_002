import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import Matter from "matter-js";
import { initFixedNav } from "../src/scripts/fixed-nav.ts";
import { initHeadingReveal } from "../src/scripts/heading-reveal.ts";
import { initLogoReveal } from "../src/scripts/logo-reveal.ts";
import { enhanceTextCards } from "../src/scripts/cards/enhancement.ts";
import { mountTextCards } from "../src/scripts/cards/physics.ts";
import { preferencesChangeEvent } from "../src/scripts/preferences.ts";
import { createNav } from "./helpers/nav.mjs";
import { ElementStub, eventWith, installDOM } from "./helpers/dom.mjs";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const cssDirectory = new URL("../dist/_astro/", import.meta.url);
const css = readdirSync(cssDirectory).filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(new URL(name, cssDirectory), "utf8")).join("\n");

test("JSなしの生成HTMLに全本文と成果物リンク、開いたネイティブ目次がある", () => {
  const contents = html.match(/<details\b[^>]*data-contents-item[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(contents);
  assert.match(contents[0].split(">")[0], /\bopen\b/);
  assert.match(contents[1], /<summary\b/);
  assert.equal([...contents[1].matchAll(/href="#section0[1-4]"/g)].length, 4);
  assert.equal([...html.matchAll(/<article\b/g)].length, 6);
  for (const match of html.matchAll(/<(?:section|h[1-3]|article|a)\b([^>]*)>/g)) {
    assert.doesNotMatch(match[1], /\b(?:hidden|inert|aria-hidden="true")\b/);
  }
  assert.match(html, /はじめまして。タカハシタカユキと申します。/);
  assert.match(html, /href="https:\/\/front-dispatch-2026.vercel.app\/"/);
  const settings = [...html.matchAll(/<details\b[^>]*data-preference-item[^>]*>([\s\S]*?)<\/details>/g)];
  assert.equal(settings.length, 2);
  for (const setting of settings) {
    assert.match(setting[0].split(">")[0], /\bhidden\b/);
    for (const button of setting[1].matchAll(/<button\b([^>]*)>/g)) assert.match(button[1], /\bdisabled\b/);
  }
});

test("headの設定復元だけ成功しても見出しを隠すCSSがない", () => {
  assert.doesNotMatch(css, /html\.js/);
  assert.doesNotMatch(css, /(?:heading-reveal|logo-random-reveal)[^{}]*\{[^{}]*(?:opacity:0|clip-path:inset\(0 100%)/);
  assert.doesNotMatch(html, /data-active="true"/);
});

function assertNavFallback(fixture) {
  assert.equal(fixture.nav.dataset.enhanced, undefined);
  assert.equal(fixture.nav.classList.contains("fixed-nav--hidden"), false);
  assert.equal(fixture.items[2].hidden, false);
  assert.equal(fixture.items[2].open, true);
  assert.ok(fixture.items.slice(0, 2).every((item) => item.hidden));
  assert.ok([...fixture.themes, ...fixture.animations].every((button) => button.disabled));
}

test("目次の初期化に必要な要素が不足しても通常のリンク一覧を残す", (t) => {
  const dom = installDOM(t), nav = createNav(dom);
  nav.items[0].querySelector = () => null;
  initFixedNav(nav.nav);
  assertNavFallback(nav);
});

test("イベント登録が途中で失敗したら登録を解除してネイティブ目次へ戻る", (t) => {
  const dom = installDOM(t), nav = createNav(dom);
  nav.items[1].addEventListener = () => { throw new Error("listener failed"); };
  initFixedNav(nav.nav);
  assertNavFallback(nav);
  nav.panels[0].dispatchEvent(eventWith("click", { target: nav.animations[1], button: 0 }));
  assert.equal(dom.root.dataset.animation, "off");
});

test("初期化成功時だけ設定を有効化し、実行中の例外でも目次を復元する", (t) => {
  const dom = installDOM(t), nav = createNav(dom);
  const dispose = initFixedNav(nav.nav);
  assert.equal(nav.nav.dataset.enhanced, "true");
  assert.ok([...nav.themes, ...nav.animations].every((button) => !button.disabled));
  nav.nav.classList.add("fixed-nav--hidden");
  nav.triggers[1].focus = () => { throw new Error("focus failed"); };
  nav.panels[1].dispatchEvent(eventWith("click", { target: nav.themes[1], button: 0 }));
  assertNavFallback(nav);
  dispose();
});

function revealDOM(t, { reduced = false, failObserve = false } = {}) {
  let observer;
  const media = new EventTarget();
  media.matches = reduced;
  const dom = installDOM(t, {}, {
    matchMedia: () => media,
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() { if (failObserve) throw new Error("observer failed"); }
      unobserve() {}
      disconnect() { this.disconnected = true; }
    },
  });
  const heading = new ElementStub(), logo = new ElementStub();
  const animations = [];
  const animate = (_, options) => {
    const animation = { options, finished: new Promise(() => {}), cancel() { this.cancelled = true; } };
    animations.push(animation);
    return animation;
  };
  heading.animate = animate;
  logo.animate = animate;
  const characters = [new ElementStub(), new ElementStub()];
  for (const character of characters) character.animate = animate;
  logo.querySelectorAll = () => characters;
  dom.document.querySelectorAll = (selector) => selector.includes("logo") ? [logo] : [heading];
  return { ...dom, media, heading, logo, characters, animations, observer: () => observer };
}

test("演出用APIがない環境では見出しを変更しない", (t) => {
  const dom = revealDOM(t);
  dom.root.dataset.animation = "on";
  delete dom.heading.animate;
  const dispose = initHeadingReveal();
  assert.equal(dom.observer(), undefined);
  assert.equal(dom.heading.style.getPropertyValue("opacity"), "");
  dispose();
});

test("Observerの初期化が失敗しても見出しを隠さない", (t) => {
  const dom = revealDOM(t, { failObserve: true });
  dom.root.dataset.animation = "on";
  const dispose = initHeadingReveal();
  assert.equal(dom.observer().disconnected, true);
  assert.equal(dom.animations.length, 0);
  assert.equal(dom.heading.style.getPropertyValue("clip-path"), "");
  dispose();
});

test("見出しの演出は有限時間で、Offへの切替時はキャンセルする", (t) => {
  const dom = revealDOM(t);
  dom.root.dataset.animation = "on";
  const dispose = initHeadingReveal();
  dom.observer().callback([{ target: dom.heading, isIntersecting: true }]);
  assert.equal(dom.animations[0].options.duration, 250);
  assert.equal(dom.animations[0].options.fill, undefined);
  dom.root.dataset.animation = "off";
  dom.document.dispatchEvent(new Event(preferencesChangeEvent));
  assert.equal(dom.animations[0].cancelled, true);
  dispose();
});

test("ロゴの演出が途中で失敗しても開始済みのアニメーションを解除する", (t) => {
  const dom = revealDOM(t);
  dom.root.dataset.animation = "on";
  for (const character of dom.characters) {
    const original = character.animate;
    character.animate = (...args) => {
      if (dom.animations.length) throw new Error("animation failed");
      return original(...args);
    };
  }
  const dispose = initLogoReveal();
  dom.observer().callback([{ target: dom.logo, isIntersecting: true }]);
  assert.equal(dom.animations.length, 1);
  assert.equal(dom.animations[0].cancelled, true);
  dispose();
});

test("OSが動きを減らす設定の場合は演出を開始しない", (t) => {
  const dom = revealDOM(t, { reduced: true });
  dom.root.dataset.animation = "on";
  const dispose = initHeadingReveal();
  assert.equal(dom.observer(), undefined);
  assert.equal(dom.animations.length, 0);
  dispose();
});

function cardsDOM(t, { failResize = false } = {}) {
  const frames = new Map(), observers = [];
  let frameId = 0;
  const media = new EventTarget();
  media.matches = false;
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const dom = installDOM(t, {}, {
    matchMedia: () => media,
    IntersectionObserver: Observer,
    MutationObserver: Observer,
    ResizeObserver: failResize ? class { constructor() { throw new Error("resize unavailable"); } } : Observer,
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  dom.root.dataset.animation = "on";
  const root = new ElementStub(), card = new ElementStub(), stage = new ElementStub(), skin = new ElementStub(), controls = new ElementStub();
  Object.assign(root.dataset, { animate: "true", controls: "false", soft: "false", distance: "0.85", interval: "140" });
  root.querySelectorAll = () => [card];
  root.querySelector = (selector) => selector === "[data-stage]" ? stage : selector === "[data-skin]" ? skin : controls;
  stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400 });
  card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200 });
  const runFrame = (time) => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  };
  return { ...dom, root, card, stage, controls, frames, observers, runFrame };
}

function assertStaticCards(dom) {
  assert.equal(dom.root.dataset.active, "false");
  assert.equal(dom.root.dataset.state, "static");
  for (const property of ["opacity", "transform", "z-index", "will-change"]) assert.equal(dom.card.style.getPropertyValue(property), "");
  assert.equal(dom.controls.hidden, true);
}

test("物理演算モジュールの読み込み失敗は静的表示に戻る", async (t) => {
  const dom = cardsDOM(t);
  enhanceTextCards(dom.root, async () => { throw new Error("chunk failed"); });
  await new Promise(setImmediate);
  assertStaticCards(dom);
});

test("物理演算の初期化がDOM変更後に失敗しても見える状態へ戻る", async (t) => {
  const dom = cardsDOM(t);
  enhanceTextCards(dom.root, async () => ({ mountTextCards(root) {
    root.dataset.active = "true";
    dom.card.style.opacity = "0";
    throw new Error("mount failed");
  } }));
  await new Promise(setImmediate);
  assertStaticCards(dom);
});

test("切断中に読み込みが完了しても演出を開始しない", async (t) => {
  const dom = cardsDOM(t);
  let resolve;
  const loading = new Promise((done) => { resolve = done; });
  let mounted = false;
  const dispose = enhanceTextCards(dom.root, () => loading);
  dispose();
  resolve({ mountTextCards() { mounted = true; return () => {}; } });
  await new Promise(setImmediate);
  assert.equal(mounted, false);
  assertStaticCards(dom);
});

test("Observer登録の途中で失敗してもリソースを解除し静的表示を維持する", (t) => {
  const dom = cardsDOM(t, { failResize: true });
  mountTextCards(dom.root);
  assertStaticCards(dom);
  assert.ok(dom.observers.every((observer) => observer.disconnected));
});

test("フレーム処理が失敗したら非表示・変形を解除し、演算を停止する", (t) => {
  const dom = cardsDOM(t);
  const dispose = mountTextCards(dom.root);
  assert.equal(dom.card.style.getPropertyValue("opacity"), "");
  dom.observers[1].callback([{ isIntersecting: true }]);
  dom.runFrame(1);
  assert.equal(dom.card.style.getPropertyValue("opacity"), "0");
  t.mock.method(Matter.Engine, "update", () => { throw new Error("engine failed"); });
  dom.runFrame(100);
  assertStaticCards(dom);
  assert.equal(dom.frames.size, 0);
  assert.ok(dom.observers.every((observer) => observer.disconnected));
  dispose();
});

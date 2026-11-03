import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { focusPageAnchor, initPageAnchors } from "../src/scripts/page-anchors.ts";
import { AnchorStub, ElementStub, eventWith, installDOM } from "./helpers/dom.mjs";

const legacyIds = ["section01", "section02", "section03", "section04"];

test("既存の全ページ内URLが生成HTMLと両方のナビに残る", () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  for (const id of legacyIds) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, "g"))].length, 1);
    assert.equal([...html.matchAll(new RegExp(`href="#${id}"`, "g"))].length, 2);
  }
});

for (const id of legacyIds) {
  test(`直接アクセスした#${id}にフォーカスし、スクロールはブラウザーに任せる`, (t) => {
    const dom = installDOM(t, { href: `http://localhost:4321/?source=test#${id}` });
    const target = new ElementStub();
    dom.targets.set(id, target);
    const dispose = initPageAnchors();
    assert.deepEqual(target.focusOptions, { preventScroll: true });
    assert.equal(target.getAttribute("tabindex"), "-1");
    assert.equal(dom.location.href, `http://localhost:4321/?source=test#${id}`);
    target.dispatchEvent(new Event("blur"));
    assert.equal(target.hasAttribute("tabindex"), false);
    dispose();
  });
}

test("目次・フッター・同じhashの再選択を処理し、既定動作を妨げない", (t) => {
  const dom = installDOM(t, { href: "http://localhost:4321/?source=test#section02" });
  const target = new ElementStub();
  dom.targets.set("section02", target);
  const dispose = initPageAnchors();
  const link = new AnchorStub(dom.location.href);
  const child = new ElementStub();
  child.parentElement = link;
  const event = eventWith("click", { target: child, button: 0 });
  dom.document.dispatchEvent(event);
  assert.equal(target.focusCount, 2);
  assert.equal(event.defaultPrevented, false);
  assert.equal(dom.location.search, "?source=test");
  dispose();
});

test("戻る・進むによるhashchangeでフォーカスを同期する", (t) => {
  const dom = installDOM(t);
  const targets = legacyIds.map((id) => { const target = new ElementStub(); dom.targets.set(id, target); return target; });
  const dispose = initPageAnchors();
  for (const index of [0, 3, 0, 3]) {
    dom.location.hash = `#${legacyIds[index]}`;
    dom.window.dispatchEvent(new Event("hashchange"));
    assert.deepEqual(targets[index].focusOptions, { preventScroll: true });
  }
  assert.equal(targets[0].focusCount, 2);
  assert.equal(targets[3].focusCount, 2);
  dispose();
});

test("初回ロード中はブラウザーのfragment移動を待ってからフォーカスする", (t) => {
  const dom = installDOM(t, { href: "http://localhost:4321/#section03" });
  dom.document.readyState = "interactive";
  const target = new ElementStub();
  dom.targets.set("section03", target);
  const dispose = initPageAnchors();
  assert.equal(target.focusCount, undefined);
  dom.window.dispatchEvent(new Event("load"));
  assert.equal(target.focusCount, 1);
  assert.deepEqual(target.focusOptions, { preventScroll: true });
  dispose();
});

test("修飾キー・別タブ・外部URL・download・キャンセル済みは変更しない", (t) => {
  const dom = installDOM(t);
  const target = new ElementStub();
  dom.targets.set("section02", target);
  const dispose = initPageAnchors();
  const link = new AnchorStub("http://localhost:4321/#section02");
  for (const modifier of ["metaKey", "ctrlKey", "shiftKey", "altKey"]) {
    dom.document.dispatchEvent(eventWith("click", { target: link, button: 0, [modifier]: true }));
  }
  dom.document.dispatchEvent(eventWith("click", { target: link, button: 1 }));
  const cancelled = eventWith("click", { target: link, button: 0 });
  cancelled.preventDefault();
  dom.document.dispatchEvent(cancelled);
  for (const [href, windowTarget] of [[link.href, "_blank"], ["https://example.com/#section02", ""], ["http://localhost:4321/other#section02", ""], ["http://localhost:4321/?other#section02", ""]]) {
    dom.document.dispatchEvent(eventWith("click", { target: new AnchorStub(href, windowTarget), button: 0 }));
  }
  link.setAttribute("download", "");
  dom.document.dispatchEvent(eventWith("click", { target: link, button: 0 }));
  assert.equal(target.focusCount, undefined);
  dispose();
});

test("不正・不明なhashで例外を出さず、既存のtabindexを維持する", (t) => {
  const dom = installDOM(t);
  for (const hash of ["", "#", "#missing", "#%E0%A4%A", "#a[b]"]) assert.doesNotThrow(() => focusPageAnchor(hash));
  const target = new ElementStub();
  target.setAttribute("tabindex", "0");
  dom.targets.set("section02", target);
  focusPageAnchor("#section%30%32");
  target.dispatchEvent(new Event("blur"));
  assert.equal(target.getAttribute("tabindex"), "0");
});

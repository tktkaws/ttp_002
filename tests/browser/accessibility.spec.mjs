import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

async function ready(page) {
  await page.goto("/");
  await expect(page.locator("#fixed-nav")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
}

async function visibleFocus(_page, element) {
  await expect(element).toBeFocused();
  await expect(element).toBeInViewport({ ratio: 0.9 });
  const focus = await element.evaluate((target) => {
    const style = getComputedStyle(target),
      rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      outline: parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      hit: target === hit || target.contains(hit),
    };
  });
  expect(focus.outline).toBeGreaterThan(0);
  expect(focus.style).not.toBe("none");
  expect(focus.hit).toBe(true);
}

for (const theme of ["light", "dark"]) {
  test(`キーボード: Tab・Space・Enter・Escape・Shift+Tab (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    await ready(page);
    const animation = page
      .locator("[data-preference-item]")
      .nth(0)
      .locator("summary");
    const appearance = page
      .locator("[data-preference-item]")
      .nth(1)
      .locator("summary");
    const contents = page.locator("[data-contents-item] summary");
    await page.keyboard.press("Tab");
    await visibleFocus(page, animation);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.getByRole("button", { name: "Off", exact: true }),
    );
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.getByRole("button", { name: "On", exact: true }),
    );
    await page.keyboard.press("Space");
    await expect(page.locator("html")).toHaveAttribute("data-animation", "on");
    await visibleFocus(page, animation);
    await page.keyboard.press("Tab");
    await visibleFocus(page, appearance);
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.getByRole("button", { name: "Light", exact: true }),
    );
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.getByRole("button", { name: "Dark", exact: true }),
    );
    await page.keyboard.press("Enter");
    await visibleFocus(page, appearance);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.keyboard.press("Shift+Tab");
    await visibleFocus(page, animation);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await visibleFocus(page, contents);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await visibleFocus(page, contents);
    await expect(page.locator("[data-contents-item]")).not.toHaveAttribute(
      "open",
    );
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.locator('#contents-options a[href="#section01"]'),
    );
    await page.keyboard.press("Tab");
    await visibleFocus(
      page,
      page.locator('#contents-options a[href="#section02"]'),
    );
    const hashChanged = page.evaluate(
      () =>
        new Promise((resolve) =>
          window.addEventListener("hashchange", () => resolve(), {
            once: true,
          }),
        ),
    );
    await page.keyboard.press("Enter");
    await hashChanged;
    await expect(page.locator("#section02")).toBeFocused();
    await expect(page).toHaveURL(/#section02$/);
    await page.keyboard.press("Tab");
    await visibleFocus(page, page.locator("main a").first());
    for (const link of (await page.locator("main a").all()).slice(1)) {
      await page.keyboard.press("Tab");
      await visibleFocus(page, link);
    }
    await page.keyboard.press("Tab");
    await visibleFocus(page, page.locator("footer nav a").first());
  });
}

test("キーボード: 固定ナビのフォーカスをスクロールで隠さない", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("PageDown");
  await visibleFocus(page, page.locator("#fixed-nav summary").first());
});

test("支援技術向け情報: 見出し・ランドマーク・一覧・名称・状態", async ({
  page,
}, testInfo) => {
  await ready(page);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("navigation")).toHaveCount(2);
  await expect(
    page.getByRole("navigation", {
      name: "表示設定とページ内ナビゲーション",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("navigation", {
      name: "フッターナビゲーション",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "タカハシ タカユキ のポートフォリオ",
  );
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(4);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(14);
  await expect(page.locator("#section02").getByRole("listitem")).toHaveCount(6);
  await expect(page.locator("#section03").getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("list", { name: "成果物一覧" }).getByRole("listitem"),
  ).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveCount(1);
  const snapshot = await page.locator("body").ariaSnapshot();
  expect(snapshot).not.toContain("[01]");
  const titles = ["自己紹介", "技術", "強み", "成果物"];
  let previous = -1;
  for (const title of titles) {
    const index = snapshot.indexOf(`heading "${title}" [level=2]`);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
  const contents = page.locator("[data-contents-item] summary");
  // Playwright's ARIA snapshot omits Chrome's native DisclosureTriangle role.
  // Read the browser accessibility tree directly for summary names and states.
  const session = await page.context().newCDPSession(page);
  const disclosure = async (name) => {
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    const node = nodes.find(
      (node) =>
        !node.ignored &&
        node.role?.value === "DisclosureTriangle" &&
        node.name?.value === name,
    );
    expect(node).toBeDefined();
    return Object.fromEntries(
      node.properties.map(({ name, value }) => [name, value.value]),
    );
  };
  expect(await disclosure("Contents")).toMatchObject({
    expanded: false,
    focusable: true,
  });
  await contents.focus();
  await contents.press("Enter");
  expect(await disclosure("Contents")).toMatchObject({ expanded: true });
  await page.keyboard.press("Escape");
  expect(await disclosure("Contents")).toMatchObject({ expanded: false });
  const appearance = page
    .locator("[data-preference-item] summary")
    .filter({ hasText: "Theme:" });
  await appearance.focus();
  await appearance.press("Enter");
  await expect(
    page.getByRole("button", { name: "Light", exact: true }),
  ).toMatchAriaSnapshot('- button "Light" [pressed]');
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  expect(await disclosure("Theme: Dark")).toMatchObject({ expanded: false });
  const { nodes } = await session.send("Accessibility.getFullAXTree");
  await testInfo.attach("native-disclosures", {
    body: JSON.stringify(
      nodes.filter((node) => node.role?.value === "DisclosureTriangle"),
      null,
      2,
    ),
    contentType: "application/json",
  });
  await session.detach();
  await testInfo.attach("accessibility-tree", {
    body: snapshot,
    contentType: "text/plain",
  });
  await testInfo.attach("settings-tree", {
    body: await page.locator("#fixed-nav").ariaSnapshot(),
    contentType: "text/plain",
  });
});

async function checkLayout(page, testInfo, description) {
  const metrics = await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll("h1, h2, h3, main p, a, summary, button"),
    ];
    const outside = [];
    for (const element of elements) {
      if (!element.getClientRects().length) continue;
      const range = document.createRange();
      range.selectNodeContents(element);
      if (
        [...range.getClientRects()].some(
          (rect) =>
            rect.width && (rect.left < -1 || rect.right > innerWidth + 1),
        )
      ) {
        outside.push(element.textContent.trim().slice(0, 80));
      }
    }
    return {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fontSize: getComputedStyle(document.documentElement).fontSize,
      outside,
    };
  });
  await testInfo.attach(description, {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.outside).toEqual([]);
}

for (const theme of ["light", "dark"]) {
  for (const width of [320, 768, 1280, 1536]) {
    test(`リフロー: ${width}px (${theme})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      await ready(page);
      await checkLayout(page, testInfo, "layout");
      const contents = page.locator("[data-contents-item] summary");
      await contents.focus();
      await contents.press("Enter");
      await checkLayout(page, testInfo, "expanded-layout");
      await testInfo.attach("layout-image", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });
  }
  for (const width of [320, 1280]) {
    test(`文字200%相当: root font-size変更・${width}px (${theme})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      await ready(page);
      const before = await page
        .locator("main p")
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });
      const after = await page
        .locator("main p")
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(after / before).toBeCloseTo(2, 1);
      await checkLayout(page, testInfo, "text-200-percent");
      for (const summary of await page.locator("#fixed-nav summary").all()) {
        await summary.focus();
        await summary.press("Enter");
        await checkLayout(
          page,
          testInfo,
          `text-200-percent-${await summary.textContent()}`,
        );
        await page.keyboard.press("Escape");
      }
      await testInfo.attach("enlarged-text", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });
  }
  test(`400%ズーム相当: 320×225 CSS px (${theme})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 225 });
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    await ready(page);
    await checkLayout(page, testInfo, "reflow-400-percent-equivalent");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    for (const id of ["section01", "section02", "section03", "section04"]) {
      await page.keyboard.press("Tab");
      await visibleFocus(
        page,
        page.locator(`#contents-options a[href="#${id}"]`),
      );
    }
    await testInfo.attach("small-viewport", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await page.locator("[data-contents-item] summary").click();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 80);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
    await expect(page.locator("[data-contents-item]")).toHaveAttribute("open");
  });
  test(`文字間隔の上書き: 320px (${theme})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    await ready(page);
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }",
    });
    await checkLayout(page, testInfo, "text-spacing");
    for (const summary of await page.locator("#fixed-nav summary").all()) {
      await summary.focus();
      await summary.press("Enter");
      await checkLayout(
        page,
        testInfo,
        `text-spacing-${await summary.textContent()}`,
      );
      await page.keyboard.press("Escape");
    }
  });
}

async function monitorMotion(page) {
  await page.addInitScript(() => {
    window.__motionCalls = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      window.__motionCalls.push({ tag: this.tagName, time: performance.now() });
      return animate.apply(this, args);
    };
  });
}

for (const animation of ["off", "on"]) {
  for (const reducedMotion of ["reduce", "no-preference"]) {
    test(`モーション: Animation ${animation}・OS ${reducedMotion}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion });
      await monitorMotion(page);
      await page.addInitScript(
        (value) => localStorage.setItem("animation", value),
        animation,
      );
      await ready(page);
      await page.waitForLoadState("networkidle");
      const enabled = animation === "on" && reducedMotion === "no-preference";
      await expect(page.locator("falling-text-cards")).toHaveAttribute(
        "data-active",
        String(enabled),
      );
      const result = await page.evaluate(() => ({
        calls: window.__motionCalls.length,
        running: document
          .getAnimations()
          .filter((item) => item.playState === "running").length,
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
      }));
      expect(result.scrollBehavior).toBe(enabled ? "smooth" : "auto");
      if (enabled) expect(result.calls).toBeGreaterThan(0);
      else {
        expect(result.calls).toBe(0);
        expect(result.running).toBe(0);
      }
      await testInfo.attach("motion", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });
    });
  }
}

test("モーション: 表示途中のOS reduce変更で停止し、戻すと再び有効になる", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await monitorMotion(page);
  await page.addInitScript(() => localStorage.setItem("animation", "on"));
  await ready(page);
  await expect
    .poll(() => page.evaluate(() => window.__motionCalls.length))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("falling-text-cards")).toHaveAttribute(
    "data-active",
    "false",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((item) => item.playState === "running").length,
      ),
    )
    .toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("falling-text-cards")).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("モーション: 落下中にOffを選ぶと変形と非表示を解除する", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("animation", "on"));
  await ready(page);
  await page.locator("[data-card]").first().scrollIntoViewIfNeeded();
  await expect(page.locator("falling-text-cards")).toHaveAttribute(
    "data-state",
    "falling",
  );
  const summary = page
    .locator("[data-preference-item] summary")
    .filter({ hasText: "Animation:" });
  await summary.focus();
  await summary.press("Enter");
  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect(page.locator("falling-text-cards")).toHaveAttribute(
    "data-active",
    "false",
  );
  const cards = await page.locator("[data-card]").evaluateAll((elements) =>
    elements.map((element) => ({
      opacity: getComputedStyle(element).opacity,
      transform: getComputedStyle(element).transform,
    })),
  );
  expect(cards).toEqual(
    Array.from({ length: 6 }, () => ({ opacity: "1", transform: "none" })),
  );
});

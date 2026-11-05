import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

async function layout(page) {
  return page.evaluate(() => {
    const root = document.querySelector("falling-text-cards");
    return {
      padding: getComputedStyle(root.querySelector(".grid")).paddingTop,
      boxes: [
        ...root.querySelectorAll(".grid, article, .link"),
        document.querySelector("footer"),
      ].map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x: x + scrollX, y: y + scrollY, width, height };
      }),
    };
  });
}

for (const width of [320, 768, 1280, 1536]) {
  test(`落下前のカードを隠し、読み込みと落下でレイアウトを動かさない: ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => localStorage.setItem("animation", "on"));
    let release;
    const scriptsReady = new Promise((resolve) => (release = resolve));
    await page.route("**/_astro/*.js", async (route) => {
      await scriptsReady;
      await route.continue();
    });
    await page.goto("/#section04", { waitUntil: "commit" });
    try {
      const root = page.locator("falling-text-cards");
      await expect(root).toHaveAttribute("data-state", "pending");
      for (const card of await root.locator("[data-card]").all()) {
        await expect(card).toHaveCSS("opacity", "0");
      }
      const before = await layout(page);
      expect(parseFloat(before.padding)).toBeGreaterThan(0);
      // Sample actual rendered frames, including the first frame of the drop.
      await page.evaluate(() => {
        window.__cardFrames = [];
        const sample = () => {
          const root = document.querySelector("falling-text-cards");
          const state = root.dataset.state;
          window.__cardFrames.push({
            state,
            opacity: [...root.querySelectorAll("[data-card]")].map(
              (card) => getComputedStyle(card).opacity,
            ),
          });
          if (state !== "settled") requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.waitForFunction(() => window.__cardFrames.length >= 3);
      release();
      await expect(root).toHaveAttribute("data-active", "true");
      expect(await layout(page)).toEqual(before);
      await expect(root).toHaveAttribute("data-state", "settled", {
        timeout: 10_000,
      });
      expect(await layout(page)).toEqual(before);
      const frames = await page.evaluate(() => window.__cardFrames);
      for (const frame of frames.filter(({ state }) =>
        ["pending", "loading", "waiting"].includes(state),
      )) {
        expect(frame.opacity).toEqual(Array(6).fill("0"));
      }
      const firstDrop = frames.find(({ state }) => state === "falling");
      expect(firstDrop).toBeDefined();
      expect(firstDrop.opacity.slice(1)).toEqual(Array(5).fill("0"));
      for (const card of await root.locator("[data-card]").all()) {
        await expect(card).toHaveCSS("opacity", "1");
      }
      await testInfo.attach("cards-layout-and-frames", {
        body: JSON.stringify({ before, frames }, null, 2),
        contentType: "application/json",
      });
    } finally {
      release();
    }
  });
}

test("エントリーモジュールが失敗しても余白を維持し、カードを静的表示する", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("animation", "on"));
  await page.route("**/_astro/*.js", (route) => route.abort());
  await page.goto("/#section04");
  const root = page.locator("falling-text-cards");
  await expect(root).toHaveAttribute("data-state", "static");
  expect(parseFloat((await layout(page)).padding)).toBeGreaterThan(0);
  for (const card of await root.locator("[data-card]").all()) {
    await expect(card).toHaveCSS("opacity", "1");
  }
});

for (const mode of ["off", "reduce"]) {
  test(`アニメーション無効時はカードを初めから表示する: ${mode}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (mode) =>
        localStorage.setItem("animation", mode === "off" ? "off" : "on"),
      mode,
    );
    await page.emulateMedia({
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
    });
    await page.goto("/#section04");
    const root = page.locator("falling-text-cards");
    await expect(root).toHaveAttribute("data-active", "false");
    expect((await layout(page)).padding).toBe("0px");
    for (const card of await root.locator("[data-card]").all()) {
      await expect(card).toHaveCSS("opacity", "1");
    }
  });
}

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

async function layers(page) {
  return page.evaluate(() => {
    const ink = getComputedStyle(document.body).color;
    return [
      ...document.querySelectorAll("[data-logo-char], [data-heading-reveal]"),
    ].map((element) => {
      const base = getComputedStyle(element);
      const overlay = getComputedStyle(element, "::after");
      const { x, y, width, height } = element.getBoundingClientRect();
      return {
        ink,
        base: base.color,
        overlay: overlay.color,
        clip: overlay.clipPath,
        opacity: overlay.opacity,
        box: { x, y, width, height },
      };
    });
  });
}

for (const theme of ["light", "dark"]) {
  for (const width of [320, 1280]) {
    test(`グレーの見出しを本文色で覆い、位置と寸法を維持する: ${theme}・${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript((theme) => {
        localStorage.setItem("theme", theme);
        localStorage.setItem("animation", "on");
      }, theme);
      let release;
      const scriptsReady = new Promise((resolve) => (release = resolve));
      await page.route("**/_astro/*.js", async (route) => {
        await scriptsReady;
        await route.continue();
      });
      await page.goto("/", { waitUntil: "commit" });
      try {
        const logo = page.locator("[data-logo-random-reveal]");
        await expect(logo).toBeVisible();
        await expect(page.locator("body")).toHaveCSS("position", "relative");
        const before = await layers(page);
        for (const layer of before) {
          expect(layer.base).not.toBe(layer.ink);
          expect(layer.overlay).toBe(layer.ink);
          expect(layer.clip).toBe("inset(0px 100% 0px 0px)");
        }
        release();
        await expect(logo).toHaveAttribute("data-revealed", "true");
        await expect(page.locator("h2").first()).toHaveAttribute(
          "data-revealed",
          "true",
        );
        await page.evaluate(() => {
          window.__headingAnimations = document
            .getAnimations()
            .filter(
              (animation) => animation.effect?.pseudoElement === "::after",
            );
          for (const animation of window.__headingAnimations) {
            animation.pause();
            animation.currentTime = 0;
          }
        });
        const start = await layers(page);
        expect(start.map(({ box }) => box)).toEqual(
          before.map(({ box }) => box),
        );
        expect(start[0].opacity).toBe("0");
        await testInfo.attach("gray-headings", {
          body: await page.screenshot(),
          contentType: "image/png",
        });
        await page.evaluate(() => {
          for (const animation of window.__headingAnimations) {
            const timing = animation.effect.getTiming();
            animation.currentTime = timing.delay + Number(timing.duration);
          }
        });
        const after = await layers(page);
        expect(after.map(({ box }) => box)).toEqual(
          before.map(({ box }) => box),
        );
        expect(after[0].opacity).toBe("1");
        expect(after[16].clip).toBe("none");
        await expect(
          page.getByRole("heading", { level: 1 }),
        ).toHaveAccessibleName("タカハシ タカユキ のポートフォリオ");
        await expect(
          page.getByRole("heading", { name: "自己紹介", exact: true }),
        ).toHaveCount(1);
        await testInfo.attach("revealed-headings", {
          body: await page.screenshot(),
          contentType: "image/png",
        });
      } finally {
        release();
      }
    });
  }
}

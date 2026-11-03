import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  // Keep assertions independent of third-party font and screenshot services.
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

async function expectPreferences(page, theme, animation) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("html")).toHaveAttribute(
    "data-animation",
    animation,
  );
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
    "content",
    theme,
  );
  await expect(page.locator("#fixed-nav")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator("[data-theme-label]")).toHaveText(
    theme === "dark" ? "Dark" : "Light",
  );
  await expect(page.locator("[data-animation-label]")).toHaveText(
    animation === "on" ? "On" : "Off",
  );
  expect(
    await page
      .locator("html")
      .evaluate((root) => root.classList.contains("dark")),
  ).toBe(theme === "dark");
  expect(
    await page
      .locator("html")
      .evaluate((root) => getComputedStyle(root).colorScheme),
  ).toBe(theme);
}

async function choose(page, kind, label) {
  const summary = page.locator("#fixed-nav summary").filter({ hasText: kind });
  await summary.focus();
  await summary.press("Enter");
  await page.getByRole("button", { name: label, exact: true }).click();
}

async function expectAnchor(page, id) {
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe(id);
  await expect
    .poll(() =>
      page.locator(`#${id}`).evaluate((target) => {
        const margin = parseFloat(
          getComputedStyle(target).scrollMarginBlockStart,
        );
        return Math.abs(target.getBoundingClientRect().top - margin);
      }),
    )
    .toBeLessThan(3);
}

async function contentsLink(page, id) {
  const summary = page
    .locator("#fixed-nav summary")
    .filter({ hasText: "Contents" });
  await summary.focus();
  await summary.press("Enter");
  await page.locator(`#contents-options a[href="#${id}"]`).click();
}

for (const theme of ["light", "dark"]) {
  for (const animation of ["off", "on"]) {
    test(`初回描画とCSS遅延: ${theme}/${animation}`, async ({
      page,
      browser,
    }, testInfo) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        ({ theme, animation }) => {
          localStorage.setItem("theme", theme);
          localStorage.setItem("animation", animation);
          window.__themeFrames = [];
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          function sample(time) {
            const root = document.documentElement;
            if (root && document.body) {
              const style = getComputedStyle(root);
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = style.backgroundColor;
              context.fillRect(0, 0, 1, 1);
              const pixel = [...context.getImageData(0, 0, 1, 1).data];
              window.__themeFrames.push({
                time,
                theme: root.dataset.theme,
                dark: root.classList.contains("dark"),
                scheme: style.colorScheme,
                background: style.backgroundColor,
                pixel,
              });
            }
            if (window.__themeFrames.length < 180)
              requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        },
        { theme, animation },
      );
      await page.route("**/_astro/*.css", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });
      await page.goto("/", { waitUntil: "commit" });
      await page.waitForFunction(
        (theme) => document.documentElement?.dataset.theme === theme,
        theme,
      );
      await page.waitForFunction(() => {
        const paint = performance.getEntriesByName("first-contentful-paint")[0];
        return (
          paint &&
          window.__themeFrames.filter((frame) => frame.time >= paint.startTime)
            .length >= 3
        );
      });
      await expectPreferences(page, theme, animation);
      const evidence = await page.evaluate(() => ({
        firstContentfulPaint: performance.getEntriesByName(
          "first-contentful-paint",
        )[0]?.startTime,
        frames: window.__themeFrames,
      }));
      evidence.browser = browser.version();
      await testInfo.attach("paint-samples", {
        body: JSON.stringify(evidence, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach("initial-theme", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      expect(evidence.frames.length).toBeGreaterThan(2);
      for (const frame of evidence.frames) {
        expect(frame.theme).toBe(theme);
        expect(frame.dark).toBe(theme === "dark");
        expect(frame.scheme).toBe(theme);
        const brightness =
          (frame.pixel[0] + frame.pixel[1] + frame.pixel[2]) / 3;
        if (theme === "dark") expect(brightness).toBeLessThan(80);
        else expect(brightness).toBeGreaterThan(200);
        expect(frame.pixel[3]).toBe(255);
      }
      expect(errors).toEqual([]);
    });
  }
}

test("UIで変更したテーマと動きの設定を再読み込みで復元する", async ({
  page,
}) => {
  await page.goto("/");
  await expectPreferences(page, "light", "off");
  await choose(page, "Theme:", "Dark");
  await choose(page, "Animation:", "On");
  await expectPreferences(page, "dark", "on");
  expect(
    await page.evaluate(() => ({
      theme: localStorage.getItem("theme"),
      animation: localStorage.getItem("animation"),
    })),
  ).toEqual({ theme: "dark", animation: "on" });
  await page.reload();
  await expectPreferences(page, "dark", "on");
  await choose(page, "Theme:", "Light");
  await choose(page, "Animation:", "Off");
  await page.reload();
  await expectPreferences(page, "light", "off");
});

test("不正な保存値を既定値へ戻す", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "invalid");
    localStorage.setItem("animation", "invalid");
  });
  await page.goto("/");
  await expectPreferences(page, "light", "off");
});

test("ストレージを利用できなくても設定操作と本文を使える", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expectPreferences(page, "light", "off");
  await choose(page, "Theme:", "Dark");
  await choose(page, "Animation:", "On");
  await expectPreferences(page, "dark", "on");
  await expect(page.locator("main")).toBeVisible();
  await page.reload();
  await expectPreferences(page, "light", "off");
});

test("別タブの設定変更と削除を表示へ反映する", async ({ page, context }) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/");
  await choose(page, "Theme:", "Dark");
  await choose(page, "Animation:", "On");
  await expectPreferences(other, "dark", "on");
  await page.evaluate(() => localStorage.clear());
  await expectPreferences(other, "light", "off");
});

for (const id of ["section01", "section02", "section03", "section04"]) {
  test(`既存URLへ直接アクセス: #${id}`, async ({ page }) => {
    await page.goto(`/?source=regression#${id}`);
    await expectAnchor(page, id);
    expect(new URL(page.url()).search).toBe("?source=regression");
  });
}

test("目次で移動し、戻る・進むでURL・位置・フォーカスを復元する", async ({
  page,
}) => {
  await page.goto("/?source=regression#section01");
  await expectAnchor(page, "section01");
  await contentsLink(page, "section02");
  await expectAnchor(page, "section02");
  await contentsLink(page, "section04");
  await expectAnchor(page, "section04");
  await page.goBack();
  await expectAnchor(page, "section02");
  await page.goForward();
  await expectAnchor(page, "section04");
  expect(new URL(page.url()).search).toBe("?source=regression");
});

test("フッターと同じhashの再選択で目的の位置へ移動する", async ({ page }) => {
  await page.goto("/?source=regression#section01");
  const link = page.locator('footer a[href="#section03"]');
  await link.click();
  await expectAnchor(page, "section03");
  await link.click();
  await expectAnchor(page, "section03");
  expect(new URL(page.url()).search).toBe("?source=regression");
});

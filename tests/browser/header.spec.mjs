import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

async function headerLayout(page) {
  return page.evaluate(() =>
    ["header", "header h1", "main", "[data-menu-button]"].map((selector) => {
      const { x, y, width, height } = document
        .querySelector(selector)
        .getBoundingClientRect();
      return { selector, x, y, width, height };
    }),
  );
}

for (const width of [320, 1280]) {
  test(`JSの遅延とメニュー開閉でheaderと本文が動かない: ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let release;
    const scriptsReady = new Promise((resolve) => (release = resolve));
    await page.route("**/_astro/*.js", async (route) => {
      await scriptsReady;
      await route.continue();
    });
    await page.goto("/", { waitUntil: "commit" });
    try {
      const header = page.getByRole("banner");
      await expect(header).toHaveCount(1);
      await expect(header.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(header.getByRole("navigation")).toHaveCount(1);
      const button = header.locator("[data-menu-button]");
      await expect(button).toBeVisible();
      await expect(header.locator("nav")).toHaveCSS("position", "fixed");
      await expect(header.locator("nav")).not.toHaveAttribute("data-enhanced");
      const before = await headerLayout(page);
      release();
      await expect(header.locator("nav")).toHaveAttribute(
        "data-enhanced",
        "true",
      );
      expect(await headerLayout(page)).toEqual(before);
      await button.click();
      await expect(page.locator("#fixed-nav-popover")).toBeVisible();
      expect(await headerLayout(page)).toEqual(before);
      await page.keyboard.press("Escape");
      await expect(page.locator("#fixed-nav-popover")).not.toBeVisible();
      expect(await headerLayout(page)).toEqual(before);
      await testInfo.attach("header-layout", {
        body: JSON.stringify(before, null, 2),
        contentType: "application/json",
      });
    } finally {
      release();
    }
  });

  for (const failure of ["no-js", "blocked-js"]) {
    test(`JSを利用できなくても目次を開ける: ${failure}・${width}px`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled: failure !== "no-js",
        viewport: { width, height: 900 },
      });
      try {
        await context.route("**/*", (route) => {
          const request = route.request();
          return new URL(request.url()).origin !== new URL(baseURL).origin ||
            request.resourceType() === "script"
            ? route.abort()
            : route.continue();
        });
        const page = await context.newPage();
        await page.goto("/");
        await page
          .getByRole("button", { name: "メニュー", exact: true })
          .click();
        const panel = page.locator("#fixed-nav-popover");
        await expect(panel).toBeVisible();
        await expect(panel.getByRole("link")).toHaveCount(4);
        for (const item of await panel
          .locator("[data-preference-item]")
          .all()) {
          await expect(item).toBeHidden();
        }
        await panel.locator('a[href="#section02"]').click();
        await expect(page).toHaveURL(/#section02$/);
        await page.keyboard.press("Escape");
        await expect(panel).not.toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
}

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
});

for (const width of [320, 768, 1280]) {
  test(`右端中央の目次とスクロールで流れる設定: ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const button = page.locator("[data-menu-button]");
    const panel = page.locator("#fixed-nav-popover");
    const preferences = page.locator("[data-preference-controls]");
    await expect(button).toHaveAccessibleName("コンテンツメニュー");
    await expect(panel).not.toBeVisible();
    await expect(page.locator("[data-section-line]")).toHaveCount(4);
    const buttonRect = await button.boundingBox();
    expect(buttonRect.y + buttonRect.height / 2).toBeCloseTo(450, 0);
    expect(buttonRect.x + buttonRect.width).toBe(width);
    const settingsRect = await preferences.boundingBox();
    const headingRect = await page.locator("header h1").boundingBox();
    expect(settingsRect.x + settingsRect.width).toBeLessThanOrEqual(width);
    if (width < 600) {
      const headerRect = await page.locator("body > header").boundingBox();
      expect(settingsRect.y).toBeGreaterThanOrEqual(
        headingRect.y + headingRect.height,
      );
      expect(settingsRect.x).toBeCloseTo(headerRect.x, 0);
    } else {
      expect(settingsRect.y).toBeLessThanOrEqual(headingRect.y);
      expect(
        settingsRect.x >= headingRect.x + headingRect.width - 1 ||
          settingsRect.y + settingsRect.height <= headingRect.y,
      ).toBe(true);
    }

    await button.focus();
    await button.press("Enter");
    await expect(panel).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const panelRect = await panel.boundingBox();
    expect(panelRect.x).toBeGreaterThanOrEqual(0);
    expect(panelRect.x + panelRect.width).toBeLessThanOrEqual(buttonRect.x);
    expect(panelRect.y + panelRect.height / 2).toBeCloseTo(450, 0);
    await testInfo.attach("contents-open", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(button).toBeFocused();
    await button.press("Space");
    await expect(panel).toBeVisible();
    await page.mouse.click(5, 700);
    await expect(panel).not.toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(preferences).not.toBeInViewport();
    expect((await button.boundingBox()).y).toBe(buttonRect.y);
  });
}

test("ホバーで開き、パネルへ移動でき、離脱・Escapeで閉じられる", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.locator("[data-menu-button]");
  const panel = page.locator("#fixed-nav-popover");
  await button.hover();
  await expect(panel).toBeVisible();
  await panel.getByRole("link").first().hover();
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(panel).not.toBeVisible();
  await button.hover();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await page.mouse.move(0, 0);
  await button.click();
  await page.mouse.move(0, 0);
  await expect(panel).toBeVisible();
  await button.click();
  await expect(panel).not.toBeVisible();
});

test("タッチで開閉してセクションへ移動できる", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === new URL(baseURL).origin
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    await page.goto("/");
    const button = page.locator("[data-menu-button]");
    const panel = page.locator("#fixed-nav-popover");
    await button.tap();
    await expect(panel).toBeVisible();
    await button.tap();
    await expect(panel).not.toBeVisible();
    await button.tap();
    await panel.getByRole("link", { name: "強み" }).tap();
    await expect(panel).not.toBeVisible();
    await expect(page).toHaveURL(/#section03$/);
    await expect(
      page.locator('[data-section-line="#section03"]'),
    ).toHaveAttribute("data-current", "");
  } finally {
    await context.close();
  }
});

for (const theme of ["light", "dark"]) {
  test(`スクロール・直接リンク・履歴で現在位置を更新: ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    await page.goto("/#section02");
    for (const id of ["section02", "section03", "section04", "section01"]) {
      await page
        .locator(`#${id}`)
        .evaluate((element) => element.scrollIntoView());
      const current = page.locator(`[data-section-line="#${id}"]`);
      await expect(current).toHaveAttribute("data-current", "");
      await expect(
        page.locator("[data-section-line][data-current]"),
      ).toHaveCount(1);
      await expect(
        page.locator(`#contents-options a[href="#${id}"]`),
      ).toHaveAttribute("aria-current", "location");
      await expect(current).toHaveCSS("height", "4px");
      await expect(current).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
      );
    }
    await page
      .locator("#section02")
      .evaluate((element) => element.scrollIntoView());
    await page.locator("[data-menu-button]").focus();
    await page.keyboard.press("Enter");
    await page
      .locator("#contents-options")
      .getByRole("link", { name: "強み", exact: true })
      .click();
    await page.goBack();
    await expect(
      page.locator('[data-section-line="#section02"]'),
    ).toHaveAttribute("data-current", "");
    await page.locator("[data-menu-button]").focus();
    await page.keyboard.press("Enter");
    await testInfo.attach("theme-menu", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
}

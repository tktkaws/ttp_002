import { test, expect } from "@playwright/test";

for (const width of [320, 1280]) {
  test(`メニューボタンとpopover: ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const button = page.locator("[data-menu-button]");
    const panel = page.locator("#fixed-nav-popover");
    await expect(button).toHaveText("メニュー");
    await expect(panel).not.toBeVisible();
    await button.focus();
    await button.press("Enter");
    await expect(button).toHaveText("閉じる");
    await expect(panel).toBeVisible();
    const buttonRect = await button.boundingBox();
    const panelRect = await panel.boundingBox();
    expect(panelRect.y).toBeGreaterThanOrEqual(
      buttonRect.y + buttonRect.height,
    );
    expect(panelRect.x).toBeGreaterThanOrEqual(0);
    expect(panelRect.x + panelRect.width).toBeLessThanOrEqual(width);
    await expect(page.locator("#fixed-nav .fixed-nav__title")).toHaveText([
      "アニメーション",
      "テーマ",
      "コンテンツ",
    ]);
    await expect(
      page.locator("#fixed-nav details, #fixed-nav summary"),
    ).toHaveCount(0);
    for (const item of await page.locator(".fixed-nav__item").all()) {
      await expect(item).toBeVisible();
    }
    for (const group of await page.locator(".fixed-nav__panel").all()) {
      await expect(group).toBeVisible();
      expect(
        await group.evaluate(
          (element) => getComputedStyle(element).borderWidth,
        ),
      ).toBe("0px");
    }
    await page.getByRole("button", { name: "オン", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-animation", "on");
    for (const item of await page.locator(".fixed-nav__item").all()) {
      await expect(item).toBeVisible();
    }
    await page.getByRole("button", { name: "オフ", exact: true }).click();
    await testInfo.attach("menu-open", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await button.click();
    await expect(panel).not.toBeVisible();
    await page.mouse.move(0, 0);
    await button.hover();
    // Keep hovering beyond the former 150ms opening delay.
    await page.waitForTimeout(300);
    await expect(panel).not.toBeVisible();
    await expect(button).toHaveText("メニュー");
    await button.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(button).toBeFocused();
    await button.press("Space");
    await expect(panel).toBeVisible();
    await page.mouse.click(5, 700);
    await expect(panel).not.toBeVisible();
    await button.click();
    await expect(panel).toBeVisible();
    await button.click();
    await expect(panel).not.toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(button).toBeInViewport();
    expect((await button.boundingBox()).y).toBe(buttonRect.y);
  });
}

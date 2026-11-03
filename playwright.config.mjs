import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORTFOLIO_TEST_PORT ?? 4357);

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 20_000,
  outputDir: "test-results/browser",
  reporter: [["list"], ["json", { outputFile: "test-results/browser-results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/browser/serve.mjs",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { PORTFOLIO_TEST_PORT: String(port) },
  },
});

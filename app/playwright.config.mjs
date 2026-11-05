import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/viewer",
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  outputDir: ".build/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:4176",
    viewport: { width: 390, height: 760 },
    launchOptions: process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ],
        }
      : {},
  },
  webServer: {
    command: "node scripts/serve-viewer-tests.mjs",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: false,
  },
});

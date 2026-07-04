import { defineConfig, devices } from "@playwright/test";

import { resolveE2EBaseURL, shouldUseLocalWebServer } from "./e2e/guards/environment.guard";

const baseURL = resolveE2EBaseURL();

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/playwright-report", open: "never" }],
  ],
  outputDir: "e2e/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldUseLocalWebServer(baseURL)
      ? {
          command: "npm run start -- --host 127.0.0.1 --port 4201",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        }
    : undefined,
});

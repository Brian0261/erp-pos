import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

import { resolveE2EBaseURL, shouldUseLocalWebServer } from "./e2e/guards/environment.guard";

const configuredBaseURL = resolveE2EBaseURL();
const internalNoteCi = process.env["npm_lifecycle_event"] === "e2e:internal-note:ci";
if (internalNoteCi && process.env["E2E_BASE_URL"]) throw new Error("QA_NOTE_BASE_URL_OVERRIDE_FORBIDDEN");
const baseURL = internalNoteCi ? "http://127.0.0.1:4202" : configuredBaseURL;

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
  outputDir: internalNoteCi ? path.join(os.tmpdir(), "inktoy-internal-note-ci", "results") : "e2e/test-results",
  use: {
    baseURL,
    ...(internalNoteCi ? { headless: true, serviceWorkers: "block" as const } : {}),
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
          command: `npm run start -- --host 127.0.0.1 --port ${internalNoteCi ? 4202 : 4201}`,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        }
    : undefined,
});

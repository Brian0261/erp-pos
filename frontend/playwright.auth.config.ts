import { defineConfig, devices } from "@playwright/test";
import { requireIsolatedQa } from "./e2e/guards/environment.guard";
import { QA_STORAGE_STATE_PATH } from "./e2e/fixtures/qa-users";
requireIsolatedQa();
export default defineConfig({
  testDir: "./e2e", forbidOnly: true, fullyParallel: false, workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 8000 }, outputDir: "/qa-run/results",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4201", serviceWorkers: "block", trace: "off", screenshot: "off", video: "off" },
  projects: [
    { name: "safety", testMatch: "specs/safety/no-write-safety.spec.ts" },
    { name: "setup", testMatch: "setup/auth.setup.ts" },
    { name: "public", testMatch: "specs/no-write/login.no-write.spec.ts", use: { storageState: { cookies: [], origins: [] } } },
    { name: "authenticated", testMatch: ["specs/no-write/pos-auth.no-write.spec.ts", "specs/no-write/pos-interactions.no-write.spec.ts"],
      dependencies: ["setup"], use: { storageState: QA_STORAGE_STATE_PATH } },
  ],
});

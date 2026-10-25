import { defineConfig, devices } from "@playwright/test";
import { requireIsolatedQa } from "./e2e/guards/environment.guard";
requireIsolatedQa();
export default defineConfig({
  testDir:"./e2e/specs/recovery",fullyParallel:false,workers:1,retries:0,forbidOnly:true,
  globalTimeout:8*60*1000,
  timeout:60000,expect:{timeout:10000},outputDir:"/qa-run/recovery-results",
  use:{...devices["Desktop Chrome"],baseURL:"http://127.0.0.1:4201",viewport:{width:1366,height:768},
    serviceWorkers:"block",trace:"off",screenshot:"off",video:"off"},
});

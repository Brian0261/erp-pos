import { expect, Page } from "@playwright/test";

import { getQaCredentials, QA_STORAGE_STATE_PATH } from "../fixtures/qa-users";
import { chmod } from "node:fs/promises";
import { requireIsolatedQa } from "../guards/environment.guard";

export function assertQaProfile(profile: { username?: string; roles?: string[] }): void {
  if (profile.username !== process.env["E2E_QA_USER"] || profile.roles?.length !== 1 || profile.roles[0] !== "CAJERO") throw new Error("QA_IDENTITY_OR_ROLE_REJECTED");
}

export async function loginWithQaCredentials(page: Page): Promise<void> {
  requireIsolatedQa();
  const credentials = getQaCredentials();
  if (!credentials) {
    throw new Error("Missing E2E_QA_USER or E2E_QA_PASSWORD for authenticated E2E login.");
  }

  await page.goto("/login");
  await page.getByLabel("Usuario o Email").fill(credentials.usernameOrEmail);
  await page.getByLabel("Password").fill(credentials.password);
  const login = page.waitForResponse(r => new URL(r.url()).pathname === "/api/v1/auth/login");
  const me = page.waitForResponse(r => new URL(r.url()).pathname === "/api/v1/auth/me");
  await page.getByRole("button", { name: "Ingresar" }).click();
  if ((await login).status() !== 200) throw new Error("QA_LOGIN_FAILED");
  const profileResponse = await me;
  if (profileResponse.status() !== 200) throw new Error("QA_SESSION_REJECTED");
  assertQaProfile(await profileResponse.json());
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function saveQaStorageState(page: Page): Promise<void> {
  await page.context().storageState({ path: QA_STORAGE_STATE_PATH });
  await chmod(QA_STORAGE_STATE_PATH, 0o600);
}

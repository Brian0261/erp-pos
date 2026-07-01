import { expect, Page } from "@playwright/test";

import { getQaCredentials, QA_STORAGE_STATE_PATH } from "../fixtures/qa-users";

export async function loginWithQaCredentials(page: Page): Promise<void> {
  const credentials = getQaCredentials();
  if (!credentials) {
    throw new Error("Missing E2E_QA_USER or E2E_QA_PASSWORD for authenticated E2E login.");
  }

  await page.goto("/login");
  await page.getByLabel("Usuario o Email").fill(credentials.usernameOrEmail);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function saveQaStorageState(page: Page): Promise<void> {
  await page.context().storageState({ path: QA_STORAGE_STATE_PATH });
}

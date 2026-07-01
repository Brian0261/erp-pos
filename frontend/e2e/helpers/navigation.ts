import { Page } from "@playwright/test";

export async function goToLogin(page: Page): Promise<void> {
  await page.goto("/login");
}

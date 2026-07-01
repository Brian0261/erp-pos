import { expect, Page } from "@playwright/test";

export async function goToPos(page: Page): Promise<void> {
  await page.goto("/pos");
  await expect(page.getByRole("heading", { name: "Punto de venta" })).toBeVisible();
}

export async function expectPosShellVisible(page: Page): Promise<void> {
  await expect(page.getByLabel("Buscar o escanear producto")).toBeVisible();
  await expect(page.getByLabel("Carrito y cobro")).toBeVisible();
  await expect(page.getByRole("button", { name: /Cobrar|Cobrando/i })).toBeVisible();
  await expect(page.getByText(/Caja abierta|Caja cerrada/)).toBeVisible();
}

import { expect, Locator, Page } from "@playwright/test";

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

export async function clearVisibleCart(page: Page): Promise<void> {
    const cancelSale = page.getByRole("button", { name: "Cancelar venta" });
    if (await cancelSale.isEnabled()) {
      await cancelSale.click();
      await expect(page.getByText("Carrito vacío")).toBeVisible();
    }
  }

export async function searchForFirstVisibleProduct(page: Page): Promise<boolean> {
  const runId = process.env["QA_RUN_ID"];
  if (!runId) throw new Error("QA_RUN_REQUIRED");
  const searchInput = page.getByLabel("Buscar o escanear producto");
  await searchInput.fill("Cartulina QA " + runId);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/v1/pos/products/search");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  if ((await response).status() !== 200) throw new Error("QA_PRODUCT_SEARCH_FAILED");
  await expect(page.getByText("Cartulina QA " + runId, { exact: true }).first(), "QA_PRODUCT_MISSING").toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar", exact: true })).toHaveCount(1);
  return true;
}

export async function addFirstSearchResultToCart(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  await expect(firstCartItem(page)).toBeVisible();
}

export async function changeFirstCartItemQuantity(page: Page): Promise<void> {
  await firstCartQuantityIncrease(page).click();
  await expect(firstCartQuantityInput(page)).toHaveValue("2");
  await firstCartQuantityDecrease(page).click();
  await expect(firstCartQuantityInput(page)).toHaveValue("1");
}

export async function applyVisualDiscountToFirstCartItem(page: Page): Promise<void> {
  const discountInput = firstCartDiscountInput(page);
  await discountInput.fill("0.01");
  await expect(discountInput).toHaveValue("0.01");
}

export async function openAndCloseFullCart(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Ver carrito completo" }).click();
  const fullCart = page.getByRole("dialog", { name: "Carrito completo" });
  await expect(fullCart).toBeVisible();
  await expect(fullCart.getByText("Total actual")).toBeVisible();
  await fullCart.getByRole("button", { name: "Cerrar" }).click();
  await expect(fullCart).toBeHidden();
}

export async function openCheckoutAndValidateNoWritePaymentControls(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^COBRAR$/ }).click();
  const checkout = page.getByRole("dialog", { name: "Cobrar venta" });
  await expect(checkout).toBeVisible();
  await expect(checkout.getByRole("heading", { name: "Cobrar venta" })).toBeVisible();
  await expect(checkout.getByRole("button", { name: "Cerrar" })).toBeVisible();
  await expect(checkout.getByRole("button", { name: "Seguir editando" })).toBeVisible();
  await expect(checkout.getByRole("button", { name: /^COBRAR$/ })).toBeVisible();
  await expect(checkout.getByLabel("Pagos de la venta")).toBeVisible();
  await checkout.getByLabel("Método *").selectOption("CARD");
  await checkout.getByLabel("Monto *").fill("0.01");
  await expect(checkout.getByLabel("Método *")).toHaveValue("CARD");
  await expect(checkout.getByLabel("Monto *")).toHaveValue("0.01");
  await expect(checkout.getByText(/Pagado:\s*S\/\s*0\.01/)).toBeVisible();
  await checkout.getByRole("button", { name: "Seguir editando" }).click();
  await expect(checkout).toBeHidden();
}

export async function removeFirstCartItem(page: Page): Promise<void> {
  await firstCartItem(page).getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByText("Carrito vacío")).toBeVisible();
}

function firstCartItem(page: Page): Locator {
  return page.getByLabel("Carrito y cobro").locator(".cart-item").first();
}

function firstCartQuantityInput(page: Page): Locator {
  return firstCartItem(page).locator('input[type="number"]').first();
}

function firstCartDiscountInput(page: Page): Locator {
  return firstCartItem(page).locator('input[type="number"]').nth(1);
}

function firstCartQuantityDecrease(page: Page): Locator {
  return firstCartItem(page).locator(".quantity-stepper").first();
}

function firstCartQuantityIncrease(page: Page): Locator {
  return firstCartItem(page).locator(".quantity-stepper").nth(1);
}

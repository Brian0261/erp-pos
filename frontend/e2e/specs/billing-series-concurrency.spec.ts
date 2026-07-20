import { expect, Page, test } from "@playwright/test";

const initialSeries = {
  id: 7,
  documentType: "RECEIPT",
  series: "B001",
  currentNumber: 12,
  environment: "LOCAL",
  active: true,
  version: 3,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

async function openSeriesPage(
  page: Page,
  method: "PUT" | "DELETE",
  active = true,
) {
  let listRequests = 0;
  const mutations: { method: string; ifMatch: string | undefined }[] = [];

  await page.addInitScript(() => localStorage.setItem("erp_pos_token", "e2e-token"));
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "1",
        username: "admin",
        email: "admin@example.test",
        roles: ["ADMIN"],
      }),
    }),
  );
  await page.route("**/api/v1/billing/series**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      listRequests += 1;
      const refreshed = { ...initialSeries, active, version: 4, currentNumber: 13 };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          listRequests === 1 ? { ...initialSeries, active } : refreshed,
        ]),
      });
      return;
    }

    mutations.push({ method: request.method(), ifMatch: request.headers()["if-match"] });
    expect(request.method()).toBe(method);
    expect(request.headers()["if-match"]).toBe('"billing-series-7-v3"');
    await route.fulfill({
      status: 412,
      contentType: "application/json",
      body: JSON.stringify({ message: "stale series" }),
    });
  });

  await page.goto("/facturacion/series");
  await expect(page.getByRole("heading", { name: "Series registradas" })).toBeVisible();

  return { mutations, getListRequests: () => listRequests };
}

test("stale update sends one If-Match request, reloads once and never retries", async ({ page }) => {
  const state = await openSeriesPage(page, "PUT");

  await page.getByRole("button", { name: "Editar", exact: true }).first().click();
  await page.getByRole("spinbutton", { name: /Proximo correlativo/i }).fill("15");
  await page.getByRole("button", { name: "Actualizar serie", exact: true }).click();
  await page.getByRole("button", { name: "Activar", exact: true }).click();

  await expect(page.getByText(/La serie fue modificada por otro usuario/)).toBeVisible();
  expect(state.mutations).toHaveLength(1);
  expect(state.getListRequests()).toBe(2);
});

test("stale deactivate sends one If-Match request and reloads without optimistic success", async ({ page }) => {
  const state = await openSeriesPage(page, "DELETE");

  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).last().click();

  await expect(page.getByText(/La serie fue modificada por otro usuario/)).toBeVisible();
  expect(state.mutations).toHaveLength(1);
  expect(state.getListRequests()).toBe(2);
  await expect(page.getByText("Serie B001 desactivada.")).not.toBeVisible();
});

test("stale reactivate sends one If-Match request and reloads without optimistic success", async ({ page }) => {
  const state = await openSeriesPage(page, "PUT", false);

  await page.getByRole("button", { name: "Mostrar", exact: true }).click();
  await page.getByRole("button", { name: "Activar", exact: true }).first().click();
  await page.getByRole("button", { name: "Activar", exact: true }).last().click();

  await expect(page.getByText(/La serie fue modificada por otro usuario/)).toBeVisible();
  expect(state.mutations).toHaveLength(1);
  expect(state.getListRequests()).toBe(2);
  await expect(page.getByText("Serie B001 activada.")).not.toBeVisible();
});

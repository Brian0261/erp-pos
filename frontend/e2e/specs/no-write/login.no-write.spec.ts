import { expect, test } from "../../fixtures/test-fixtures";
import { goToLogin } from "../../helpers/navigation";

test("@no-write login page loads without transactional requests", async ({ page }) => {
  await goToLogin(page);

  await expect(page.getByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
  await expect(page.getByLabel("Usuario o Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeDisabled();
});

import { test } from "../../fixtures/test-fixtures";
import { hasQaCredentials } from "../../fixtures/qa-users";
import { loginWithQaCredentials, saveQaStorageState } from "../../helpers/login";
import {
  addFirstSearchResultToCart,
  applyVisualDiscountToFirstCartItem,
  changeFirstCartItemQuantity,
  clearVisibleCart,
  expectPosShellVisible,
  goToPos,
  openAndCloseFullCart,
  openCheckoutAndValidateNoWritePaymentControls,
  removeFirstCartItem,
  searchForFirstVisibleProduct,
} from "../../helpers/pos";

test("@no-write authenticated POS interactions stop before transactional writes", async ({ page }) => {
  test.skip(
    !hasQaCredentials(),
    "Missing E2E_QA_USER/E2E_QA_PASSWORD; authenticated POS interactions are blocked until QA credentials are provided.",
  );

  await loginWithQaCredentials(page);
  await saveQaStorageState(page);
  await goToPos(page);
  await expectPosShellVisible(page);
  await clearVisibleCart(page);

  const foundProduct = await searchForFirstVisibleProduct(page);
  test.skip(!foundProduct, "No visible POS products were available in local QA data for no-write interactions.");

  await addFirstSearchResultToCart(page);
  await changeFirstCartItemQuantity(page);
  await applyVisualDiscountToFirstCartItem(page);
  await openAndCloseFullCart(page);
  await openCheckoutAndValidateNoWritePaymentControls(page);
  await removeFirstCartItem(page);
});

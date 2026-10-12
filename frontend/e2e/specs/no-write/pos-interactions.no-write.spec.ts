import { test } from "../../fixtures/test-fixtures";
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
  await goToPos(page);
  await expectPosShellVisible(page);
  await clearVisibleCart(page);

  const foundProduct = await searchForFirstVisibleProduct(page);
  if (!foundProduct) throw new Error("QA_PRODUCT_MISSING");

  await addFirstSearchResultToCart(page);
  await changeFirstCartItemQuantity(page);
  await applyVisualDiscountToFirstCartItem(page);
  await openAndCloseFullCart(page);
  await openCheckoutAndValidateNoWritePaymentControls(page);
  await removeFirstCartItem(page);
});

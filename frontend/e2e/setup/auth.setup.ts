import { test } from "../fixtures/test-fixtures";
import { loginWithQaCredentials, saveQaStorageState } from "../helpers/login";

test("QA login setup", async ({ page }) => {
  await loginWithQaCredentials(page);
  await saveQaStorageState(page);
});

import { test } from "../fixtures/test-fixtures";
import { hasQaCredentials, QA_STORAGE_STATE_PATH } from "../fixtures/qa-users";
import { loginWithQaCredentials, saveQaStorageState } from "../helpers/login";

test("@no-write creates local QA storageState when credentials are provided", async ({ page }) => {
  test.skip(
    !hasQaCredentials(),
    "Missing E2E_QA_USER/E2E_QA_PASSWORD; authenticated storageState generation is skipped.",
  );

  await loginWithQaCredentials(page);
  await saveQaStorageState(page);
  test.info().annotations.push({ type: "storageState", description: QA_STORAGE_STATE_PATH });
});

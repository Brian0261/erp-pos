import { test } from "../../fixtures/test-fixtures";
import { hasQaCredentials } from "../../fixtures/qa-users";
import { loginWithQaCredentials, saveQaStorageState } from "../../helpers/login";
import { expectPosShellVisible, goToPos } from "../../helpers/pos";

test("@no-write authenticated POS shell loads without transactional requests", async ({ page }) => {
  test.skip(
    !hasQaCredentials(),
    "Missing E2E_QA_USER/E2E_QA_PASSWORD; authenticated POS smoke is blocked until QA credentials are provided.",
  );

  await loginWithQaCredentials(page);
  await saveQaStorageState(page);
  await goToPos(page);
  await expectPosShellVisible(page);
});

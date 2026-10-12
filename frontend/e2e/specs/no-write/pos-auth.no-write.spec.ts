import { test } from "../../fixtures/test-fixtures";
import { expectPosShellVisible, goToPos } from "../../helpers/pos";

test("@no-write authenticated POS shell loads without transactional requests", async ({ page }) => {
  await goToPos(page);
  await expectPosShellVisible(page);
});

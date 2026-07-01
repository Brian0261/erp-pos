import { expect, test as base } from "@playwright/test";

import { assertSafeBaseURL } from "../guards/environment.guard";
import { BlockedRequestRecord, installNoWriteNetworkGuard } from "../guards/network-write.guard";

type Fixtures = {
  blockedRequests: BlockedRequestRecord[];
};

export const test = base.extend<Fixtures>({
  blockedRequests: [
    async ({ page }, use, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (typeof baseURL === "string") {
        assertSafeBaseURL(baseURL);
      }

      const blockedRequests: BlockedRequestRecord[] = [];
      await installNoWriteNetworkGuard(page, blockedRequests);
      await use(blockedRequests);
      expect(blockedRequests, "No mutating API requests are allowed in no-write E2E tests").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

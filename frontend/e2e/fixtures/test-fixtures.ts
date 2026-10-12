import { test as base } from "@playwright/test";

import { requireIsolatedQa } from "../guards/environment.guard";
import { BlockedRequestRecord, installNoWriteNetworkGuard, assertNoWriteViolations } from "../guards/network-write.guard";

type Fixtures = {
  blockedRequests: BlockedRequestRecord[];
};

export const test = base.extend<Fixtures>({
  request: async ({}, _use) => { throw new Error("QA_INDEPENDENT_HTTP_CLIENT_FORBIDDEN"); },
  blockedRequests: [
    async ({ context }, use) => {
      const runId = requireIsolatedQa();
      const blockedRequests: BlockedRequestRecord[] = [];
      await installNoWriteNetworkGuard(context, blockedRequests);
      context.on("response", response => {
        if (!new URL(response.url()).pathname.startsWith("/api/")) return;
        if (response.headers()["x-qa-run-id"] !== runId || response.headers()["x-qa-no-write"] !== "enforced"
            || [401, 403, 405, 500, 502, 503].includes(response.status())) {
          blockedRequests.push({ method: "RESPONSE", path: new URL(response.url()).pathname, reason: "QA_RESPONSE_REJECTED" });
        }
      });
      try { await use(blockedRequests); }
      finally { assertNoWriteViolations(blockedRequests); }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

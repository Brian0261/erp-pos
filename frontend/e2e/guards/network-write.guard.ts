import { Page, Route } from "@playwright/test";

import { isAllowedNoWriteRequest, isDangerousEndpoint, MUTATING_METHODS } from "./dangerous-endpoints";

export interface BlockedRequestRecord {
  method: string;
  url: string;
  reason: string;
}

export async function installNoWriteNetworkGuard(
  page: Page,
  blockedRequests: BlockedRequestRecord[],
): Promise<void> {
  await page.route("**/api/**", async (route) => handleApiRoute(route, blockedRequests));
}

async function handleApiRoute(route: Route, blockedRequests: BlockedRequestRecord[]): Promise<void> {
  const request = route.request();
  const method = request.method().toUpperCase();
  const url = new URL(request.url());
  const allowWrites = process.env["E2E_ALLOW_WRITES"] === "true";

  if (allowWrites) {
    await route.continue();
    return;
  }

  if (!MUTATING_METHODS.has(method)) {
    await route.continue();
    return;
  }

  if (isAllowedNoWriteRequest(method, url.pathname)) {
    await route.continue();
    return;
  }

  const reason = isDangerousEndpoint(url.pathname)
    ? "blocked dangerous endpoint in no-write mode"
    : "blocked mutating API request in no-write mode";

  blockedRequests.push({ method, url: request.url(), reason });
  await route.abort("blockedbyclient");
}

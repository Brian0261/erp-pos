import { BrowserContext } from "@playwright/test";
import { requireIsolatedQa } from "./environment.guard";

export interface BlockedRequestRecord { method: string; path: string; reason: string; }
export function assertNoWriteViolations(blocked: BlockedRequestRecord[]): void {
  if (blocked.length) throw new Error("QA_NO_WRITE_OR_AUTH_VIOLATION");
}
export const QA_ORIGIN = "http://127.0.0.1:4201";
export const READ_PATHS = new Set([
  "/api/v1/auth/me", "/api/v1/warehouses", "/api/v1/billing/series", "/api/v1/cash-registers/current",
  "/api/v1/pos/products/search", "/api/v1/pos/products/lookup", "/api/v1/sales", "/api/v1/quotes",
  "/api/v1/billing/documents", "/api/v1/inventory/stocks", "/api/v2/inventory/stocks", "/api/v1/health/e2e-identity",
]);
export function allowedQaRequest(method: string, address: string): boolean {
  const url = new URL(address);
  if (url.origin !== QA_ORIGIN || url.username || url.password) return false;
  if (method === "POST") return url.pathname === "/api/v1/auth/login" && !url.search;
  if (method !== "GET") return false;
  return !url.pathname.startsWith("/api") || READ_PATHS.has(url.pathname);
}
export async function installNoWriteNetworkGuard(context: BrowserContext, blocked: BlockedRequestRecord[]): Promise<void> {
  requireIsolatedQa();
  await context.route("**/*", async route => {
    const request = route.request();
    if (allowedQaRequest(request.method(), request.url())) { await route.continue(); return; }
    blocked.push({ method: request.method(), path: new URL(request.url()).pathname, reason: "QA_REQUEST_DENIED" });
    await route.abort("blockedbyclient");
  });
  await context.routeWebSocket(/.*/, socket => {
    blocked.push({ method: "WEBSOCKET", path: "/", reason: "QA_WEBSOCKET_DENIED" }); socket.close();
  });
}

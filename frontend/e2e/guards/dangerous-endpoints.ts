export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DANGEROUS_PATH_PATTERNS: RegExp[] = [
  /^\/api\/v1\/sales$/,
  /^\/api\/v1\/sales\/[^/]+\/void$/,
  /^\/api\/v1\/cash-registers\/open$/,
  /^\/api\/v1\/cash-registers\/[^/]+\/close$/,
  /^\/api\/v1\/billing\/documents\/from-sale\/[^/]+$/,
  /^\/api\/v1\/billing\/documents\/[^/]+\/(generate-xml|sign|send)$/,
  /^\/api\/v1\/billing\/(series|company-profile)(\/.*)?$/,
  /^\/api\/v1\/inventory\/(initial-stock|adjustments|transfers)(\/.*)?$/,
];

export function isAllowedNoWriteRequest(method: string, pathname: string): boolean {
  return method.toUpperCase() === "POST" && pathname === "/api/v1/auth/login";
}

export function isDangerousEndpoint(pathname: string): boolean {
  return DANGEROUS_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

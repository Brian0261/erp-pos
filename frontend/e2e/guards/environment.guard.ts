const DEFAULT_BASE_URL = "http://localhost:4200";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const PRODUCTION_HOST_PATTERNS = ["inktoy.pe", "www.inktoy.pe"];

export function resolveE2EBaseURL(): string {
  const baseURL = process.env["E2E_BASE_URL"]?.trim() || DEFAULT_BASE_URL;
  assertSafeBaseURL(baseURL);
  return baseURL;
}

export function assertSafeBaseURL(baseURL: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error(`Invalid E2E_BASE_URL: ${baseURL}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PRODUCTION_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
    throw new Error(`Refusing to run E2E against production-like host: ${hostname}`);
  }

  if (LOCAL_HOSTS.has(hostname)) {
    return;
  }

  const allowStaging = process.env["E2E_ALLOW_STAGING"] === "true";
  if (allowStaging && hostname.includes("staging")) {
    return;
  }

  throw new Error(
    `Unsafe E2E host '${hostname}'. Use localhost/127.0.0.1 or set E2E_ALLOW_STAGING=true for an approved staging host.`,
  );
}

export function shouldUseLocalWebServer(baseURL: string): boolean {
  const hostname = new URL(baseURL).hostname.toLowerCase();
  return LOCAL_HOSTS.has(hostname);
}

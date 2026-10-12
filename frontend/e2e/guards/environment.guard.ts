const DEFAULT_BASE_URL = "http://127.0.0.1:4201";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const PRODUCTION_HOST_PATTERNS = ["inktoy.pe", "www.inktoy.pe"];

export function resolveE2EBaseURL(): string {
  if (process.env["E2E_ALLOW_WRITES"] === "true" || process.env["E2E_ALLOW_STAGING"] === "true") throw new Error("QA_UNSAFE_BYPASS_REJECTED");
  const baseURL = process.env["E2E_BASE_URL"]?.trim() || DEFAULT_BASE_URL;
  assertSafeBaseURL(baseURL);
  return baseURL;
}

export function assertSafeBaseURL(baseURL: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error("QA_INVALID_BASE_URL");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PRODUCTION_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
    throw new Error(`Refusing to run E2E against production-like host: ${hostname}`);
  }

  if (LOCAL_HOSTS.has(hostname) && parsed.protocol === "http:" && !parsed.username && !parsed.password) {
    return;
  }

  throw new Error(
    "QA_UNSAFE_HOST_REJECTED",
  );
}

export function requireIsolatedQa(): string {
  const runId = process.env["QA_RUN_ID"];
  if (!runId || !/^[a-f0-9]{24}$/.test(runId) || process.env["E2E_BASE_URL"]
      || process.env["E2E_ALLOW_WRITES"] || process.env["E2E_ALLOW_STAGING"]) throw new Error("QA_ISOLATED_RUN_REQUIRED");
  return runId;
}

export function shouldUseLocalWebServer(baseURL: string): boolean {
  const hostname = new URL(baseURL).hostname.toLowerCase();
  return LOCAL_HOSTS.has(hostname);
}

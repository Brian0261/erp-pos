export const QA_STORAGE_STATE_PATH = "e2e/.auth/qa-user.json";

export interface QaCredentials {
  usernameOrEmail: string;
  password: string;
}

export function getQaCredentials(): QaCredentials | null {
  const usernameOrEmail = process.env["E2E_QA_USER"]?.trim();
  const password = process.env["E2E_QA_PASSWORD"];

  if (!usernameOrEmail || !password) {
    return null;
  }

  return { usernameOrEmail, password };
}

export function hasQaCredentials(): boolean {
  return getQaCredentials() !== null;
}

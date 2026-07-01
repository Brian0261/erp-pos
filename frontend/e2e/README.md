# ERP/POS E2E

Playwright E2E base for local QA. The default mode is no-write and must not create sales, open or close cash registers, modify stock, issue documents, or consume billing series.

## Commands

```powershell
npm run e2e:install
npm run e2e:auth
npm run e2e:no-write
npm run e2e:no-write:headed
npm run e2e:report
```

## Environment

Default values:

- `E2E_BASE_URL=http://localhost:4200`
- `E2E_ALLOW_WRITES=false`
- `E2E_ALLOW_CONTROLLED_SALES=false`
- `E2E_ALLOW_BILLING_RISK=false`
- `E2E_QA_USER` unset by default
- `E2E_QA_PASSWORD` unset by default

Only local hosts are allowed by default: `localhost` and `127.0.0.1`. Staging requires explicit `E2E_ALLOW_STAGING=true` and is not configured in AUTO-E1.

## Secrets

Do not commit real credentials or session state. If a later phase creates authenticated setup, store Playwright `storageState` under `e2e/.auth/`, which is ignored by Git.

Authenticated specs require `E2E_QA_USER` and `E2E_QA_PASSWORD`. When those variables are missing, authenticated specs skip with an explicit message instead of inventing credentials. The generated storage state path is `e2e/.auth/qa-user.json` and is ignored by Git.

## Safety

The no-write fixture blocks mutating API requests by default. The only allowed write in no-write mode is `POST /api/v1/auth/login` for authentication.

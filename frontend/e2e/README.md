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

For visual local QA observation, run the no-write suite headed and sequentially:

```powershell
npx playwright test --grep @no-write --headed --workers=1
```

`npm run e2e:report` serves the generated HTML report locally and keeps the terminal attached until it is stopped.

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

Authenticated POS no-write specs may add products to the browser-side cart, edit quantities, open checkout, and close modals, but must not press the final checkout confirmation button or accept any real-sale confirmation.

## Evidence

- HTML report: `frontend/e2e/playwright-report/`
- Test artifacts on failures: `frontend/e2e/test-results/`
- Local storage state only: `frontend/e2e/.auth/qa-user.json`

All those paths are ignored by Git through `frontend/e2e/.gitignore`.

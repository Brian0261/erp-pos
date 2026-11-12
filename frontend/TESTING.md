# Frontend testing

## Node/npm toolchain

Use Node `22.23.4` and npm `10.9.9` for frontend commands. The canonical
Node version is `frontend/.nvmrc`; `devEngines` in `package.json` rejects
other Node/npm versions. On Windows or WSL, select an existing installation
or your already available toolchain mechanism before installing dependencies;
no particular version manager is required. Check the active terminal first:

```powershell
node --version
npm --version
npm ci
```

Run these commands from `frontend`. `npm ci` installs reproducibly from the
committed lockfile; do not use `npm install` for this baseline.

## pnpm lockfile validation (PNPM-2)

Download the native pnpm `12.19.0` archive for your platform from the
[official release](https://github.com/pnpm/pnpm/releases/tag/v12.19.0).
Verify its SHA-256 and signed build provenance before extracting it.

| Platform | Archive | SHA-256 |
| --- | --- | --- |
| Windows x64 | `pnpm-win32-x64.zip` | `1fa21198d4b9dfebabac985b6ab863bd4138d83ad07457d4eb0910cc2b3286c5` |
| Linux x64 glibc | `pnpm-linux-x64.tar.gz` | `bf37edf4e26c3b31c1cac42c769ffabcb9231e9bc728762aeb1ee86bc711684a` |
| Linux x64 musl | `pnpm-linux-x64-musl.tar.gz` | `b41d7b2d8f47187fdf9b3df170f984ffb02ef14bd27d353ccff704cef0d1af6e` |

```text
gh attestation verify <archive> --repo pnpm/pnpm --signer-workflow pnpm/pnpm/.github/workflows/release.yml --source-ref refs/tags/v12.19.0 --source-digest f4afab20988dc20b747e97c48388f901258d0fcb
```

Extract outside the repository and use the executable's absolute path.
Select Node `22.23.4` in the current session. Run the version check from
`frontend` so pnpm uses the project's pin and rejects version switching.
In the commands below, `pnpm` means the verified executable.

```text
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm peers check
pnpm run build
pnpm test
pnpm exec playwright --version
```

Use separate clean install directories for pnpm and npm. For an approved
dependency change, review both lockfiles together and validate both frozen
installs. CI, Docker and QA runners still use the npm baseline until their
respective migration phases. PNPM-6 retires the npm pin and lockfile after
those consumers have switched.

## Unit baseline

The Angular 18 baseline uses Karma 6 and Jasmine 5 temporarily. Run the
headless suite once with:

```powershell
npm test
```

The target uses `ChromeHeadless`, `zone.js/testing` and
`frontend/tsconfig.spec.json`. There is no initial coverage threshold.

Current P0/P1 scope:

- fiscal billing-series ETag construction and response capture;
- `If-Match` on update, reactivate and deactivate;
- safe handling of `412` and `428`;
- separation from `400` and `409`;
- one mutation, one stale reload and no automatic retry.

## Build and focal E2E

```powershell
npm run build
npm run e2e:billing-series:ci
npm run e2e:no-write
```

`e2e:billing-series:ci` is fully simulated through Playwright routing and does
not write to the backend. Authenticated no-write cases require the existing QA
credentials and may be skipped when they are unavailable; skipped cases are not
evidence of PASS.

## CI order

The frontend CI job reads Node from `frontend/.nvmrc`, then performs:

1. `npm ci`;
2. `npm test`;
3. `npm run build`;
4. `npx playwright install --with-deps chromium`;
5. `npm run e2e:billing-series:ci`.

Karma remains a temporary safety baseline. A separate QA-FE-2 phase will decide
whether to retain it or migrate to Vitest after the Angular major upgrades.

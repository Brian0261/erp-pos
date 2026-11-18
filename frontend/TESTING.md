# Frontend testing

## Node and pnpm toolchain

Use Node `22.23.4` and native pnpm `12.19.0` for frontend commands.
`frontend/.nvmrc` declares the Node version. Select the existing toolchain
for the current Windows, WSL or Linux session before installing dependencies.

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
Use `pnpm.exe` on Windows and the matching Linux executable on WSL or Linux.
Put the verified executable's directory first on the current session's PATH so
tools launched by pnpm use the same binary. Run the version checks from
`frontend` and proceed only with Node `v22.23.4` and pnpm `12.19.0`.

```text
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm peers check
pnpm run build
pnpm run test
pnpm exec playwright --version
```

Run `pnpm run start` to start the local Angular development server.

Use a clean checkout or a clean `node_modules` directory when switching from
an npm install. Keep native Windows and WSL/Linux installs separate. If a
version check fails, select the approved toolchain. If the frozen install fails,
compare the manifest and lockfile with the approved revision before continuing.
The local QA entry points are described in [ERP/POS E2E](e2e/README.md).

The committed [pnpm policy](pnpm-workspace.yaml) defines the isolated install,
the dependency build scripts that are explicitly denied, and the effective
pnpm override for Vite `7.3.8` preserved from SEC-DEP-1. The validated platforms
use the locked prebuilt native packages. Keep this policy and the frozen lockfile
when setting up a workstation; new dependency scripts or resolutions require
separate review.

## Docker builds (PNPM-4)

Use BuildKit on a linux/amd64 Docker engine and select linux/amd64 as the
target before building. For example, from the repository root:

```text
docker build --platform linux/amd64 -f frontend/Dockerfile frontend
```

The frontend build uses the approved musl release and the QA tools image uses
the glibc release. Both verify the archive and extracted executable before
running pnpm 12.19.0 with Node 22.23.4. The release archives are covered by the
upstream build attestation above. BuildKit caches downloads separately for
each libc and the install uses the committed frozen lockfile and workspace
policy. QA runners prepare their own contexts and use the verified host pnpm.
The frontend runtime receives the Angular static output and Nginx config.
The unchanged rolling Nginx tag can change the runtime image independently of
the frozen application dependencies.

## Unit baseline

The current Angular 21 frontend retains the Karma 6 and Jasmine 5 safety
baseline introduced under Angular 18. Run the headless suite once with:

```powershell
pnpm run test
```

The target uses `ChromeHeadless`, `zone.js/testing` and
`frontend/tsconfig.spec.json`. There is no initial coverage threshold.

The original P0/P1 billing-series baseline covered:

- fiscal billing-series ETag construction and response capture;
- `If-Match` on update, reactivate and deactivate;
- safe handling of `412` and `428`;
- separation from `400` and `409`;
- one mutation, one stale reload and no automatic retry.

## Build and focal E2E

```powershell
pnpm run build
pnpm run e2e:install
pnpm run e2e:billing-series:ci
pnpm run e2e:internal-note:ci
node e2e/qa/qa-toolchain.mjs launch auth "<absolute-path-to-pnpm>"
node e2e/qa/qa-toolchain.mjs launch recovery "<absolute-path-to-pnpm>"
```

`e2e:billing-series:ci` is fully simulated through Playwright routing.
The controlled Auth gate creates its own disposable fixtures and fails when a
required case is skipped.

## CI order

For full runs, GitHub Actions reads Node from `frontend/.nvmrc`. The frontend
and both QA jobs verify the native Linux x64 glibc pnpm archive, its SLSA
provenance and its executable before exposing `PNPM_BIN`. Each job installs
from the frozen lockfile into its own local store without a remote pnpm cache.

The shared [bootstrap action](../.github/actions/setup-inktoy-pnpm/action.yml)
uses `github.token` only to fetch attestations with the jobs' existing
`contents: read` permissions. CI requires GitHub CLI `2.102.0` or newer. The
archive/executable SHA-256 and SLSA checks remain independent of download
authentication, and credentials are removed before `gh attestation verify`.

The attestation API query permits at most three attempts within 300 seconds.
It respects valid `Retry-After` and quota-reset values and retries only
identified rate limits or selected transient HTTP/transport failures.
Unknown 403, 401/404, invalid JSON/bundles and failed provenance checks stop
the bootstrap. Inspect the sanitized HTTP diagnostics before requesting a
workflow retry; preserve verification and permissions when diagnosing a failure.
[CI-ATTEST-1 closure](https://github.com/Brian0261/erp-pos/pull/32#issuecomment-6966826480)
records real-runner token/SLSA validation and the remaining external
availability risk; it does not guarantee that every future request will succeed.

The frontend job then runs:

1. `pnpm run test`;
2. `pnpm run build`;
3. `pnpm exec playwright install --with-deps chromium` after checking the
   installed Playwright CLI is 1.61.1;
4. `pnpm run e2e:billing-series:ci` and `pnpm run e2e:internal-note:ci`.

The QA jobs invoke `qa-toolchain.mjs launch auth|recovery` with the verified
absolute pnpm path. Commercial CI requires schema v3 with pnpm on both the
host and the QA image. It checks the checkout commit (including the test
merge commit for a PR), lockfile and observed Docker browser image before
accepting the result. The historical v1, v2 and v3 evidence remains readable.

Karma remains a temporary safety baseline. Any decision to retain it or migrate
to Vitest belongs to the separate QA-FE-2 phase.

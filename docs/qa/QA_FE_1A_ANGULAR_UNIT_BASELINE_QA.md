# QA-FE-1A — Angular unit-test safety baseline

## Result

Local build result: PASS for the authorized P0/P1 baseline.

The implementation and local QA evidence are complete for the authorized
baseline. The baseline is considered remotely closed only when its publication
commit is synchronized with `origin/master` and the CI workflow associated
with that published SHA concludes with `success`. The general no-write suite
is PARTIAL locally because two authenticated cases were skipped without QA
credentials; those skips are not PASS evidence.

## Scope

- Angular remains at 18.2.x.
- Karma 6.4.4 and Jasmine 5.2.0 provide a temporary headless unit baseline.
- No functional frontend code was changed.
- No backend, database, infrastructure, Node or Angular upgrade was included.
- There is no initial coverage percentage threshold.

## Unit coverage

`BillingSeriesService`:

- preserves the response `version`;
- constructs `"billing-series-{id}-v{version}"`;
- captures individual response ETags;
- sends update/reactivate/deactivate with the exact `If-Match`;
- excludes `version` from update bodies;
- emits one request and does not retry stale mutations;
- verifies that no unexpected HTTP requests remain.

`BillingSeriesPageComponent`:

- covers update/reactivate/deactivate for `412`;
- covers the same three operations for `428`;
- stops loading and clears optimistic success;
- closes and invalidates stale edit state;
- performs one mutation and one reload;
- does not retry or automatically reapply changes;
- keeps `400` validation and `409` business conflicts separate.

Total unit tests: 13. Skipped unit tests: 0.

## Configuration

- Angular target: `@angular-devkit/build-angular:karma`.
- Browser: `ChromeHeadless`.
- One-shot command: `npm test`.
- Test polyfills: `zone.js`, `zone.js/testing`.
- Test TypeScript context: `frontend/tsconfig.spec.json`.
- Jasmine types are limited to test compilation.
- No `karma.conf.js`.
- No `src/test.ts`.

## Evidence

| Validation | Result |
|---|---|
| Dependency metadata and peer compatibility | PASS |
| `npm ci` from the generated lockfile | PASS — 951 packages installed |
| `npm test` | PASS — 13/13, 0 skipped |
| Single-run Karma termination | PASS |
| `npm run build` | PASS |
| `npm run e2e:billing-series:ci` | PASS — 6/6 |
| Unexpected browser console/page errors in focal E2E | None |
| `npm run e2e:no-write` | PARTIAL — 1 passed, 2 authenticated tests skipped |
| Real backend writes | None |
| SEC-FE-1A compatible transitive remediation | PASS |
| Full dependency audit after SEC-FE-1A (historical 2026-07-23) | 62 total — 7 low, 19 moderate, 35 high, 1 critical |
| Production dependency audit after SEC-FE-1A (historical 2026-07-23) | 8 high, 0 critical |
| SEC-FE-1B current full audit (2026-10-05) | 82 total — 6 low, 22 moderate, 51 high, 3 critical |
| SEC-FE-1B current production audit (2026-10-05) | 8 total — 4 moderate, 4 high, 0 critical |
| Remote GitHub Actions | Closure criterion: workflow for the published commit SHA must conclude `success` |

The focal Playwright spec ignores only the expected browser resource error for
the mocked HTTP status under test. Any other `console.error` or any `pageerror`
fails the scenario.

## Dependency baseline

Exact additions:

- `@types/jasmine@5.1.15`;
- `jasmine-core@5.2.0`;
- `karma@6.4.4`;
- `karma-chrome-launcher@3.2.0`;
- `karma-coverage@2.2.1`;
- `karma-jasmine@5.1.0`;
- `karma-jasmine-html-reporter@2.1.0`.

The metadata confirms compatibility with Angular/build-angular 18.2.x,
TypeScript 5.5.4, Node 20 and Node 22. No `--force` or
`--legacy-peer-deps` was used.

`npm ci` and `npm ls --depth=0` confirm a coherent dependency tree. Adding
Karma's Socket.IO chain allowed npm to deduplicate the existing transitive
`ws` package from 8.20.0 to 8.21.1; no direct dependency or toolchain version
changed outside the seven authorized additions.

## CI

The frontend job now uses the lockfile with `npm ci`, runs unit tests before the
build, installs Playwright Chromium with operating-system dependencies and runs
only the simulated billing-series concurrency spec. Node remains at the
workflow's existing major 20 for this phase.

## Residual risks and deferred work

- Remote closure is conditional on the publication commit being synchronized
  with `origin/master` and its associated GitHub Actions workflow concluding
  `success`; this document does not assert that condition has been met.
- Two authenticated no-write tests require QA credentials and were skipped;
  they are not counted as PASS.
- Karma is temporary and its dependency tree includes legacy/transitive audit
  findings; QA-FE-2 will reassess the runner after upgrades.
- SEC-FE-1A updated only the compatible transitive lock resolutions:
  `shell-quote 1.8.3 -> 1.10.0` and
  `websocket-driver 0.7.4 -> 0.7.5`. Four advisories were removed without
  changing `package.json` or the Angular toolchain.
- Historical SEC-FE-1A audit: 62 total findings (7 low, 19 moderate,
  35 high, 1 critical); production 8 high and 0 critical.
- SEC-FE-1B revalidation on 2026-10-05: current audit 82 total (6 low,
  22 moderate, 51 high, 3 critical); production 8 total (4 moderate,
  4 high, 0 critical). The material change is advisory
  `GHSA-r292-9mhp-454m / CVE-2026-73566`, affecting `tar <=7.5.20` and fixed
  in `7.5.21`; `tar@6.2.1` remains affected.
- SEC-FE-1B result: `RENEW_SHORT_RISK_ACCEPTANCE` with `CAMBIO_MATERIAL`.
  The renewed acceptance expires at NG-UP-20 closeout or on 2026-10-19,
  whichever occurs first; it has no automatic renewal. Re-audit after every
  lockfile change. Do not use untrusted `ng add`/`ng update`, process
  arbitrary TAR input, use overrides/resolutions, or add `tar` directly.
- QA-FE-1A did not introduce `tar` or its vulnerabilities. `tar@6.2.1`
  remains dev-only, outside production audit and runtime, and no compatible
  fix exists within Angular CLI 18 under the current restrictions. Remediation
  remains assigned to NG-UP-20.
- Production-only risk remains pre-existing Angular 18 exposure; a new
  production deployment remains blocked until NG-UP-NODE, NG-UP-19 and
  NG-UP-20 are completed and both audits are repeated.
- Detailed security evidence:
  `docs/qa/SEC_FE_1_FRONTEND_DEPENDENCY_TRIAGE.md`.
- NG-UP-NODE is the next planned phase after QA-FE-1A remote closure; it must
  start immediately after that closure and continue through NG-UP-19 and
  NG-UP-20 without unnecessary pauses.
- NG-UP-19/20/control-flow/21 have not started.
- QA-FE-2 and 4D-2C remain deferred.

QA-FE-1A has complete local implementation and QA evidence. Remote closure is
governed by the publication-commit/CI-success criterion above; this document
does not assert that the criterion has been met. No commit, push or tag belongs
to this build execution.

# SEC-FE-1 — Frontend dependency vulnerability triage

## Result

SEC-FE-1A local result: PASS.

SEC-FE-1B revalidation result (2026-10-05):
`RENEW_SHORT_RISK_ACCEPTANCE` with `CAMBIO_MATERIAL`. The current audit is
recorded below; the 2026-07-23 figures remain historical evidence only.

SEC-FE-1 was the dependency triage. SEC-FE-1A applied and validated the
compatible transitive correction required by that triage: `shell-quote` to
`1.10.0` and `websocket-driver` to `0.7.5`. `tar@6.2.1` remains a temporary
dev-only acceptance with the expiry and restrictions recorded below. Angular
18 remains blocked for a new production deployment. The QA-FE-1A baseline is
remotely closed only when its publication commit is synchronized with
`origin/master` and the workflow associated with that SHA concludes in
`success`; this document does not assert that criterion is met.

Original evaluation date: 2026-07-23.
SEC-FE-1B revalidation date: 2026-10-05.

## Context and attribution

- Branch and base HEAD: `master`,
  `265d7ec6c08f77433280d1d1b0e99465b6272708`.
- The initial working tree contained only the 12 intentional QA-FE-1A files.
- QA-FE-1A added the seven exact Karma/Jasmine development dependencies.
- Those additions did not introduce a new vulnerable package or a new route
  to an existing advisory.
- The QA-FE-1A lock resolution changed `ws` from 8.20.0 to 8.21.1 and removed
  one pre-existing high finding.

The base and current lockfiles were audited at the same time against the same
public advisory database.

| Audit | Low | Moderate | High | Critical | Total |
|---|---:|---:|---:|---:|---:|
| HEAD before QA-FE-1A | 7 | 19 | 36 | 3 | 65 |
| QA-FE-1A before SEC-FE-1A | 7 | 19 | 35 | 3 | 64 |
| QA-FE-1A after SEC-FE-1A | 7 | 19 | 35 | 1 | 62 |
| Production after SEC-FE-1A | 0 | 0 | 8 | 0 | 8 |

Counts are evidence for the 2026-07-23 capture. Future gates must compare
advisory IDs and dependency paths, not rely only on totals.

## Compatible transitive correction

`frontend/package.json` remained byte-for-byte unchanged. Normal npm
resolution was limited to `frontend/package-lock.json`:

| Package | Before | After | Parent ranges |
|---|---:|---:|---|
| `shell-quote` | 1.8.3 | 1.10.0 | `launch-editor@2.13.2`: `^1.8.3` |
| `websocket-driver` | 0.7.4 | 0.7.5 | `sockjs@0.3.24`: `^0.7.4`; `faye-websocket@0.11.4`: `>=0.5.1` |

Only version, resolved URL and integrity changed for those two lockfile
nodes. No direct dependency, override, resolution, force option, legacy peer
mode or toolchain upgrade was used.

The following advisories are no longer present:

- `GHSA-w7jw-789q-3m8p`;
- `GHSA-395f-4hp3-45gv`;
- `GHSA-mp7j-qc5w-4988`;
- `GHSA-xv26-6w52-cph6`.

## Exposure

| Area | Result |
|---|---|
| Installation | Both packages are dev-only and have no install lifecycle script. |
| Unit tests | Karma/Jasmine does not execute either vulnerable route. |
| Build | Neither package participates in the Angular production bundle generation. |
| Local/CI dev server | Webpack uses `ws` by default; SockJS/websocket-driver is not selected. The editor route does not pass the vulnerable `specifiedEditor` input to shell-quote. |
| Runtime | Neither package is present in the static browser artifact or final Nginx image. |

## Temporarily accepted `tar` risk — historical 2026-07-23 capture

`tar@6.2.1` remains unchanged through
`@angular/cli@18.2.12 -> pacote@18.0.6`.

The remaining critical entry is accepted temporarily only under all these
conditions:

- it remains dev-only and absent from the browser/runtime artifact;
- current unit, build and E2E commands do not execute the local `tar` path;
- do not run `ng add` or `ng update` against untrusted packages or sources;
- do not process arbitrary TAR archives through the local Angular CLI;
- repeat both audits after every lockfile change;
- remediate in NG-UP-20;
- the historical acceptance expired at the NG-UP-20 closeout or on 2026-08-22,
  whichever occurred first;
- there is no automatic renewal.

## SEC-FE-1B current revalidation

`tar@6.2.1` remains dev-only, outside the production audit, absent from the
browser bundle/runtime image, and not executed by the current unit-test,
build, focal E2E or CI paths. QA-FE-1A did not introduce `tar` or its
vulnerabilities. No compatible fix exists within Angular CLI 18 under the
current restrictions; remediation remains assigned to NG-UP-20.

The current full audit is 82 findings (6 low, 22 moderate, 51 high,
3 critical). The current production-only audit is 8 findings (4 moderate,
4 high, 0 critical). The material change since the 2026-07-23 evaluation is
the additional advisory `GHSA-r292-9mhp-454m / CVE-2026-73566`, affecting
`tar <=7.5.20`, fixed in `7.5.21`; `tar@6.2.1` remains affected.

Decision: `RENEW_SHORT_RISK_ACCEPTANCE`.

The renewed acceptance expires at NG-UP-20 closeout or on 2026-10-19,
whichever occurs first. There is no automatic renewal. Re-audit both scopes
after every lockfile change. Do not run `ng add` or `ng update` with untrusted
packages or sources, do not process arbitrary TAR archives, do not use
overrides or resolutions, and do not add `tar` as an artificial direct
dependency. Start NG-UP-NODE immediately after QA-FE-1A is closed and
continue without unnecessary pauses through NG-UP-19 and NG-UP-20.

## Production Angular findings

The eight high production package entries are pre-existing Angular 18
dependencies:

- `@angular/animations`;
- `@angular/common`;
- `@angular/compiler`;
- `@angular/core`;
- `@angular/forms`;
- `@angular/platform-browser`;
- `@angular/platform-browser-dynamic`;
- `@angular/router`.

QA-FE-1A did not introduce or increase them. Angular 18 has no sufficient
supported patch. NG-UP-19 must verify that an aligned 19.2.27 dependency set
clears the reported advisory ranges. The roadmap must then continue through
NG-UP-20 so the application and CLI return to a supported major and the
remaining `tar@6` path is eliminated.

A new production deployment from Angular 18 remains blocked. NG-UP-NODE,
NG-UP-19 and NG-UP-20 have not been started by SEC-FE-1A.

## Validation evidence

| Validation | Result |
|---|---|
| npm metadata and four official advisories | PASS |
| Temporary resolution simulation | PASS — exactly two lock nodes |
| `npm ci` | PASS — 951 packages installed |
| `npm ls --all` | PASS |
| Target dependency tree and explanations | PASS |
| Full audit (historical 2026-07-23) | 62 total: 7 low, 19 moderate, 35 high, 1 critical |
| Production audit (historical 2026-07-23) | 8 high, 0 critical |
| SEC-FE-1B current full audit (2026-10-05) | 82 total: 6 low, 22 moderate, 51 high, 3 critical |
| SEC-FE-1B current production audit (2026-10-05) | 8 total: 4 moderate, 4 high, 0 critical |
| `npm test` | PASS — 13/13, 0 skipped |
| `npm run build` | PASS |
| Playwright Chromium installation | PASS |
| `npm run e2e:billing-series:ci` | PASS — 6/6, 0 skipped |
| Unexpected focal console/page errors | None |
| `npm run e2e:no-write` | PARTIAL — 1 passed, 2 authenticated cases skipped |
| Real backend writes | None |
| Local equivalent of frontend CI job | PASS |
| Production bundle scan | PASS |

The focal E2E scenarios remain fully simulated. They assert one mutation, one
reload and no retry. The authenticated no-write skips are not reported as
passes.

## Bundle and deployment gate

The generated browser artifact contains no package signatures for
`shell-quote`, `websocket-driver`, `node-tar`, `launch-editor`, `sockjs`,
Karma, Jasmine or `node_modules`.

The frontend Dockerfile installs dependencies only in the Node build stage.
The final image is Nginx and receives only
`dist/erp-pos-frontend/browser`; it does not contain `node_modules`.

Before a new production deployment:

1. satisfy the QA-FE-1A remote-closure criterion: publication commit
   synchronized with `origin/master` and its associated GitHub Actions
   workflow in `success`;
2. complete NG-UP-NODE;
3. complete NG-UP-19 and confirm the eight high production entries are gone;
4. complete NG-UP-20 and confirm Angular is supported and `tar@6` is gone;
5. repeat full and production audits.

QA-FE-2 and 4D-2C remain deferred. QA-FE-1A remains locally implemented and
validated but is not declared remotely closed until its publication commit is
published, `HEAD == origin/master`, and the workflow for that SHA concludes
in `success`. No commit, push or tag was created by this correction.

## SEC-FE-1C — GHSA-pqg4-j6r4-53mv shell-quote remediation (2026-10-06)

Status: **PASS LOCAL**. This is a security gate before the separate Git/CI
closeout of NG-UP-NODE; NG-UP-NODE is not closed and NG-UP-19 has not started.

- Advisory: `GHSA-pqg4-j6r4-53mv / CVE-2026-102422` (fixed from
  `shell-quote@1.11.0`). Initial dependency: `shell-quote@1.10.0`.
- Origin: `PREEXISTING_DEPENDENCY_NEW_ADVISORY`. Reachability classification:
  `VULNERABLE_CODE_NOT_REACHED`. Decision: `REMEDIATE_BEFORE_NG_UP_NODE_CLOSE`.
- The sole dev-only path remains
  `@angular-devkit/build-angular@18.2.12 -> webpack-dev-server@5.0.4 ->
  launch-editor@2.13.2 -> shell-quote`. The parent declares `^1.8.3`.
- Under Node `22.23.3` and npm `10.9.9`, the scoped command
  `npm update shell-quote --package-lock-only --save --ignore-scripts --no-audit --no-fund`
  naturally selected `shell-quote@1.12.0`, the latest compatible resolution
  returned by npm. This is later than the first patched version, `1.11.0`,
  without imposing an artificial pin. The lockfile delta is only that node's
  `version`, `resolved` and `integrity`; `dev: true` remains unchanged.
  Initial lockfile SHA-256:
  `F5687FB19205807537E5A705E25AFB8147E03931EE7C3F059985863331CEA344`.
  `package.json` retains its pre-existing NG-UP-NODE-only diff: no direct
  dependency, override or resolution was added.
- `npm ci`: PASS (955 packages). `npm ls --all`: PASS, with only unmet
  optional platform dependencies in its tree output. `npm ls shell-quote --all`
  and `npm explain shell-quote` confirm one `1.12.0` copy on the same path.
- `npm test`: 13/13 PASS, 0 skipped. Chromium used
  `CHROMIUM_USER_FLAGS=--no-sandbox` only in an ephemeral validation
  container; no production or repository setting changed. `npm run build`:
  PASS, Angular 18.2.x unchanged. `npm run e2e:billing-series:ci`: 6/6 PASS.
- Full `npm audit`: 83 before (6 low, 22 moderate, 51 high, 4 critical) to
  82 after (6 low, 22 moderate, 51 high, 3 critical). The advisory and the
  `shell-quote` finding are absent after remediation; no other severity
  count changed. `npm audit --omit=dev`: unchanged at 8 (4 moderate,
  4 high, 0 critical). Audit exit code 1 reflects remaining unrelated
  findings and is not reported as a clean audit.
- `tar@6.2.1` and its route remain untouched and separate. Its temporary
  acceptance still expires at NG-UP-20 closeout or 2026-10-19, whichever
  comes first; SEC-FE-1C neither remediates nor extends it.
- The generated production browser bundle contains no signatures of
  `shell-quote`, `launch-editor` or `webpack-dev-server`.
- Docker build PASS from a temporary source context excluding dependencies,
  artifacts and `.env` files: `node:22.23.3-alpine3.24` ran `npm ci` and
  `npm run build`; the final Nginx image contains neither Node nor npm.
  An initial attempt failed before compilation because a reused temporary
  context lacked `nginx.conf`; the complete-context retry passed. The
  temporary image tag was removed; no image was published.
- The eight pending NG-UP-NODE files were preserved. No commit, push or tag
  was made. NG-UP-NODE is implemented and locally validated, ready to return
  to its own Git/CI closeout gate; it is not declared closed here.

# ERP/POS E2E

## Authenticated no-write gate (QA-E2E-AUTH-1A)

Use the same orchestrator locally and in the independent CI job `e2e-auth`:

```powershell
npm run e2e:no-write
# Also run existing Angular units, build and six mocked billing-series E2E:
node e2e/qa/run-qa.mjs --regression
```

Required: Node 22.23.3, npm 10.9.9, Java 17 (java/jar), local Docker Linux engine.
No pre-existing Angular/backend/database, credentials or manual seed is required.
Preparation downloads pinned-version tool images and installs the unchanged lockfile
inside a tool image. This is separate from the isolated application runtime.

`e2e:auth`, `e2e:no-write` and `e2e:no-write:ci` run the full gate.
`e2e:no-write:headed` uses Chromium with Xvfb **inside Docker**, not a visible
desktop window. It preserves the same network boundary.
`e2e:install` is unnecessary for this gate; browsers are in the tool image.

### Fail-closed environment

Do not supply `E2E_*`, `QA_*`, `SPRING_*`, `DB_*`, `JWT_*`, `BILLING_*`,
PostgreSQL credentials/target variables, AWS credential variables, Java/Node
option injection or Docker endpoint overrides. The launcher rejects their
**presence**, including false-valued legacy flags. It does not silently ignore
them. Start in a clean process; do not delete or change persistent user settings.

No staging, external URL, production datasource or manual QA credentials are
accepted. `E2E_ALLOW_WRITES` and `E2E_ALLOW_STAGING` cannot enable bypasses.
Never populate a real `.env` to run this gate.

### Boundary and identity

The orchestrator creates a random run ID and a Docker `network:none` namespace.
PostgreSQL, backend and Angular/browser share only that namespace's loopback.
There are no non-loopback interfaces, routes, published ports, Docker socket
mounts or persistent database volumes. Runtime containers drop all capabilities,
have read-only roots and no-new-privileges. They cannot reach host loopback or
the controlled external decoy; probes do not depend on Playwright interception.

Before Flyway, the launcher validates container ID/labels, namespace,
database/user, random PostgreSQL marker, cluster system ID, address and port.
Spring repeats JDBC attestation before initialization. Runtime diagnostics check
the real datasource and run ID through the temporary Angular proxy.
The diagnostic/filter/fixtures exist only on the test classpath and are absent
from the packaged production jar.

### Auth and no-write

A random CAJERO is seeded only in the disposable database; unnecessary seed
accounts are disabled there. A synthetic ALMACENERO supports a negative test.
A run-specific product has stock 10. No cash session, sale, movement or fiscal
document is created by the E2E journeys.

Setup performs real login and `auth/me`, checks exact user/CAJERO role, then
saves session state to container tmpfs `/qa-run/qa-user.json` (directory 0700,
file 0600). Nothing is saved to `e2e/.auth`, OneDrive or the host checkout.
Each journey uses a fresh context; no silent session refresh or missing-data skip.

Two independent request controls apply:

- Playwright: context-wide exact-origin/read-path allowlist, only login POST,
  service workers blocked, WebSockets rejected. Any blocked attempt fails the test.
- Test-only backend filter: fixed read allowlist and login only, before security
  and business controllers; unknown reads and commercial mutations are rejected.
  Auth/JWT/RBAC remain real and unchanged.

The gate requires exactly the existing three no-write titles: public login,
authenticated POS shell and authenticated POS interactions. Setup is counted
separately. A missing/failed/skipped/retried test fails the gate.
Checkout controls may be inspected, but final sale submission is forbidden.

### Evidence and cleanup

Only sanitized stage/count/status output is emitted. No authenticated screenshots,
videos, traces or HTML report are exported. The JSON report is processed in memory;
failures show spec location/status, not response bodies or form values.
`e2e:report` only opens legacy/mocked-suite reports, not authenticated gate evidence.

Cleanup runs on success, failure and handled interruption, validating ownership
before removing only this run's containers, decoy network, image tag and temporary
directory. No global prune, existing-server reuse or foreign-process termination.
An uncleanable resource fails the run and is reported by safe role.
An abrupt host/daemon termination cannot execute a finally block: inspect remaining
`inktoy.qa.run` labels and remove only resources belonging to that interrupted run.

The existing mocked billing-series suite remains independent:
`npm run e2e:billing-series:ci`. It does not use generated QA credentials.

Details, negative-test mapping and local evidence:
[QA_E2E_AUTH_1_QA.md](../../docs/qa/QA_E2E_AUTH_1_QA.md).
CI remote verification requires a separately authorized Git/CI closure.

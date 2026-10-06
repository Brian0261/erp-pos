# Frontend testing

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

The frontend CI job performs:

1. `npm ci`;
2. `npm test`;
3. `npm run build`;
4. `npx playwright install --with-deps chromium`;
5. `npm run e2e:billing-series:ci`.

Karma remains a temporary safety baseline. A separate QA-FE-2 phase will decide
whether to retain it or migrate to Vitest after the Angular major upgrades.

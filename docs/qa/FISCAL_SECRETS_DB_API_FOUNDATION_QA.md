# Fiscal secrets DB/API foundation QA

## Result

PASS

## Objective

Add the DB/API foundation for fiscal secret references so billing profiles no longer rely on plain certificate password storage or response exposure of server/local certificate paths.

## Scope Validated

- Flyway V21 adds fiscal secret reference columns without modifying V11/V16.
- Backend request accepts fiscal secret refs and safe metadata.
- Backend response exposes only `certificateConfigured`, `providerConfigured`, `certificateAlias` and `secretProvider` for fiscal secret state.
- Backend does not map or persist plain `certificatePassword` into the domain model.
- Backend clears deprecated `certificate_password` on profile saves.
- PROD rejects direct `certificatePassword` and deprecated `certificatePath` input.
- PROD active profiles require safe fiscal refs.
- Angular billing configuration uses write-only refs and safe metadata instead of raw path/password fields.

## Validations

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 41 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 482 tests, BUILD SUCCESS.
- `npm run build`: PASS, Angular application bundle generated successfully.
- `git diff --check`: PASS, no whitespace errors; Windows CRLF conversion warnings only.

## Security Confirmations

- `.env` files were not opened or modified.
- Real certificates, keys, tokens, backups and dumps were not touched.
- No secret values were printed or added to code/docs.
- No real secret manager or secret resolver was implemented.
- No SUNAT direct integration, PSE/OSE real adapter, real digital signature, CDR, PDF/ticket fiscal, QR, notes or cancellations were implemented.

## Residual Risks

- Secret references are stored as metadata only; runtime resolution remains future work.
- Existing DB rows with deprecated plain password are scrubbed only when the profile is saved; there is no destructive backfill in V21.
- PROD runtime issuance remains blocked by `BillingRuntimeSafetyPolicy` until real provider and signer adapters exist.

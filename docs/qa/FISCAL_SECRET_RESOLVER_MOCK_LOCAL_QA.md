# Fiscal secret resolver mock/local QA

## Result

PASS

## Objective

Implement Fase 2B by adding the backend architecture for fiscal secret resolution through ports/adapters, using only a mock/local non-productive resolver.

## Implemented Scope

- Created `FiscalSecretResolverPort` in billing domain ports.
- Created `FiscalSecretResolution` and `FiscalSecretType` as safe metadata-only domain models.
- Created `LocalFiscalSecretResolverAdapter` as a non-productive infrastructure adapter.
- Integrated resolver readiness into `BillingRuntimeSafetyPolicy` so PROD requires provider, signer and secret resolver to be production-ready.
- Added backend tests for local/beta placeholder resolution, unsafe ref rejection, PROD blocking and safe error messages.

## Allowed Placeholders

- `LOCAL_NOOP_CERT`
- `LOCAL_NOOP_CERT_PASSWORD`
- `LOCAL_NOOP_PROVIDER`
- `BETA_SANDBOX_REF`
- `BETA_SANDBOX_CERT_PASSWORD`
- `BETA_SANDBOX_PROVIDER`

## Defensive Ref Validations

- Empty refs are rejected when resolving.
- Path traversal is rejected.
- Absolute paths are rejected.
- Windows drive paths are rejected.
- `file:` refs are rejected.
- Certificate/keystore-looking filenames are rejected (`.pfx`, `.p12`, `.pem`, `.crt`, `.cer`, `.key`, `.jks`, `.keystore`).
- Whitespace/control characters are rejected.
- Overly long refs are rejected.
- Error messages do not include the submitted ref value.

## Validations

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 49 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 490 tests, BUILD SUCCESS.
- `git diff --check`: PASS, no whitespace errors; Windows CRLF conversion warnings only.

## Security Confirmations

- `.env` was not opened or modified.
- No real certificates, passwords, keystores, private keys, backups or dumps were opened or touched.
- No secret values were printed or added to logs/docs/code.
- The resolver returns only safe metadata, not secret material.
- No real secret manager was implemented.
- No SUNAT direct integration was implemented.
- No PSE/OSE real adapter was implemented.
- No real digital signature, CDR, SUNAT UBL XML, fiscal PDF/ticket, QR, notes or cancellations were implemented.
- No frontend changes were made.
- No DB/Flyway changes were made in this phase.

## Residual Limitations

- Runtime secret resolution is mock/local only.
- PROD remains blocked until a real secret resolver, real signer and real provider are implemented and validated.
- V21 metadata refs remain DB/API foundation only; this phase does not resolve external vault/secret-manager refs.

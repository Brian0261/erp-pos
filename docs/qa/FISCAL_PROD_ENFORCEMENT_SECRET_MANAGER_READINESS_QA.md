# Fiscal PROD enforcement / secret manager readiness QA

## Result

PASS

## Objective

Implement Fase 2C with non-sensitive fiscal configuration, production fail-fast validation and stronger PROD enforcement without implementing a real secret manager or real fiscal emission.

## Implemented Scope

- Added non-sensitive fiscal properties with safe defaults:
  - `billing.secrets.provider=LOCAL`
  - `billing.secrets.production-enabled=false`
  - `billing.electronic.provider=MOCK`
  - `billing.signer.provider=NOOP`
- Added `BillingFiscalStartupValidator` to fail fast when `production-enabled=true` and any configured provider/signer/resolver is not production-capable.
- Kept runtime ports unchanged: `FiscalSecretResolverPort`, `ElectronicBillingProviderPort`, `XmlSignerPort`.
- Strengthened `BillingRuntimeSafetyPolicy` so PROD signing and accepted provider results also require full production readiness.
- Rejected `LOCAL_*` and `BETA_*` placeholders in active PROD billing profiles without echoing submitted values.
- Rejected `LOCAL`, `MOCK` and `NOOP` as active PROD `secretProvider` values.

## Validated Cases

- Default config keeps local/mock/noop mode allowed because `production-enabled=false`.
- `production-enabled=true` with `LOCAL` secret provider fails fast.
- `production-enabled=true` with `MOCK` electronic provider fails fast.
- `production-enabled=true` with `NOOP` signer fails fast.
- `production-enabled=true` with non-production beans fails fast even if config names are production-capable.
- `production-enabled=true` with production-capable config names and production-capable beans passes validation.
- PROD profile rejects `LOCAL_*` certificate ref placeholders.
- PROD profile rejects `BETA_*` password ref placeholders.
- PROD profile rejects local/mock/noop secret providers.
- Existing LOCAL/BETA simulation flow remains allowed.

## Commands

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 58 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 499 tests, BUILD SUCCESS.

## Security Confirmations

- `.env` was not opened or modified.
- No real certificates, passwords, keystores, private keys, backups or dumps were opened or touched.
- No secret values were printed or added to logs/docs/code.
- No real secret manager adapter was implemented.
- No AWS Secrets Manager, Vault, GCP Secret Manager or Azure Key Vault integration was implemented.
- No SUNAT direct integration, PSE/OSE real adapter, real digital signature, CDR, SUNAT UBL XML, fiscal PDF/ticket, QR, notes or cancellations were implemented.
- No frontend changes were made.
- No DB/Flyway changes were made in this phase.

## Residual Limitations

- `SECRET_MANAGER` and `EXTERNAL` are readiness names only; there is no real adapter yet.
- PROD emission remains blocked until real production-capable provider, signer and resolver implementations exist.
- Fiscal refs remain metadata/references; this phase does not resolve external vault or secret-manager values.

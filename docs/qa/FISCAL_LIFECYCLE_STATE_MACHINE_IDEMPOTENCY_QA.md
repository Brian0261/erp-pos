# Fiscal lifecycle state machine + idempotency QA

## Result

PASS

## Objective

Implement Fase 3A by hardening the internal fiscal lifecycle before real PSE/OSE, SUNAT, digital signature, CDR or fiscal PDF integrations.

## Implemented Scope

- Added `ElectronicDocumentLifecyclePolicy` as the central lifecycle policy.
- Defined allowed transitions:
  - `DRAFT -> GENERATED`
  - `GENERATED -> SIGNED`
  - `SIGNED -> SENT`
  - `SENT -> ACCEPTED`
  - `SENT -> REJECTED`
  - `SENT -> ERROR`
- Blocked invalid transitions such as:
  - `DRAFT -> SIGNED`
  - `ACCEPTED -> GENERATED/SIGNED/SENT`
  - `REJECTED -> SIGNED/SENT`
  - `ERROR -> SENT`
- Added document-level pessimistic locking through `findByIdForUpdate` for lifecycle operations.
- Made `generateXml` idempotent when status is already `GENERATED`.
- Made `sign` idempotent when status is already `SIGNED`.
- Made `send` block repeated sends from `SENT` or final statuses without calling the provider again.
- Added non-destructive V22 migration with a precheck and a partial unique index by active `sale_id`.

## Migration

- Created `V22__billing_lifecycle_hardening.sql`.
- Precheck fails safely if active duplicate electronic documents already exist for the same sale.
- Creates `uq_electronic_documents_sale_active` on `electronic_documents (sale_id)` where `status <> 'CANCELLED'`.
- Does not modify V11, V16 or V21.
- Does not delete, update or backfill existing data.

## Validated Cases

- Valid `DRAFT -> GENERATED` transition.
- Valid `GENERATED -> SIGNED` transition.
- Valid `SIGNED -> SENT -> ACCEPTED` transition.
- Valid `SIGNED -> SENT -> REJECTED` transition.
- Valid `SIGNED -> SENT -> ERROR` transition.
- Invalid `DRAFT -> SIGNED` transition is blocked.
- Invalid sign after final status is blocked.
- Repeated `generateXml` on `GENERATED` does not duplicate status history.
- Repeated `sign` on `SIGNED` does not duplicate status history.
- `generateXml` is blocked after `SIGNED`.
- `send` does not call the provider again for `SENT` or final statuses.
- Creating another document for the same sale does not consume the requested series correlativo.
- PROD remains blocked without production-ready provider, signer and resolver.
- Lifecycle error messages do not expose refs, paths, placeholders or secrets.

## Commands

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 67 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 508 tests, BUILD SUCCESS.
- `git diff --check`: PASS, no whitespace errors. Git reported only LF/CRLF warnings on Windows.

## Security Confirmations

- `.env` was not opened or modified.
- No real certificates, passwords, keystores, private keys, backups or dumps were opened or touched.
- No secret values were printed or added to logs/docs/code.
- No real secret manager adapter was implemented.
- No AWS Secrets Manager, Vault, GCP Secret Manager or Azure Key Vault integration was implemented.
- No SUNAT direct integration, PSE/OSE real adapter, real digital signature, CDR, SUNAT UBL XML, fiscal PDF/ticket, QR, notes or cancellations were implemented.
- No frontend changes were made.

## Deferred To Fase 3B/3C

- Retry policy and retry limits.
- Attempts table.
- Provider response taxonomy and structured response storage.
- Provider correlation id and response codes.
- Evidence versioning, hashes and storage metadata.
- CDR and PDF/ticket evidence types.
- Formal fiscal cancellations and notes.

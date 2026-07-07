# Fiscal attempts send audit QA

## Result

PASS

## Scope

Fase 3B-1 implements the fiscal attempt model and audit records for SEND only.

## Implemented

- Created non-destructive migration `V23__billing_fiscal_attempts.sql`.
- Created table `electronic_document_attempts`.
- Added domain model `ElectronicDocumentAttempt`.
- Added enums `FiscalOperation`, `FiscalAttemptResult` and `FiscalErrorCategory`.
- Added `ElectronicDocumentAttemptRepositoryPort`.
- Added JPA entity, Spring Data repository, mapper and persistence adapter for attempts.
- Added `FiscalAuditSanitizer` for provider message/code/ticket/correlation id sanitization.
- Added `FiscalAttemptAuditService` with separated audit transactions for attempts.
- Integrated SEND attempts in `ElectronicDocumentApplicationService.send()`.

## Send Audit Behavior

- SEND creates a `STARTED` attempt before provider call.
- Provider `ACCEPTED` finalizes the attempt as `SUCCESS`.
- Provider `REJECTED` finalizes the attempt as `FAILED` with `PROVIDER_REJECTED`.
- Provider `ERROR` finalizes the attempt as `FAILED` with conservative `PROVIDER_UNAVAILABLE`.
- Blocked sends from `SENT`, final statuses, missing signed XML or PROD readiness failures record `BLOCKED` without provider call.
- Provider exceptions record `FAILED`, classify basic recoverable categories and rethrow the exception.
- Attempt numbers are incremental by document and operation.
- LOCAL/BETA attempts are marked `simulated=true`.

## Security

- Attempts do not store full XML, CDR, PDF, request payload or response payload.
- Attempts store request/response hashes only.
- Provider text is sanitized and truncated before persistence.
- Sanitization redacts tokens, passwords, secret refs, local paths, certificate filenames and XML snippets.
- No retry automatic, scheduler, backoff or real resend was implemented.

## Validation

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 72 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 513 tests, BUILD SUCCESS.

## Out Of Scope

- PSE/OSE real integration.
- SUNAT direct integration.
- Real digital signature.
- Complete SUNAT UBL XML.
- Real CDR.
- Fiscal PDF/ticket.
- QR.
- Credit/debit notes.
- Voiding/cancellation communication.
- Production real enablement.
- Secret manager real implementation.
- Automatic retry.
- Frontend changes.

## Security Confirmations

- `.env` was not opened or modified.
- No secrets were read or printed.
- No real certificates, keystores, private keys, backups or dumps were touched.

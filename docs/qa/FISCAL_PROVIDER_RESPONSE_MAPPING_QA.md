# Fiscal provider response mapping QA

## Result

PASS

## Scope

Fase 3B-2 implements the internal fiscal error taxonomy and provider response mapping for SEND attempts.

## Implemented

- Added `ProviderSendStatus` for internal provider statuses.
- Expanded `ProviderSendResult` while keeping the legacy `status`, `ticket`, `message` constructor.
- Added provider code and provider correlation id fields.
- Added error category, recoverable, observed, pending and simulated fields.
- Added factory methods for accepted, observed, rejected, pending, timeout, unavailable, communication error and configuration error results.
- Added `FiscalProviderResultClassifier` and `FiscalProviderResultClassification`.
- Updated SEND flow to use the central classifier.
- Updated attempts to store provider status, provider code and provider correlation id through the existing sanitizer.

## Mapping

- `ACCEPTED`: attempt `SUCCESS`, document `ACCEPTED`, no error category.
- `OBSERVED`: attempt `SUCCESS`, document `ACCEPTED`, category `PROVIDER_OBSERVED`, non-recoverable.
- `REJECTED`: attempt `FAILED`, document `REJECTED`, category `PROVIDER_REJECTED`, non-recoverable.
- `PENDING`: attempt `PENDING`, document remains `SENT`, category `PROVIDER_PENDING`, non-recoverable for now.
- `TIMEOUT`: attempt `FAILED`, document `ERROR`, category `PROVIDER_TIMEOUT`, recoverable.
- `UNAVAILABLE`: attempt `FAILED`, document `ERROR`, category `PROVIDER_UNAVAILABLE`, recoverable.
- `COMMUNICATION_ERROR`: attempt `FAILED`, document `ERROR`, category `COMMUNICATION_ERROR`, recoverable.
- `CONFIGURATION_ERROR`: attempt `FAILED`, document `ERROR`, category `CONFIGURATION_ERROR`, non-recoverable.
- Generic `ERROR`: attempt `FAILED`, document `ERROR`, conservative category `PROVIDER_UNAVAILABLE` unless a category is explicit.

## Security

- Provider message is not used as the primary source for critical classification when explicit status/category exists.
- Provider message, code, ticket and correlation id continue through `FiscalAuditSanitizer`.
- Attempts do not store full XML, CDR, PDF, headers, request payloads or response payloads.
- No tokens, passwords, secret refs, local certificate paths or certificate filenames are intentionally persisted.

## Retry Policy

- No automatic retry was implemented.
- No scheduler, backoff, cooldown or polling was implemented.
- `PENDING` is modeled for future controlled handling, but no status query is implemented.
- Recoverable categories only mark audit metadata for future 3B-3 work.

## Validation

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 79 tests, BUILD SUCCESS.
- `./mvnw test`: PASS, 520 tests, BUILD SUCCESS.

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
- Polling or provider status query.
- Frontend changes.

## Security Confirmations

- `.env` was not opened or modified.
- No secrets were read or printed.
- No real certificates, keystores, private keys, backups or dumps were touched.

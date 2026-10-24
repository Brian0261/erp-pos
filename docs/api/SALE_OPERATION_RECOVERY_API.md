# POS-RECOVERY-HARDENING-A — durable recovery protocol v1

Local implementation on `feat/pos-recovery-hardening-a`, based on `77c53fa3c4b33f3dff5271559409edd56a3f772a`.
This document does not authorize publication or deployment. Administrative continuity belongs to B.

## REST contract

All four routes require JWT and ADMIN, SUPERVISOR or CAJERO. Every role accesses only its own
`(actor_user_id, operation_id)` identities. Actor UUID comes exclusively from the authenticated principal.
Recovery responses, including errors, use `Cache-Control: no-store`. Unauthenticated requests receive401,
disallowed roles403, and foreign or absent operations404 without disclosing existence.

| Method and route | Behavior |
| --- | --- |
| POST `/api/v1/sales/operations` |201; prepare an immutable command idempotently, without commercial effects |
| GET `/api/v1/sales/operations` |200; owner page `{items,page,size,totalItems,totalPages}` |
| GET `/api/v1/sales/operations/{operationId}` |200; owner detail and recoverable command when PREPARED |
| POST `/api/v1/sales/operations/{operationId}/cancel` |200; PREPARED to terminal CANCELLED; repeating cancellation is harmless |

Preparation body:

```json
{
  "protocolVersion": 1,
  "origin": "POS",
  "operationId": "00000000-0000-4000-8000-000000000001",
  "command": {"operationId":"00000000-0000-4000-8000-000000000001","warehouseId":1,"confirmedTotal":10,"items":[{"productId":1,"quantity":1,"confirmedUnitPrice":10,"discountAmount":0}],"payments":[{"paymentMethod":"CASH","amount":10,"reference":null}]},
  "quoteId": null,
  "quoteCommand": null,
  "receiptIntent": {"receiptType":"TICKET","payload":null}
}
```

This is a synthetic schema example, not a request to execute against an existing environment.
POS requires command.operationId to equal the envelope identity. Receipt intent is TICKET with no payload,
or RECEIPT/INVOICE with the existing create-from-sale payload (`documentType`, `billingSeriesId`,
`customerName`, `customerDocument`). Quote origin requires quoteId and the existing conversion request
in quoteCommand, command=null and receiptIntent=null. Preparation and conversion share canonical mapping.
No actor, cash owner, sale result or execution source can be supplied by the client.

Page defaults: page0, size20; accepted page0..100000 and size1..100. Optional state is
PREPARED/COMPLETED/CANCELLED. `attention=true` selects pending preparations, unavailable results,
or completed operations with pending electronic intent. Stable ordering is created_at DESC,operation_id.
Invalid pagination/UUID gives400; invalid business content422. Line limits:200items and20payments.

Operation response fields: operationId, protocolVersion, origin, state, cashRegisterSessionId, saleId,
quoteId, command, quoteCommand, receiptIntent, documentId, documentStatus, receiptState, createdAt, updatedAt.
List rows omit command snapshots and receipt customer data. Detail returns snapshots only while PREPARED.
Legacy results have protocolVersion0/originLEGACY and require conservative receipt review.

## State, idempotency and privacy

- PREPARED has no sale, payment, stock or cash effect. Multiple pending identities per owner are allowed.
- PREPARED can become COMPLETED atomically with the original checkout transaction, or CANCELLED.
- COMPLETED with a purged sale is exposed as RESULT_UNAVAILABLE. It never becomes PREPARED again.
- A second preparation must match the unchanged checkout-v1 hash and independent receipt/origin fingerprint.
  Different legitimate purchases always use different operationIds, even when all amounts and items match.
- A new direct sale or quote conversion without preparation gives409 OPERATION_PREPARATION_REQUIRED.
  Historical completed replays and V27 tombstones keep their prior semantics.
- Changed commands give409 OPERATION_CONTENT_MISMATCH; CANCELLED cannot execute; an unavailable result
  gives409 OPERATION_RESULT_UNAVAILABLE. Resource wait failures give409 OPERATION_BUSY and rollback.
- Original cash UUID ownership and OPEN status are revalidated under the cash row lock. A preparation
  cannot move to a replacement cash session. A completed result remains readable after closure.
- Completion removes command/quote snapshots. Pending electronic intent retains only data needed for creation;
  document linking and cancellation redact customer payload while preserving fingerprints and identity.
- Safe transition logs include actor, operation, transition/result and timestamp after commit. They contain no
  request body, credentials or payment/customer payload.

Execution continues through POST `/api/v1/sales` or POST `/api/v1/quotes/{id}/convert-to-sale` respectively.
There is no acknowledge or alternative checkout route. Opening/reloading a page performs no execution.
Lost prepare responses require owner GET verification and an explicit cashier decision. Completed recovery
never runs another commercial POST. A price conflict leaves the frozen identity intact; cancellation and a
new cashier confirmation are required to replace that intent.

## Concurrency and receipts

Lock order is quote when applicable, operation, original cash, sale, documents, series, catalog/stock.
Batch operations lock ordered IDs; advisory identity and row locks share the business transaction.
Waits are bounded locally, existing catalog-share and stock-NOWAIT rules remain active.
Cash closure acquires the same cash lock before computing totals. Sale void and all draft creators coordinate
before checking sale/document state. Purge locks its affected resources before child deletes, recomputes
candidate sets and preserves operation tombstones. Converted quote history blocks destructive purge.

Every create-from-sale entry point checks the operation owner and original electronic intent when available,
locks the sale before checking documents, reuses a single exactly compatible document and links it atomically.
Ambiguous/incompatible or cancelled historical documents require review. An original TICKET does not prevent
later legitimate manual billing. The V22 unique noncancelled sale_id index remains enforced and V28 revalidates it.
documentStatus is the actual local fiscal status: a linked DRAFT proves local creation only, not signing or acceptance.

## Migration and coordinated rollout

V28 additively extends sale_operations. V27 PK, unique sale_id, foreign keys and tombstones are preserved.
Existing rows become legacy COMPLETED, including sale_id=NULL. Duplicate active documents stop and roll back
the migration without repairing/deleting history. No historical migration is edited.

Future rollout must drain old checkout writers, apply V28 and cut over the matching backend/frontend together.
Old clients cannot execute unprepared new operations; no compatibility bypass is provided. Rollback requires
stopping new writes and preserving the expanded metadata; an old backend must not resume accepting bypass writes.
No rollout, scheduler, retention deletion job, administrative B screen or fiscal-provider change is part of A.

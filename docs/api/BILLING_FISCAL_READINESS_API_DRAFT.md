# Billing Fiscal Readiness API Draft

## Status

Draft only. This document does not represent an implementation.

## Proposed Endpoints

- `GET /api/v1/billing/documents/{id}/fiscal-readiness`
- `GET /api/v1/billing/documents/{id}/attempts`
- `POST /api/v1/billing/documents/{id}/retry-send` (deferred, not implemented in 3B-4)

## Minimal `fiscal-readiness` Response

```json
{
  "documentId": 123,
  "status": "ERROR",
  "environment": "LOCAL",
  "providerOutcome": "TIMEOUT",
  "retryEligibility": {
    "eligible": true,
    "reasonCode": "RECOVERABLE_PROVIDER_TIMEOUT",
    "message": "El envio fallo por timeout del provider. Puede reintentarse manualmente.",
    "recoverable": true,
    "category": "PROVIDER_TIMEOUT",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_HISTORY", "VIEW_ATTEMPTS", "RETRY_SEND"],
  "operatorSeverity": "WARNING",
  "requiresConfirmation": true,
  "displayMessage": "El envio fallo por una condicion recuperable. Puede reintentarse manualmente.",
  "lastAttempt": {
    "operation": "SEND",
    "attemptNumber": 1,
    "result": "FAILED",
    "errorCategory": "PROVIDER_TIMEOUT",
    "recoverable": true,
    "providerStatus": "TIMEOUT",
    "providerMessage": "Provider timeout",
    "startedAt": "2026-07-09T00:00:00Z",
    "finishedAt": "2026-07-09T00:00:01Z",
    "simulated": true
  }
}
```

## `retryEligibility` Structure

- `eligible`
- `reasonCode`
- `message`
- `recoverable`
- `category`
- `lastAttemptNumber`

## `lastAttempt` Structure

- `operation`
- `attemptNumber`
- `result`
- `errorCategory`
- `recoverable`
- `providerStatus`
- `providerMessage`
- `startedAt`
- `finishedAt`
- `simulated`

## Example Payloads

### `ERROR` recuperable

```json
{
  "documentId": 123,
  "status": "ERROR",
  "environment": "LOCAL",
  "providerOutcome": "TIMEOUT",
  "retryEligibility": {
    "eligible": true,
    "reasonCode": "RECOVERABLE_PROVIDER_TIMEOUT",
    "message": "El envio fallo por timeout del provider. Puede reintentarse manualmente.",
    "recoverable": true,
    "category": "PROVIDER_TIMEOUT",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_HISTORY", "VIEW_ATTEMPTS", "RETRY_SEND"],
  "operatorSeverity": "WARNING",
  "requiresConfirmation": true,
  "displayMessage": "El envio fallo por una condicion recuperable. Puede reintentarse manualmente."
}
```

### `ERROR` no recuperable

```json
{
  "documentId": 123,
  "status": "ERROR",
  "environment": "LOCAL",
  "providerOutcome": "CONFIGURATION_ERROR",
  "retryEligibility": {
    "eligible": false,
    "reasonCode": "NON_RECOVERABLE_CONFIGURATION_ERROR",
    "message": "El envio no puede reintentarse. Revise la configuracion fiscal.",
    "recoverable": false,
    "category": "CONFIGURATION_ERROR",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_HISTORY", "VIEW_ATTEMPTS"],
  "operatorSeverity": "BLOCKED",
  "requiresConfirmation": false,
  "displayMessage": "El envio no puede reintentarse. Revise la configuracion fiscal."
}
```

### `SENT/PENDING`

```json
{
  "documentId": 123,
  "status": "SENT",
  "environment": "LOCAL",
  "providerOutcome": "PENDING",
  "retryEligibility": {
    "eligible": false,
    "reasonCode": "PENDING_EXTERNAL_CONFIRMATION",
    "message": "El comprobante esta pendiente de confirmacion externa.",
    "recoverable": false,
    "category": "PROVIDER_PENDING",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_HISTORY", "VIEW_ATTEMPTS"],
  "operatorSeverity": "INFO",
  "requiresConfirmation": false,
  "displayMessage": "El comprobante esta pendiente de confirmacion externa."
}
```

### `ACCEPTED`

```json
{
  "documentId": 123,
  "status": "ACCEPTED",
  "environment": "LOCAL",
  "providerOutcome": "ACCEPTED",
  "retryEligibility": {
    "eligible": false,
    "reasonCode": "FINAL_ACCEPTED",
    "message": "El comprobante fue aceptado por el provider.",
    "recoverable": false,
    "category": null,
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_XML", "VIEW_HISTORY", "VIEW_ATTEMPTS"],
  "operatorSeverity": "SUCCESS",
  "requiresConfirmation": false,
  "displayMessage": "El comprobante fue aceptado por el provider."
}
```

### `REJECTED`

```json
{
  "documentId": 123,
  "status": "REJECTED",
  "environment": "LOCAL",
  "providerOutcome": "REJECTED",
  "retryEligibility": {
    "eligible": false,
    "reasonCode": "FINAL_REJECTED",
    "message": "El comprobante fue rechazado y no es reintentable.",
    "recoverable": false,
    "category": "PROVIDER_REJECTED",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_HISTORY", "VIEW_ATTEMPTS"],
  "operatorSeverity": "BLOCKED",
  "requiresConfirmation": false,
  "displayMessage": "El comprobante fue rechazado y no es reintentable."
}
```

### `OBSERVED`

```json
{
  "documentId": 123,
  "status": "ACCEPTED",
  "environment": "LOCAL",
  "providerOutcome": "OBSERVED",
  "retryEligibility": {
    "eligible": false,
    "reasonCode": "FINAL_OBSERVED",
    "message": "El comprobante fue aceptado con observaciones.",
    "recoverable": false,
    "category": "PROVIDER_OBSERVED",
    "lastAttemptNumber": 1
  },
  "availableActions": ["VIEW_XML", "VIEW_HISTORY", "VIEW_ATTEMPTS"],
  "operatorSeverity": "WARNING",
  "requiresConfirmation": false,
  "displayMessage": "El comprobante fue aceptado con observaciones."
}
```

## Rules

- The frontend must not calculate retry eligibility on its own.
- `retry-send` remains deferred in 3B-4.
- All payloads must remain sanitized and omit secrets/payloads.

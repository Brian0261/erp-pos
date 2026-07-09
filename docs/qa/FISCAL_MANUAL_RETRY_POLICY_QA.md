# Fiscal Manual Retry Policy QA - Fase 3B-3A

## Resultado

- Estado: PASS.
- Alcance: backend billing only.
- Metodo implementado: `ElectronicDocumentApplicationService.retrySend(Long documentId)`.
- Endpoint REST: no creado.
- Migracion Flyway: no creada.
- Retry automatico: no implementado.

## Alcance Validado

- `send()` se mantiene como primer envio desde `SIGNED`.
- `/send` no queda habilitado como retry.
- `retrySend` usa `findByIdForUpdate` antes de validar y reintentar.
- El ultimo attempt `SEND` se consulta y valida bajo el lock del comprobante.
- El retry reutiliza XML firmado existente.
- El retry no consume correlativo.
- El retry no regenera XML.
- El retry no refirma el documento.
- El retry no guarda XML completo, CDR completo, payload completo, headers, tokens, passwords, secret refs, rutas locales ni certificados.
- Los attempts mantienen hashes SHA-256 y metadata de proveedor sanitizada.
- LOCAL/BETA mantienen `simulated=true`.
- PROD sigue bloqueado sin readiness productiva.

## Estados Permitidos

- `ERROR`: permitido solo si el ultimo attempt `SEND` es `FAILED`, `recoverable=true` y la categoria es reintentable.

## Estados Bloqueados

- `DRAFT`: bloqueado.
- `GENERATED`: bloqueado.
- `SIGNED`: bloqueado con mensaje para usar envio normal.
- `SENT`: bloqueado; incluye `PENDING` reservado para consulta/polling/reconciliacion futura.
- `ACCEPTED`: bloqueado.
- `REJECTED`: bloqueado.
- `CANCELLED`: bloqueado.

## Categorias Reintentables

- `PROVIDER_TIMEOUT` con `recoverable=true`.
- `PROVIDER_UNAVAILABLE` con `recoverable=true`.
- `COMMUNICATION_ERROR` con `recoverable=true`.
- Error generico solo queda cubierto cuando el attempt termina con categoria reintentable clara y `recoverable=true`.

## Categorias No Reintentables

- `PROVIDER_REJECTED`.
- `PROVIDER_OBSERVED`.
- `PROVIDER_PENDING`.
- `CONFIGURATION_ERROR`.
- `INTERNAL_ERROR`.
- `VALIDATION_ERROR`.
- Categoria ausente o no clara.
- Cualquier attempt con `recoverable=false`.

## PENDING

- `ProviderSendStatus.PENDING` conserva documento en `SENT` y attempt `PENDING`.
- `retrySend` bloquea documentos `SENT`.
- No se implementa polling ni consulta real de estado.
- Queda diferido para reconciliacion fiscal futura.

## OBSERVED

- `ProviderSendStatus.OBSERVED` se trata como aceptado con observaciones.
- El documento queda `ACCEPTED`.
- `retrySend` bloquea documentos `ACCEPTED`.
- No se reenvia por retry manual.

## Auditoria

- Retry permitido crea nuevo attempt `SEND` con `attemptNumber + 1`.
- Se registra `STARTED` antes de llamar al provider.
- Se finaliza con `SUCCESS`, `FAILED` o `PENDING` segun `FiscalProviderResultClassifier`.
- Retry bloqueado registra `BLOCKED` usando el patron seguro existente de `FiscalAttemptAuditService.recordSendBlocked`.
- La metadata de provider sigue sanitizada por `FiscalAuditSanitizer`.
- `requestHash` y `responseHash` se mantienen como SHA-256.

## Prevencion de Doble Envio

- El documento se bloquea con `findByIdForUpdate`.
- La validacion de estado y ultimo attempt ocurre dentro del lock.
- Si el documento no esta en `ERROR`, se bloquea.
- Si no existe ultimo attempt `SEND`, se bloquea.
- Si el ultimo attempt no es `FAILED`, se bloquea.
- Si `nextAttemptNumber` ya no corresponde a `lastAttempt + 1`, se bloquea.
- No se consume nuevo correlativo.
- No se duplica XML ni firma.

## Exclusiones Confirmadas

- Sin endpoint REST.
- Sin cambios en controller.
- Sin frontend Angular.
- Sin Storefront/ecommerce.
- Sin POS visual.
- Sin retry automatico.
- Sin scheduler.
- Sin backoff automatico.
- Sin cooldown automatico.
- Sin polling real.
- Sin PSE/OSE real.
- Sin SUNAT directo.
- Sin firma digital real.
- Sin XML UBL completo.
- Sin CDR real.
- Sin PDF/ticket fiscal.
- Sin QR.
- Sin notas ni comunicacion de baja.
- Sin produccion real.
- Sin secret manager real.
- Sin migracion nueva.

## Tests Focalizados

- `shouldRetryManualFromErrorAfterTimeoutWithoutConsumingCorrelativeOrRebuildingEvidence`.
- `shouldRetryManualFromErrorAfterProviderUnavailable`.
- `shouldRetryManualFromErrorAfterCommunicationError`.
- `shouldBlockManualRetryFromErrorWhenLastAttemptWasProviderRejected`.
- `shouldBlockManualRetryFromErrorWhenLastAttemptWasConfigurationError`.
- `shouldBlockManualRetryFromErrorWhenLastAttemptWasInternalError`.
- `shouldBlockManualRetryFromErrorWhenLastAttemptIsNotRecoverable`.
- `shouldBlockManualRetryFromErrorWhenNoLastSendAttemptExists`.
- `shouldBlockManualRetryFromErrorWhenSignedXmlIsMissing`.
- `shouldBlockManualRetryFromSignedDocumentAndIndicateNormalSend`.
- `shouldBlockManualRetryFromSentPendingDocument`.
- `shouldBlockManualRetryFromAcceptedDocument`.
- `shouldBlockManualRetryFromRejectedDocument`.
- `shouldSanitizeProviderMetadataSavedByManualRetryAttempt`.
- `shouldKeepManualRetryAttemptsSimulatedInBeta`.
- `shouldKeepProdManualRetryBlockedWithoutProductionReadiness`.
- `shouldNotRetryAutomaticallyAfterRecoverableFailure`.

## Validaciones Ejecutadas

- `cd backend && .\mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 96 tests, 0 failures, 0 errors.
- `cd backend && .\mvnw test`: PASS, 537 tests, 0 failures, 0 errors.

## Limitaciones Pendientes

- Endpoint REST administrativo para retry manual queda diferido para Fase 3B-3B o posterior.
- RBAC para retry manual queda diferido junto con el endpoint.
- Flujo de consulta/polling/reconciliacion de `PENDING` queda diferido.
- Provider PSE/OSE/SUNAT real queda fuera de alcance.
- Readiness productiva real, secret manager real y firma digital real quedan fuera de alcance.
- Fase 3B-4 agrega el contrato documental de readiness para UI/API futura sin cambiar esta politica backend.

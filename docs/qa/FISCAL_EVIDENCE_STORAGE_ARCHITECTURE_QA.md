# Fiscal Evidence Storage Architecture QA - Fase 3C-4A/3C-4C

## Resultado

- Estado: PASS arquitectura + seam no productivo 3C-4C.
- Alcance: diseno seguro de storage fiscal futuro y puerto/adapters no productivos.
- Storage real: no implementado.
- Endpoint REST: no creado.
- Frontend: no tocado.

## Archivos Inspeccionados

- `ElectronicDocumentEvidence.java`
- `FiscalEvidenceStorageProvider.java`
- `FiscalEvidenceStoragePort.java`
- `FiscalEvidenceStoreCommand.java`
- `FiscalEvidenceStorageRef.java`
- `FiscalEvidenceStorageMetadata.java`
- `FiscalEvidenceVerificationResult.java`
- `StorageStoreResult.java`
- `NoopFiscalEvidenceStorageAdapter.java`
- `LegacyBillingXmlEvidenceStorageAdapter.java`
- `V24__billing_document_evidence.sql`
- `docs/billing/FISCAL_EVIDENCE_METADATA_MODEL.md`
- `docs/api/BILLING_FISCAL_READINESS_API_DRAFT.md`
- `docs/billing/FISCAL_FRONTEND_READINESS_CONTRACT.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Archivos Creados en 3C-4C

- `backend/src/main/java/com/erppos/backend/erp/billing/domain/port/FiscalEvidenceStoragePort.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/FiscalEvidenceStoreCommand.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/FiscalEvidenceStorageRef.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/FiscalEvidenceStorageMetadata.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/FiscalEvidenceVerificationResult.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/StorageStoreResult.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/model/FiscalEvidenceStorageMetadataGuard.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/persistence/NoopFiscalEvidenceStorageAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/persistence/LegacyBillingXmlEvidenceStorageAdapter.java`

## Archivos Creados

- `docs/billing/FISCAL_EVIDENCE_STORAGE_ADR.md`
- `docs/billing/FISCAL_EVIDENCE_STORAGE_THREAT_MODEL.md`
- `docs/billing/FISCAL_EVIDENCE_RETENTION_ENCRYPTION_POLICY.md`
- `docs/billing/FISCAL_EVIDENCE_BACKUP_RESTORE_RUNBOOK.md`
- `docs/qa/FISCAL_EVIDENCE_STORAGE_ARCHITECTURE_QA.md`

## Archivos Actualizados

- `docs/billing/FISCAL_EVIDENCE_METADATA_MODEL.md`
- `docs/api/BILLING_FISCAL_READINESS_API_DRAFT.md`
- `docs/billing/FISCAL_FRONTEND_READINESS_CONTRACT.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Confirmaciones

- Se agrego puerto interno y adapters no productivos, sin wiring funcional.
- Se agregaron tests focales en `BillingApplicationServiceTest`.
- No existe `openRead`.
- Legacy no expone XML firmado.
- No se creo migracion.
- No se modifico V24.
- No se integraron `sign()`, `send()` ni `retrySend()` con el puerto.
- No se creo endpoint REST.
- No se toco frontend.
- No se creo storage real.
- No se crearon adapters filesystem/S3/GCS.
- No se tocaron `.env`, secretos ni certificados reales.
- No se guardaron XML/CDR/PDF/QR completos.
- No se implemento SUNAT/PSE/OSE real.
- No se habilito retry automatico, scheduler, backoff ni polling.

## Decisiones Pendientes

- Proveedor PROD: S3, GCS u otro.
- Retencion legal y legal hold.
- KMS/SSE o cifrado equivalente.
- Roles de descarga futura.
- Auditoria de acceso y descarga.
- Migracion desde `DB_LEGACY`.

## Subfases Siguientes

- 3C-4B: Modelo/migracion avanzada.
- 3C-4C: Puerto + adapters no productivos cerrado.
- 3C-4D: Filesystem LOCAL/BETA opcional.
- 3C-4E: S3/GCS PROD futuro.
- 3C-4F: Descarga/API/auditoria.

## Limitaciones

- La arquitectura no habilita storage real.
- El contrato de descarga sigue diferido.
- 3B-3B endpoint REST protegido sigue diferida.

## Validacion 3C-4C

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 118 tests, 0 failures.
- `./mvnw test`: PASS, 560 tests, 0 failures.

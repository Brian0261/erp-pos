# Fiscal Evidence Metadata Model - Fase 3C-1/3C-4C

## Proposito

Fase 3C-1 crea la base DB/backend para registrar metadata de evidencias fiscales sin almacenar payloads completos ni integrar storage real. Fase 3C-2 conecta esa base a los flujos internos de firma/envio/retry y agrega lectura interna por documento, sin endpoint REST.

## Alcance Metadata-Only

- Nueva tabla `electronic_document_evidence` mediante migracion V24.
- Nuevo modelo de dominio `ElectronicDocumentEvidence`.
- Tipos de evidencia, storage provider y status de metadata como enums.
- Puerto, entidad JPA, mapper y adapter de persistencia.
- Validaciones defensivas para impedir payloads, secretos, rutas absolutas y hashes invalidos.
- Escritura interna de metadata `SIGNED_XML` desde firma o confirmacion de XML firmado.
- Escritura interna de metadata `PROVIDER_RESPONSE_METADATA` tras respuestas provider de `send()` y `retrySend()`.
- Lectura interna `ElectronicDocumentUseCase.evidence(Long id)` por documento.

## Evidencias Modeladas

- `SIGNED_XML`: metadata del XML firmado existente o futuro.
- `CDR`: metadata futura de constancia de recepcion, sin CDR real.
- `PDF`: metadata futura de PDF/ticket, sin PDF real.
- `TICKET`: metadata de ticket/acuse externo.
- `QR`: metadata futura de QR, sin QR real/base64.
- `PROVIDER_RESPONSE_METADATA`: metadata sanitizada de respuesta provider ligada opcionalmente a attempt.

## Storage Provider

- `NONE`: no existe storage materializado.
- `DB_LEGACY`: referencia metadata a evidencia legacy/mock existente, por ejemplo `billing_xml_files`.
- `FILESYSTEM`: reservado para storage seguro futuro.
- `S3`: reservado para storage objeto futuro.
- `GCS`: reservado para storage objeto futuro.

3C-1/3C-2 no implementan storage real. Solo registran metadata segura.

## Contrato Interno 3C-2

- `sign(id)` registra `SIGNED_XML` cuando crea el XML firmado y tambien al confirmar un documento ya `SIGNED` con XML firmado legacy existente.
- `send(id)` y `retrySend(id)` confirman metadata `SIGNED_XML` si falta antes de llamar al provider.
- `send(id)` y `retrySend(id)` registran `PROVIDER_RESPONSE_METADATA` solo despues de recibir respuesta provider y finalizar el attempt.
- Excepciones provider y bloqueos previos no crean evidence metadata automatica; se mantienen auditados por attempts.
- `ElectronicDocumentUseCase.evidence(id)` devuelve metadata interna por documento despues de validar existencia del comprobante.
- No existe endpoint REST para evidencias en 3C-2.
- No se copia XML, CDR, PDF, QR ni request/response completo a `electronic_document_evidence`.

## Readiness / API Draft 3C-3

- 3C-3 cierra solo el contrato documental para una futura consulta de resumen de evidencias.
- El draft propone `evidenceSummary` metadata-only con banderas y resúmenes seguros.
- El contrato futuro no debe revelar XML/CDR/PDF/QR completos, storage keys sensibles, payloads crudos, tokens, headers, certificados ni rutas locales.
- El resumen debe ser apto para UI/readiness y para una futura API read-only separada.
- `storageProviderSummary` debe ser un agregado seguro, nunca una ruta o clave real.
- 3C-3 no implementa endpoint REST, controller, DTO operativo ni storage real.

## Storage Fiscal Futuro 3C-4A

- 3C-4A es documental/arquitectura: ADR, threat model, politica de retencion/cifrado/auditoria y runbook preliminar.
- Storage real sigue diferido; no se implementa filesystem, S3 ni GCS.
- Antes de storage real se debe disenar `FiscalEvidenceStoragePort` y resolver proveedor, cifrado, retencion, legal hold, auditoria y roles.
- V24 basta para metadata base; 3C-4B podria agregar modelo/migracion avanzada si se aprueban campos como `retentionUntil`, `immutable`, `encryptionMode`, `storageRegion`, `versionId` o auditoria de descarga.

## Puerto Interno 3C-4C

- `FiscalEvidenceStoragePort` prepara el seam arquitectonico para storage fiscal sin conectarse a flujos existentes.
- Metodos actuales: `store`, `exists`, `verifyChecksum` y `metadataOnly`.
- No existe `openRead`; descarga y lectura de contenido quedan diferidas a 3C-4F.
- Value objects: `FiscalEvidenceStoreCommand`, `FiscalEvidenceStorageRef`, `FiscalEvidenceStorageMetadata`, `FiscalEvidenceVerificationResult` y `StorageStoreResult`.
- Los value objects solo transportan metadata permitida: documento, attempt, tipo, ambiente, provider, storage key, nombre, MIME, tamanio, hashes y flag `simulated`.
- El contrato rechaza payloads completos, XML/CDR/PDF/QR, base64, headers, tokens, passwords, certificados, claves privadas, rutas absolutas, backslash, `..`, `vault://`, `file:` y referencias cloud sensibles.

## Adapters No Productivos 3C-4C

- `NoopFiscalEvidenceStorageAdapter`: soporta `NONE`, no escribe DB/filesystem/red y devuelve metadata-only segura.
- `LegacyBillingXmlEvidenceStorageAdapter`: soporta `DB_LEGACY` y `SIGNED_XML`, consulta `BillingXmlFileRepositoryPort`, valida existencia logica y verifica checksum internamente cuando se solicita.
- Legacy no expone XML firmado, no devuelve contenido, no crea storage nuevo, no modifica `billing_xml_files` y no reemplaza el almacenamiento legacy.
- No existen adapters `FILESYSTEM`, `S3` ni `GCS` en 3C-4C.
- `sign()`, `send()` y `retrySend()` no fueron conectados a este puerto en 3C-4C.

## Subfases 3C-4

- 3C-4A: Documental/arquitectura.
- 3C-4B: Modelo/migracion avanzada.
- 3C-4C: Puerto + adapters no productivos implementados, sin storage real.
- 3C-4D: Filesystem LOCAL/BETA opcional.
- 3C-4E: S3/GCS PROD futuro.
- 3C-4F: Descarga/API/auditoria.

## Metadata Registrada por Flujo

### `SIGNED_XML`

- `storageProvider=DB_LEGACY` porque el XML firmado sigue viviendo en `billing_xml_files`.
- `storageKey=billing/{environment}/{documentId}/SIGNED_XML/{checksum}` como clave relativa/opaque.
- `fileName`, `mimeType` y `sizeBytes` vienen del XML firmado legacy.
- `checksumSha256` y `contentHashSha256` son SHA-256 del XML firmado existente.
- `simulated=true` para `LOCAL` y `BETA`.
- `attemptId=null` porque la firma no pertenece a un attempt `SEND`.

### `PROVIDER_RESPONSE_METADATA`

- `storageProvider=NONE` porque no hay payload ni storage materializado.
- `attemptId` apunta al attempt `SEND` finalizado cuando existe.
- `providerStatus`, `providerTicket` y `providerCorrelationId` se guardan sanitizados.
- `checksumSha256` se calcula sobre metadata segura de provider, no sobre payload crudo.
- `contentHashSha256=null` porque no hay archivo/contenido asociado.
- `simulated=true` para `LOCAL` y `BETA`.

## Metadata Status

- `REGISTERED`: metadata registrada.
- `AVAILABLE`: evidencia declarada disponible en storage futuro.
- `MISSING`: evidencia esperada pero no disponible.
- `REVOKED`: metadata revocada sin borrar historial.

## Relaciones

- `electronic_document_id`: obligatorio, apunta a `electronic_documents`.
- `attempt_id`: opcional, apunta a `electronic_document_attempts`.
- Si `attempt_id` se informa, el adapter valida que pertenezca al mismo documento.
- `SIGNED_XML` puede existir sin attempt porque nace del flujo de firma.
- `PROVIDER_RESPONSE_METADATA`, `CDR` y `TICKET` normalmente deberian ligarse a un attempt `SEND` en fases futuras.

## Reglas de Seguridad

La metadata rechaza:

- XML/CDR completo o fragmentos XML crudos.
- PDF real, QR real o base64 embebido.
- Headers, authorization, bearer tokens, tokens, passwords y API keys.
- Secret refs como `vault://` o `secret://`.
- `file:` y rutas locales absolutas.
- Rutas Windows como `C:\...`.
- Rutas Linux sensibles como `/etc/...`, `/home/...` o `/var/...`.
- Material de certificados o claves privadas (`BEGIN CERTIFICATE`, `BEGIN PRIVATE KEY`).

## Reglas de Hashes

- `checksum_sha256` es opcional, pero si existe debe ser 64 hex.
- `content_hash_sha256` es opcional, pero si existe debe ser 64 hex.
- Los hashes se normalizan a lowercase.

## Reglas de Storage Key

- Debe ser relativa u opaque.
- No debe ser path absoluto.
- No debe contener drive Windows.
- No debe contener backslash.
- No debe contener `..`.
- Formato futuro recomendado: `billing/{environment}/{documentId}/{evidenceType}/{hash-or-id}`.

## Append-Only y Duplicidad

- El adapter rechaza guardar evidencia con `id` existente.
- No se sobrescribe evidencia registrada.
- Se evita duplicado por `attempt_id + evidence_type + checksum_sha256` cuando `attempt_id` y checksum existen.
- Se evita mas de un `SIGNED_XML` activo por documento mientras `metadata_status <> REVOKED`.
- Se permiten multiples evidencias por documento cuando pertenecen a attempts distintos o tipos distintos.
- `send()` y `retrySend()` pueden registrar una evidencia provider por cada attempt distinto.

## LOCAL/BETA/PROD

- LOCAL/BETA pueden registrar metadata simulada con `simulated=true`.
- LOCAL/BETA pueden usar `storage_provider=NONE` o `DB_LEGACY`.
- PROD no queda habilitado para evidencia real sin storage productivo futuro.
- 3C-1/3C-2 no activan storage productivo.

## Compatibilidad

- No reemplaza `billing_xml_files`.
- `sign()`, `send()` y `retrySend()` conservan su contrato fiscal y reglas de estado; solo agregan side-effect interno de metadata segura.
- No crea endpoint REST.
- No toca frontend.
- 3C-3 solo ajusta contrato documental para lectura futura.
- 3C-4A define arquitectura; 3C-4C crea puerto/adapters no productivos sin storage real ni integracion funcional.

## Fuera de Alcance

- Endpoint REST.
- Descarga de archivos.
- Storage real filesystem/S3/GCS.
- Adapters filesystem/S3/GCS.
- Descarga/API de archivos.
- XML/CDR/PDF/QR completos.
- PSE/OSE/SUNAT real.
- Firma digital real.
- Produccion real.

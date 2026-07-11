# Fiscal Evidence Storage ADR - Fase 3C-4A/3C-4D-1

## Contexto

Las fases 3C-1, 3C-2 y 3C-3 dejaron implementada metadata fiscal segura para evidencias, lectura interna por documento y un contrato futuro `evidenceSummary`. Todavia no existe storage real, endpoint REST de evidencias, descargas ni adapters filesystem/S3/GCS.

La evidencia actual de `SIGNED_XML` referencia `billing_xml_files` mediante `DB_LEGACY`. `PROVIDER_RESPONSE_METADATA` usa `storageProvider=NONE` porque no guarda payloads.

## Decision

- Storage real fiscal sigue diferido.
- 3C-4A es solo arquitectura/documentacion.
- 3C-4C introduce `FiscalEvidenceStoragePort` y contratos internos metadata-only, sin lectura/descarga de contenido.
- 3C-4D-1 introduce un adapter filesystem LOCAL/BETA solo para payload sintetico no fiscal, deshabilitado por defecto.
- Antes de implementar storage real debe existir una fase separada con proveedor, cifrado, retencion, auditoria y permisos cerrados.
- No se debe crear filesystem/S3/GCS real hasta cerrar proveedor, cifrado, retencion, auditoria y permisos.

## Opciones Evaluadas

### `DB_LEGACY`

- Ventaja: ya existe y permite continuidad para XML firmado mock/legacy.
- Riesgo: no es storage fiscal productivo ni cubre CDR/PDF/QR reales.
- Decision: mantener temporalmente, sin reemplazar `billing_xml_files`.

### Filesystem LOCAL/BETA

- Ventaja: permite validar IO real sin cloud.
- Riesgo: path traversal, rutas absolutas, permisos del servidor, backups inconsistentes.
- Decision: 3C-4D-1 lo habilita solo como adapter no productivo para payload sintetico LOCAL/BETA, con base dir explicita y sin PROD.

### S3

- Ventaja: versioning, object lock, SSE/KMS, IAM granular, auditoria cloud.
- Riesgo: configuracion incorrecta de buckets/IAM, exposicion de object keys o URLs.
- Decision: candidato recomendado para PROD si la operacion usa AWS.

### GCS

- Ventaja: bucket policies, CMEK, versioning/retention, auditoria cloud.
- Riesgo: configuracion incorrecta de IAM, lifecycle rules o URLs firmadas.
- Decision: candidato recomendado para PROD si la operacion usa Google Cloud.

### Noop/Legacy Adapter

- Ventaja: permite introducir puerto sin storage real ni secretos.
- Riesgo: confundirse con storage productivo si no se etiqueta claramente.
- Decision: implementado en 3C-4C como seam no productivo.

## Cierre 3C-4C

- `FiscalEvidenceStoragePort` existe como puerto interno de billing.
- El contrato incluye `store`, `exists`, `verifyChecksum` y `metadataOnly`.
- No existe `openRead`; la lectura/descarga de contenido queda diferida a 3C-4F.
- `NoopFiscalEvidenceStorageAdapter` soporta solo `NONE`, no escribe DB/filesystem/red y devuelve metadata segura.
- `LegacyBillingXmlEvidenceStorageAdapter` soporta solo `DB_LEGACY` + `SIGNED_XML`, consulta `billing_xml_files`, puede verificar checksum internamente y no expone XML.
- No se integraron los adapters con `sign()`, `send()` ni `retrySend()`.
- No se creo migracion V25; V24 sigue siendo suficiente para metadata base.
- No se crearon adapters `FILESYSTEM`, `S3` ni `GCS`.

## Recomendacion LOCAL/BETA

- Mantener `DB_LEGACY` como default para `SIGNED_XML`.
- Usar `NONE` para metadata sin archivo.
- `FilesystemFiscalEvidenceStorageAdapter` queda disponible solo para pruebas controladas con payload sintetico no fiscal.
- La configuracion interna queda deshabilitada por defecto y exige base dir explicita.
- No se exponen rutas absolutas en metadata/resultados.

## Cierre 3C-4D-1

- Se agrega `FiscalEvidenceFilesystemStoreCommand` como contrato explicito de contenido sintetico controlado.
- Se agrega `FilesystemFiscalEvidenceStorageAdapter` para `FILESYSTEM`, LOCAL/BETA only.
- El adapter rechaza PROD, configuracion deshabilitada, base dir ausente, path traversal, rutas absolutas, drive Windows, `file:` y backslash.
- El adapter usa escritura temporal dentro del arbol seguro, no overwrite, checksum SHA-256, size check y cleanup de temporales.
- No existe `openRead`, descarga, endpoint REST, access audit ni integracion con `sign()`, `send()` o `retrySend()`.
- No se guardan XML/CDR/PDF/QR fiscales reales.

## Recomendacion PROD Futura

- Usar objeto privado S3 o GCS con KMS/SSE equivalente.
- Activar versioning, retencion/lock si aplica, IAM minimo y auditoria.
- No exponer buckets, rutas, object keys reales ni URLs internas en readiness.

## Consecuencias

- Se evita implementar storage inseguro prematuramente.
- 3C-4B sigue diferida hasta que exista necesidad real de campos avanzados.
- 3C-4C introdujo puerto/adapters no productivos sin dependencias cloud.
- Descargas y endpoint REST deben quedar para una fase separada.

## Riesgos

- Iniciar storage real sin decisiones de retencion/cifrado.
- Mezclar LOCAL/BETA simulado con PROD.
- Exponer storage keys sensibles en API/UI/logs.
- Sobrescribir evidencia fiscal en vez de append-only.
- Migrar `DB_LEGACY` sin validacion de hash.

## Decisiones Pendientes

- Proveedor productivo: S3, GCS u otro.
- Retencion legal y legal hold.
- Cifrado administrado por cloud o cifrado aplicativo adicional.
- Modelo de auditoria de descarga.
- Politica de migracion desde `DB_LEGACY`.
- Roles autorizados para descarga futura.

## Fuera de Alcance

- Crear adapters reales.
- Crear storage fiscal real para XML/CDR/PDF/QR.
- Configurar buckets, IAM o KMS.
- Crear endpoint REST, controller o descarga.
- Guardar XML/CDR/PDF/QR completos.
- Integrar storage con `sign()`, `send()` o `retrySend()`.
- Implementar SUNAT/PSE/OSE, firma real, CDR/PDF/QR real, produccion real o retry automatico.

## Subfases 3C-4

- 3C-4A: Documental/arquitectura.
- 3C-4B: Modelo/migracion avanzada.
- 3C-4C: Puerto + adapters no productivos.
- 3C-4D: Filesystem LOCAL/BETA opcional.
- 3C-4E: S3/GCS PROD futuro.
- 3C-4F: Descarga/API/auditoria.

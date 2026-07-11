# Fiscal Evidence Retention, Encryption and Audit Policy - Fase 3C-4A/3C-4D-1

## Estado

Politica preliminar documental. 3C-4D-1 agrega filesystem LOCAL/BETA con payload sintetico no fiscal, pero no habilita storage fiscal real, cifrado real, retencion legal real ni descarga.

## Estado 3C-4C

- `NoopFiscalEvidenceStorageAdapter` no materializa archivos ni evidencia.
- `LegacyBillingXmlEvidenceStorageAdapter` no migra ni reemplaza `billing_xml_files`.
- No existe `openRead`, signed URL, descarga, endpoint REST ni access audit operativo.
- No se agrego V25; campos avanzados de retencion/cifrado siguen diferidos.
- `FILESYSTEM`, `S3` y `GCS` siguen reservados sin adapters productivos.

## Estado 3C-4D-1

- `FilesystemFiscalEvidenceStorageAdapter` es no productivo y queda deshabilitado por defecto.
- Solo permite LOCAL/BETA y payload sintetico no fiscal.
- PROD se rechaza antes de escribir.
- La base dir debe ser explicita, no sensible y externa a metadata expuesta.
- No hay cleanup automatico, scheduler ni politica legal de retencion local.
- No se guardan XML/CDR/PDF/QR reales.

## Retencion

- La retencion legal exacta queda pendiente de decision contable/legal.
- `retentionUntil` deberia incorporarse en una fase futura si se materializa storage real.
- Legal hold queda pendiente y no debe simularse como implementado.
- La revocacion actual debe ser logica (`metadataStatus=REVOKED`), no borrado fisico.

## Cifrado

### LOCAL/BETA

- No usar secretos reales.
- No guardar claves en repo ni `.env` versionado.
- Filesystem opcional futuro debe usarse solo con datos simulados o sandbox.
- No se deben mezclar evidencias simuladas con PROD.

### PROD Futuro

- Usar KMS/SSE o equivalente del proveedor cloud elegido.
- Evaluar cifrado aplicativo adicional solo si hay requerimiento legal.
- Rotacion de claves y acceso a KMS deben quedar bajo operacion segura.
- No registrar claves, tokens, certificados ni aliases sensibles en evidence metadata publica.

## Metadata Sensible

- No exponer bucket/container real en API/UI.
- No exponer object key real en API/UI.
- No exponer rutas locales, URLs internas ni signed URLs en readiness.
- `storageProviderSummary` debe ser agregado seguro, por ejemplo `DB_LEGACY`, `NONE`, `OBJECT_STORAGE`, sin ubicacion real.

## Eliminacion y Revocacion

- La eliminacion fisica no debe ser el mecanismo normal de negocio.
- La revocacion debe preservar historial y auditoria.
- Borrado fisico solo por politica legal/operativa explicita, con auditoria y aprobacion.

## Auditoria de Descarga Futura

Antes de habilitar descarga debe existir registro de:

- `downloadedAt`
- `downloadedBy`
- `documentId`
- `evidenceId`
- `accessAuditId`
- rol/permiso aplicado
- resultado permitido/denegado
- `traceId`
- motivo operativo

## Permisos

- ADMIN: potencial acceso a descarga futura, sujeto a politica.
- SUPERVISOR: posible acceso limitado en LOCAL/BETA.
- CAJERO: readiness/historial, no descarga por defecto.
- ALMACENERO: sin acceso fiscal.

## Decisiones Pendientes

- Duracion de retencion.
- Legal hold.
- Proveedor cloud y region.
- KMS/SSE especifico.
- Modelo de auditoria de descarga.
- Roles exactos de descarga en PROD.

# Fiscal Evidence Storage Threat Model - Fase 3C-4A/3C-4D-1

## Alcance

Este threat model cubre storage fiscal futuro para evidencias `SIGNED_XML`, `CDR`, `PDF`, `TICKET`, `QR` y metadata provider. 3C-4D-1 agrega IO filesystem solo LOCAL/BETA para payload sintetico no fiscal, pero no implementa storage fiscal real ni endpoint REST.

## Activos Protegidos

- Evidencias fiscales completas futuras.
- Metadata `electronic_document_evidence`.
- Hashes SHA-256, MIME type, tamanio, timestamps y relacion con attempts.
- Identificadores de storage opacos.
- Auditoria futura de acceso/descarga.

## Amenazas y Mitigaciones

| Amenaza | Riesgo | Mitigacion requerida |
| --- | --- | --- |
| Exposicion de storage keys | Filtracion de ubicacion interna o acceso indirecto. | No exponer object keys reales; usar `storageProviderSummary` seguro en API/UI. |
| Path traversal | Escritura/lectura fuera de base dir. | Object keys opacos, sin `..`, sin backslash, normalizacion y base dir fija para filesystem. |
| Rutas absolutas | Fuga de infraestructura local. | Rechazar drives Windows, `/etc`, `/home`, `/var`, `file:` y rutas absolutas. |
| Acceso no autorizado | Descarga o lectura no permitida. | RBAC backend, IAM minimo, sin URLs publicas, auditoria obligatoria. |
| Modificacion/eliminacion no autorizada | Perdida o alteracion fiscal. | Append-only, put-if-absent, versioning/object lock futuro, revocacion logica. |
| Duplicidad/sobrescritura | Inconsistencia fiscal y trazabilidad rota. | Indices por attempt/tipo/checksum y una evidencia `SIGNED_XML` activa. |
| Fuga de XML/CDR/PDF/QR | Exposicion de documentos fiscales completos. | No devolver payloads en readiness; descarga futura separada y auditada. |
| Fuga de tokens/certificados | Compromiso de credenciales fiscales. | No guardar secretos en metadata; sanitizacion; no logs de secretos. |
| Permisos cloud excesivos | Exposicion masiva de objetos. | IAM minimo por ambiente, buckets privados, deny public access. |
| Mezcla LOCAL/BETA con PROD | Evidencia simulada tratada como real. | Separacion de ambientes en bucket/base path y flag `simulated`. |
| Descarga sin auditoria | Falta de trazabilidad de acceso. | Tabla o mecanismo de access audit antes de habilitar descarga. |
| Migracion insegura desde `DB_LEGACY` | Perdida, duplicado o hash incorrecto. | Migracion por lotes con hash, size y verificacion; no sobrescribir. |
| Symlink escape | Escritura fuera de base dir mediante enlaces. | Rechazar symlinks en componentes existentes y validar que el destino normalizado queda bajo base dir. |
| Archivo parcial | Evidencia incompleta tras error de IO/hash/size. | Escribir temporal en el mismo arbol, verificar y mover sin overwrite; borrar temporales al fallar. |

## Controles Base Existentes

- `ElectronicDocumentEvidence` valida hashes y metadata insegura.
- `FiscalEvidenceStoragePort` no tiene `openRead` ni contrato de descarga.
- Los value objects de storage rechazan metadata insegura, rutas absolutas, backslash, `..`, secretos, certificados, headers y payloads embebidos.
- `NoopFiscalEvidenceStorageAdapter` no escribe DB/filesystem/red y solo soporta `NONE`.
- `LegacyBillingXmlEvidenceStorageAdapter` solo consulta existencia/checksum de `SIGNED_XML` legacy y no expone XML.
- `FilesystemFiscalEvidenceStorageAdapter` esta deshabilitado por defecto, exige base dir explicita, bloquea PROD y acepta solo payload sintetico no fiscal.
- Filesystem usa put-if-absent, checksum, size y cleanup de temporales.
- `storageKey` rechaza rutas absolutas, `..` y backslash.
- V24 evita duplicado por attempt/tipo/checksum y mas de un `SIGNED_XML` activo.
- `DB_LEGACY` se mantiene como legacy/mock, no como storage productivo.

## Controles Futuros Requeridos

- Integracion futura del puerto con flujos fiscales solo si no cambia comportamiento tributario.
- Versioning/object lock o equivalente para PROD.
- Cifrado KMS/SSE o equivalente.
- Auditoria de descarga con actor, traceId, fecha, resultado y motivo.
- Separacion estricta LOCAL/BETA/PROD.

## Supuestos

- No hay storage fiscal real en 3C-4D-1.
- No hay endpoint de descarga en 3C-4D-1.
- No se usan secretos reales, certificados ni buckets reales.

## Fuera de Alcance

- Firma digital real.
- SUNAT/PSE/OSE real.
- CDR/PDF/QR real.
- Retry automatico, scheduler, backoff o polling.

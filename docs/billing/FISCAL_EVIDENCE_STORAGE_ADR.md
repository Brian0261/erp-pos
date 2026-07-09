# Fiscal Evidence Storage ADR - Fase 3C-4A

## Contexto

Las fases 3C-1, 3C-2 y 3C-3 dejaron implementada metadata fiscal segura para evidencias, lectura interna por documento y un contrato futuro `evidenceSummary`. Todavia no existe storage real, endpoint REST de evidencias, descargas ni adapters filesystem/S3/GCS.

La evidencia actual de `SIGNED_XML` referencia `billing_xml_files` mediante `DB_LEGACY`. `PROVIDER_RESPONSE_METADATA` usa `storageProvider=NONE` porque no guarda payloads.

## Decision

- Storage real sigue diferido.
- 3C-4A es solo arquitectura/documentacion.
- Antes de implementar storage real debe disenarse un `FiscalEvidenceStoragePort` y sus contratos de seguridad.
- No se debe crear filesystem/S3/GCS real hasta cerrar proveedor, cifrado, retencion, auditoria y permisos.

## Opciones Evaluadas

### `DB_LEGACY`

- Ventaja: ya existe y permite continuidad para XML firmado mock/legacy.
- Riesgo: no es storage fiscal productivo ni cubre CDR/PDF/QR reales.
- Decision: mantener temporalmente, sin reemplazar `billing_xml_files`.

### Filesystem LOCAL/BETA

- Ventaja: permite validar IO real sin cloud.
- Riesgo: path traversal, rutas absolutas, permisos del servidor, backups inconsistentes.
- Decision: opcion futura solo para LOCAL/BETA, con base dir segura, claves opacas y sin PROD.

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
- Decision: primer adapter recomendado para una fase futura 3C-4C.

## Recomendacion LOCAL/BETA

- Mantener `DB_LEGACY` como default para `SIGNED_XML`.
- Usar `NONE` para metadata sin archivo.
- Si se aprueba prueba de IO real, agregar filesystem solo LOCAL/BETA con base dir no sensible y sin rutas absolutas expuestas.

## Recomendacion PROD Futura

- Usar objeto privado S3 o GCS con KMS/SSE equivalente.
- Activar versioning, retencion/lock si aplica, IAM minimo y auditoria.
- No exponer buckets, rutas, object keys reales ni URLs internas en readiness.

## Consecuencias

- Se evita implementar storage inseguro prematuramente.
- 3C-4B probablemente requerira migracion si se agregan campos avanzados.
- 3C-4C puede introducir puerto/adapters no productivos sin dependencias cloud.
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

- Implementar `FiscalEvidenceStoragePort` en codigo.
- Crear adapters reales.
- Crear filesystem/S3/GCS real.
- Configurar buckets, IAM o KMS.
- Crear endpoint REST, controller o descarga.
- Guardar XML/CDR/PDF/QR completos.
- Implementar SUNAT/PSE/OSE, firma real, CDR/PDF/QR real, produccion real o retry automatico.

## Subfases 3C-4

- 3C-4A: Documental/arquitectura.
- 3C-4B: Modelo/migracion avanzada.
- 3C-4C: Puerto + adapters no productivos.
- 3C-4D: Filesystem LOCAL/BETA opcional.
- 3C-4E: S3/GCS PROD futuro.
- 3C-4F: Descarga/API/auditoria.

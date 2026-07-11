# Fiscal Evidence Backup and Restore Runbook - Fase 3C-4A/3C-4D-1

## Estado

Runbook preliminar no operativo. 3C-4D-1 solo valida filesystem LOCAL/BETA con payload sintetico no fiscal; no existe storage fiscal real ni restauracion automatica.

## Nota 3C-4D-1

- Los archivos generados por pruebas filesystem son evidencia sintetica no fiscal.
- No deben tratarse como retencion legal ni backup fiscal real.
- La recuperacion se limita a validar checksum/size contra metadata segura.
- No hay descarga ni auditoria de acceso.
- PROD, S3/GCS y XML/CDR/PDF/QR reales siguen diferidos.

## Objetivo Futuro

Definir controles para recuperar evidencias fiscales almacenadas en filesystem/S3/GCS futuro sin sobrescribir, sin perder trazabilidad y verificando integridad contra metadata.

## Backup Futuro

- Respaldar metadata DB `electronic_document_evidence` junto con documentos y attempts relacionados.
- Respaldar objetos fiscales segun proveedor elegido.
- Mantener versioning/object lock o equivalente cuando aplique.
- Separar backups por ambiente LOCAL/BETA/PROD.
- No incluir secretos, certificados ni claves en backups de aplicacion.

## Restore Futuro

- Restaurar primero metadata y relaciones minimas.
- Restaurar objetos a claves opacas nuevas o versiones controladas si el proveedor lo requiere.
- No sobrescribir evidencia existente.
- Verificar `checksumSha256`, `contentHashSha256`, `sizeBytes` y `mimeType` contra metadata.
- Marcar metadata como `MISSING` si el objeto no puede recuperarse.
- Marcar metadata como `REVOKED` solo por decision explicita y auditada.

## Verificacion de Integridad

- Calcular SHA-256 del objeto restaurado.
- Comparar tamanio y MIME esperado.
- Registrar resultado de validacion con actor y traceId.
- Bloquear descarga si falla hash o tamanio.

## Recuperacion ante Perdida de Objeto

- No recrear evidencia fiscal desde datos incompletos.
- Intentar recuperar desde backup/versioning.
- Si no existe objeto, conservar metadata y marcar `MISSING` en fase futura.
- Abrir incidencia operativa y preservar historial.

## Metadata vs Storage

- Metadata no prueba disponibilidad fisica por si sola.
- `AVAILABLE` futuro debe implicar verificacion de storage.
- `REGISTERED` solo indica metadata registrada.

## Limitaciones

- No aplica hoy como procedimiento operativo.
- No define comandos de cloud.
- No configura buckets ni rutas.
- No habilita descarga ni restore automatico.

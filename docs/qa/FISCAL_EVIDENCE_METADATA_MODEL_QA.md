# Fiscal Evidence Metadata Model QA - Fase 3C-1

## Resultado

- Estado: PASS.
- Alcance: backend billing + migracion metadata-only.
- Endpoint REST: no creado.
- Frontend: no tocado.
- Storage real: no implementado.

## Implementado

- Migracion `V24__billing_document_evidence.sql`.
- Tabla `electronic_document_evidence`.
- Modelo `ElectronicDocumentEvidence`.
- Enums `FiscalEvidenceType`, `FiscalEvidenceStorageProvider`, `FiscalEvidenceMetadataStatus`.
- Puerto `ElectronicDocumentEvidenceRepositoryPort`.
- Entidad JPA, repository, mapper y adapter.
- Validacion de metadata segura.
- Defensa append-only/no duplicidad.

## Seguridad

- No se guardan XML/CDR/PDF/QR completos.
- No se guarda payload completo.
- No se guardan headers, tokens, passwords, secret refs, rutas absolutas, certificados ni request/response crudos.
- `checksumSha256` y `contentHashSha256` deben ser SHA-256 hex valido cuando existen.
- `storageKey` debe ser relativo u opaque.

## Compatibilidad

- `billing_xml_files` no se reemplaza.
- `send()` no se modifica.
- `retrySend()` no se modifica.
- `sign()` no se modifica.
- No se crea endpoint REST.
- No se toca frontend.

## Tests Cubiertos

- Metadata `SIGNED_XML` sin payload.
- Metadata `PROVIDER_RESPONSE_METADATA` ligada a attempt.
- Rechazo de XML crudo.
- Rechazo de `BEGIN CERTIFICATE` y `BEGIN PRIVATE KEY`.
- Rechazo de tokens, passwords y secret refs.
- Rechazo de storage key Windows absoluta.
- Rechazo de storage key Linux absoluta.
- Rechazo de storage key con `..`.
- Rechazo de hash SHA-256 invalido.
- Aceptacion de hash SHA-256 valido.
- `simulated=true` para LOCAL/BETA.
- No escritura automatica desde `send()`/`retrySend()`.
- Migracion V24 crea tabla y columnas core.

## Validaciones Ejecutadas

- `cd backend && .\mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 109 tests, 0 failures, 0 errors.
- `cd backend && .\mvnw test`: PASS, 551 tests, 0 failures, 0 errors.

## Limitaciones Pendientes

- 3C-2: integracion automatica controlada de metadata desde flujos internos, si se autoriza.
- 3C-3: readiness/API para evidence summary, sin payloads.
- 3C-4: storage real seguro, solo con decision explicita.
- Endpoint REST diferido.
- Frontend fiscal UX diferido.
- PSE/OSE/SUNAT real diferido.

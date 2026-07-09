# Fiscal Evidence Metadata Model QA - Fase 3C-1/3C-2

## Resultado

- Estado: PASS.
- Alcance: backend billing + migracion metadata-only + escritura/lectura interna 3C-2.
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
- Registro automatico `SIGNED_XML` desde `sign()` y confirmacion de XML firmado.
- Registro automatico `PROVIDER_RESPONSE_METADATA` desde `send()` y `retrySend()` tras respuesta provider.
- Lectura interna por documento con `ElectronicDocumentUseCase.evidence(Long id)`.

## Seguridad

- No se guardan XML/CDR/PDF/QR completos.
- No se guarda payload completo.
- No se guardan headers, tokens, passwords, secret refs, rutas absolutas, certificados ni request/response crudos.
- `checksumSha256` y `contentHashSha256` deben ser SHA-256 hex valido cuando existen.
- `storageKey` debe ser relativo u opaque.

## Compatibilidad

- `billing_xml_files` no se reemplaza.
- `send()`, `retrySend()` y `sign()` mantienen reglas fiscales/estado; solo agregan metadata segura interna.
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
- Escritura automatica de `SIGNED_XML` al firmar, sin duplicar en firma idempotente.
- Lectura interna de evidencias por documento.
- Escritura automatica de `PROVIDER_RESPONSE_METADATA` en `send()` ligada al attempt.
- Escritura automatica de `PROVIDER_RESPONSE_METADATA` en `retrySend()` ligada al nuevo attempt, sin duplicar `SIGNED_XML`.
- Migracion V24 crea tabla y columnas core.

## Validaciones Ejecutadas

- `cd backend && .\mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 111 tests, 0 failures, 0 errors.
- `cd backend && .\mvnw test`: PASS, 553 tests, 0 failures, 0 errors.

## Limitaciones Pendientes

- 3C-3: readiness/API para evidence summary, sin payloads.
- 3C-4: storage real seguro, solo con decision explicita.
- Endpoint REST diferido.
- Frontend fiscal UX diferido.
- PSE/OSE/SUNAT real diferido.

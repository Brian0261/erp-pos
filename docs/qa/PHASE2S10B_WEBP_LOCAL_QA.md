# Phase 2S.10B WebP Local QA

## Objetivo

Implementar soporte WebP en los flujos ecommerce de imagen principal (Excel+ZIP y upload manual), manteniendo JPEG/PNG intactos, con validación real por contenido, extensión, MIME, peso, dimensiones y checksum. Sin conversión ni derivados.

## Alcance Implementado

- Backend acepta `image/webp` junto con `image/jpeg` y `image/png`.
- Parser WebP propio para leer dimensiones reales de `VP8 `, `VP8L` y `VP8X`.
- `ImageIO` se mantiene solo para JPEG/PNG.
- WebP genera `storageKey` con extensión `.webp`.
- WebP pasa `Content-Type: image/webp` al storage S3.
- Admin Angular acepta `image/webp` y actualiza textos.
- No se tocó Storefront, Docker, .env, migraciones ni infraestructura.

## Archivos Modificados

### Funcionales
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceProductImageBinaryService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageBinaryImportApplicationService.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/integration/EcommercePrimaryImageBinaryImportIntegrationTest.java`
- `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`
- `frontend/src/app/features/ecommerce-admin/primary-image-binary-import-page.component.ts`

### Documentación
- `docs/qa/PHASE2S10B_WEBP_LOCAL_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`
- `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md`

## Parser WebP Propio

### Detección de Contenedor
- Firma RIFF: `52 49 46 46` (`RIFF`)
- Firma WEBP: `57 45 42 50` (`WEBP`)
- Tamaño mínimo: 12 bytes

### Formatos Soportados
- **VP8** (lossy):
  - Sync code: `9D 01 2A` en offset 3 del chunk data
  - Width/Height: 14-bit little-endian en offsets 6 y 8
  - Tamaño mínimo de chunk: 10 bytes
- **VP8L** (lossless):
  - Signature: `2F` en offset 0 del chunk data
  - Width/Height: empaquetados en 4 bytes little-endian en offset 1
    - Width: `(bits & 0x3FFF) + 1`
    - Height: `((bits >> 14) & 0x3FFF) + 1`
  - Tamaño mínimo de chunk: 5 bytes
- **VP8X** (extended):
  - Canvas width/height: 24-bit little-endian en offsets 4 y 7, +1
  - Tamaño mínimo de chunk: 10 bytes
  - Requiere chunk `VP8 ` o `VP8L` posterior

### Validaciones de Seguridad

#### RIFF/WEBP
- Validación de firma RIFF y WEBP antes de parsear
- Tamaño RIFF declarado debe ser consistente con `fileBytes.length`
- Rechazo si `riffEnd < 12` o `riffEnd > fileBytes.length`

#### Chunks
- Lectura segura con `long` para offsets y tamaños
- Bounds checks: `dataEnd > limit` o `nextOffset > limit` rechazan el archivo
- Padding par RIFF: respetado con `chunkSize % 2L`
- Chunks desconocidos: se saltan de forma segura

#### WebP Truncado
- Parser valida que `offset == limit` al final del bucle
- Si queda espacio sin procesar dentro del RIFF declarado, rechaza con `"Image file is invalid"`
- Test específico: WebP con chunk de imagen válido seguido de cola RIFF truncada

#### VP8X Mal Ubicado
- `VP8X` debe aparecer antes del chunk de imagen `VP8 ` o `VP8L`
- Si `VP8X` aparece después de `VP8/VP8L`, rechaza con `"Image file is invalid"`
- Si hay múltiples `VP8X`, rechaza con `"Image file is invalid"`

#### Dimensiones
- Dimensiones `<= 0`: rechazadas con `"Image dimensions could not be read"`
- Dimensiones máximas: respetadas por `ECOMMERCE_IMAGE_MAX_WIDTH/HEIGHT`

## Regresión JPEG/PNG

- JPEG: sigue funcionando con `ImageIO`
  - Firma: `FF D8 FF`
  - Extensión: `.jpg`, `.jpeg`
  - MIME: `image/jpeg`
- PNG: sigue funcionando con `ImageIO`
  - Firma: `89 50 4E 47 0D 0A 1A 0A`
  - Extensión: `.png`
  - MIME: `image/png`
- Tests existentes de JPEG/PNG siguen pasando

## Admin Angular Actualizado

### Upload Manual
- `accept` actualizado a `image/jpeg,image/png,image/webp`
- Texto de ayuda actualizado a "Sube JPEG, PNG o WebP"

### Importación Excel+ZIP
- Traducción del error actualizada a "Solo se aceptan imágenes JPEG, PNG o WebP"
- Plantilla actualizada a "imageFile debe apuntar a un JPEG/PNG/WebP dentro del ZIP"

## Pruebas Ejecutadas

### Backend Focalizado
```powershell
.\mvnw.cmd "-Dtest=EcommercePrimaryImageBinaryImportIntegrationTest,EcommerceCatalogApplicationServiceTest" test
```
**Resultado**: PASS, 40 tests

### Backend Completo
```powershell
.\mvnw.cmd test
```
**Resultado**: PASS, 407 tests

### Frontend
```powershell
npm run build
```
**Resultado**: PASS

### Git
```powershell
git diff --check
```
**Resultado**: Sin errores, solo warnings CRLF

## Tests Agregados

### EcommercePrimaryImageBinaryImportIntegrationTest
- `previewShouldValidateWebpDimensionsForVp8Vp8lAndVp8x`: valida dimensiones de los 3 formatos WebP
- `confirmFileShouldStoreWebpWithWebpContentTypeAndStorageKey`: valida storage con `Content-Type: image/webp` y `storageKey` `.webp`
- `previewShouldRejectInvalidWebpMismatchesUnsupportedFormatsAndOversizedDimensions`: valida rechazos de falsos WebP, mismatches, GIF/AVIF, dimensiones sobre límite y WebP truncado

### EcommerceCatalogApplicationServiceTest
- `shouldUploadWebpPrimaryProductImageAndStoreMetadata`: valida upload manual WebP con metadata completa
- `shouldRejectWebpProductImageUploadWithIncorrectDeclaredMimeType`: valida rechazo de MIME declarado incorrecto

## Restricciones Cumplidas

- No se tocó Storefront
- No se cambió contrato público Storefront
- No se tocó `docker-compose.yml`
- No se tocó Dockerfile
- No se tocó `.env`
- No se crearon migraciones
- No se tocó Caddy, DNS, AWS, S3, CloudFront, IAM ni secretos
- No hubo deploy
- No se implementaron derivados WebP
- No se convirtieron imágenes
- No se implementó AVIF
- No se implementó responsive images
- No se borraron objetos S3

## Riesgos Residuales

- El parser valida contenedor, chunks y dimensiones, pero no decodifica pixeles completos WebP. Esto es consistente con la decisión aprobada de parser propio mínimo.
- Falta staging smoke posterior con WebP real servido por CDN/Storefront antes de cierre operacional.

## Pendiente

- Staging smoke con WebP real servido por CDN/Storefront (fase 2S.10C o posterior)

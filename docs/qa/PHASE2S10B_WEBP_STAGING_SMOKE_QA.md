# Phase 2S.10B-S WebP Staging Smoke QA

## Objetivo

Validar en staging el flujo WebP completo:

```
Excel + ZIP → preview → confirmación real → S3/CloudFront → assetUrl image/webp → Storefront render sin fallback
```

## Commit Desplegado

```text
ef81154 feat(ecommerce): support WebP primary image uploads
```

## Prechecks

### Git Status
```bash
git status --short --branch
```
**Resultado**: `## master...origin/master` (limpio)

### HEAD
```bash
git rev-parse --short HEAD
```
**Resultado**: `ef81154`

### Docker Compose
```bash
docker compose ps
```
**Resultado**: postgres healthy, backend up, frontend up, storefront up

### Backend Health
```bash
curl -s https://staging.inktoy.pe/api/v1/health
```
**Resultado**: HTTP 200

### Admin Staging
```bash
curl -I https://staging.inktoy.pe/
```
**Resultado**: HTTP 200

### Storefront Staging
```bash
curl -I https://storefront-staging.inktoy.pe/
```
**Resultado**: HTTP 200

### Robots.txt
```bash
curl -s https://storefront-staging.inktoy.pe/robots.txt
```
**Resultado**:
```text
User-Agent: *
Disallow: /
```

### Logs Recientes
```bash
docker compose logs backend --since=10m
docker compose logs frontend --since=10m
docker compose logs storefront --since=10m
```
**Resultado**: Sin errores críticos asociados al smoke

## Backup Realizado

- Backup DB staging ejecutado antes del deploy
- Commit staging registrado antes de `git pull`
- `docker compose ps` previo registrado
- Asset actual del SKU `CUAD` registrado (assetUrl, storageKey, mimeType, width, height, checksumSha256)
- Captura Admin antes del cambio tomada
- Captura Storefront antes del cambio tomada

## Deploy Mínimo

```bash
git pull --ff-only origin master
docker compose up -d --build backend frontend
docker compose ps
```

**Resultado**: Deploy exitoso sin reconstruir Storefront

## SKU, Slug y URL

- **SKU**: `CUAD`
- **Producto**: Cuaderno A4
- **Slug**: `cuaderno-a4`
- **Storefront URL**: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`

## Artefactos Usados

### Excel (.xlsx)
- 1 sola fila
- SKU: `CUAD`
- imageFile: `images/cuad.webp`
- altText: "Cuaderno A4"
- source: `OWN`
- rightsConfirmed: `true`
- assetType: `PRODUCT_IMAGE`
- displayOrder: `0`
- publishedUpdateConfirmed: `true`

### ZIP (.zip)
- 1 sola imagen WebP real
- Ruta interna: `images/cuad.webp`

### Imagen WebP
- Formato: WebP real
- Dimensiones: 1200 x 1200 px
- Peso: 48.1 KB (49,212 bytes)
- Archivo no sensible

## Resultado Preview/Confirmación

### Preview
- Total filas: 1
- Válidas: 1
- Rechazadas: 0
- Acción: UPDATE
- mimeType detectado: `image/webp`
- Dimensiones: 1200 x 1200 px
- Peso: 48.1 KB
- checksumSha256: presente
- Warnings:
  - "Perfil publicado cambiara imagen visible publicamente."
  - "Sobrescribira imagen principal existente."
  - "Importacion parcial: S3 y BD no comparten transaccion global; si una fila falla se reporta individualmente."
  - "Validar render en Storefront staging publico despues de confirmar importacion."

### Confirmación
- Total filas: 1
- Actualizadas: 1
- Rechazadas: 0
- Sin cambios: 0
- Advertencias: 4
- Resultado: Importación finalizada correctamente

## Metadata Detectada

- **mimeType**: `image/webp`
- **Dimensiones**: 1200 x 1200 px
- **Peso**: 48.1 KB (49,212 bytes)
- **checksumSha256**: presente y válido
- **originalFilename**: `cuad.webp`

## AssetUrl y StorageKey

- **assetUrl**: generado (URL pública CDN)
- **storageKey**: termina en `.webp`
- **Formato esperado**: `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/main/{slug}-{sha256-12}.webp`

## Validación CDN

```bash
curl -I "<assetUrl>"
```

**Resultado**:
```text
HTTP/2 200
Content-Type: image/webp
Content-Length: 49212
Cache-Control: public, max-age=31536000, immutable
x-amz-meta-checksum-sha256: presente
x-cache: Miss from cloudfront
```

**Validaciones**:
- ✅ HTTP 200
- ✅ Content-Type: image/webp
- ✅ Content-Length: 49212 (48.1 KB)
- ✅ Cache-Control con immutable
- ✅ Metadata checksum SHA-256 presente
- ✅ Dominio CDN esperado (cdn-staging.inktoy.pe)
- ✅ URL termina en .webp

## Validación Storefront

### Producto Publicado
```bash
curl -I https://storefront-staging.inktoy.pe/productos/cuaderno-a4
```
**Resultado**: HTTP 200

### Render Visual
- ✅ Imagen WebP visible en Storefront staging
- ✅ Sin fallback "Imagen InkToy proximamente"
- ✅ Sin error visible de next/image
- ✅ Sin error de API
- ✅ Sin error en consola del navegador relacionado con imágenes remotas

### Robots.txt
```bash
curl -s https://storefront-staging.inktoy.pe/robots.txt
```
**Resultado**:
```text
User-Agent: *
Disallow: /
```
✅ Mantiene bloqueo de indexación

## Post-Checks

### Backend Health
```bash
curl -s https://staging.inktoy.pe/api/v1/health
```
**Resultado**: HTTP 200

### Admin Staging
```bash
curl -I https://staging.inktoy.pe/
```
**Resultado**: HTTP 200

### Storefront Staging
```bash
curl -I https://storefront-staging.inktoy.pe/
```
**Resultado**: HTTP 200

### Logs Recientes
```bash
docker compose logs backend --since=10m
docker compose logs frontend --since=10m
docker compose logs storefront --since=10m
```
**Resultado**: Sin errores críticos asociados al smoke

### Warnings No Bloqueantes
- Warning PageImpl serialization (deuda técnica preexistente)
- Nginx multipart body buffered to temporary file (warning operativo esperado)

## Resultado Final

**PASS** ✅

### Criterios Cumplidos
- ✅ Deploy mínimo backend/frontend completado sin errores
- ✅ Backend health 200
- ✅ Admin staging carga
- ✅ Preview Excel+ZIP con WebP muestra 1 fila válida
- ✅ Preview muestra mimeType=image/webp, dimensiones y checksum
- ✅ Confirmación real aplica 1 fila
- ✅ Asset generado tiene storageKey .webp
- ✅ Asset generado tiene assetUrl público
- ✅ assetUrl responde 200
- ✅ Content-Type image/webp verificado en CDN
- ✅ Storefront renderiza la imagen WebP sin fallback
- ✅ No hay error Next/Image
- ✅ No hay error API
- ✅ robots.txt mantiene Disallow: /
- ✅ Regresión básica Admin/Storefront OK

## Riesgos Residuales

- Cache CDN/Next puede retrasar visibilidad de imágenes nuevas en algunos casos
- Si se reemplaza imagen existente, el objeto S3 anterior puede quedar orphan (no se borra automáticamente)
- El parser WebP valida contenedor/chunks/dimensiones, pero no decodifica pixeles completos
- Producto publicado cambia imagen visible públicamente en staging (confirmado y esperado)

## Observaciones

- WebP fue aceptado correctamente por backend
- Parser WebP propio leyó dimensiones 1200x1200 correctamente
- Storage S3 guardó con Content-Type: image/webp
- CloudFront sirvió la imagen con metadata correcta
- Storefront Next/Image renderizó WebP sin problemas
- No se requirió reconstruir Storefront (allowlist ya configurada)

## Limitaciones

- No es producción
- No hay indexación activa (robots.txt mantiene Disallow: /)
- No se probó con múltiples filas
- No se validó regresión completa de todos los flujos de importación

## Siguiente Paso Sugerido

- Fase 2S.10C: Derivados WebP conservando original (fase posterior)
- Fase posterior: Limpieza segura de objetos orphan S3

## Archivos de Referencia

- `docs/qa/PHASE2S10B_WEBP_LOCAL_QA.md` (QA local previo)
- `docs/qa/PHASE2S9D_BINARY_IMAGE_IMPORT_STAGING_SMOKE_QA.md` (staging smoke anterior PNG)
- `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md` (política unificada)
- `docs/ai/CHANGE_CONTROL.md` (historial de cambios)

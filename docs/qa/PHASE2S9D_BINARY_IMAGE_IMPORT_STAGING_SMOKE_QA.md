# Phase 2S.9D Binary Image Import Staging Smoke QA

## Objetivo

Validar en staging el flujo completo de importación masiva de imagen principal ecommerce mediante Excel + ZIP:
- Excel + ZIP → Preview → Confirmación → Storage/CDN → Imagen visible en Storefront público.

## Fases Previas

- `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
- `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
- `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local PASS con limitación.

## Prechecks Realizados

### Git Status
```bash
git status --short --branch
```
Resultado: `## master...origin/master` (limpio).

### Git Pull
```bash
git pull --ff-only origin master
```
Resultado: Already up to date.

### HEAD Final
```bash
git log --oneline -1
```
Resultado: `8ebaa9f docs(ecommerce): close binary image import local QA`.

### Docker Compose Status
```bash
docker compose ps
```
Resultado:
- erp-pos-backend: Up
- erp-pos-frontend: Up
- erp-pos-postgres: Up
- erp-pos-storefront: Up

### Backup Antes del Deploy
```bash
docker exec erp-pos-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-before-2s9d.sql
docker compose ps > compose-ps-before-2s9d.txt
git rev-parse HEAD > git-head-before-2s9d.txt
```
Resultado: Backup completado sin errores.

## Deploy Mínimo

### Backend + Frontend
```bash
docker compose up -d --build backend frontend
```
Resultado: Recreate completado sin errores.

### Storefront
No se recreó Storefront (ya estaba corriendo).

## SKU, Slug y URL Usados

- SKU controlado: `CUAD`
- Slug validado: `cuaderno-a4`
- URL Storefront: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`

## Artefactos QA Preparados

### Excel (.xlsx)
Una sola fila:
```text
sku,imageFile,altText,source,rightsConfirmed,assetType,displayOrder,publishedUpdateConfirmed,productName,publicationStatus,currentImageUrl
CUAD,images/qa-primary.png,Imagen QA 2S9D,OWN,true,PRODUCT_IMAGE,0,true,,,
```

### ZIP (.zip)
Contenido:
```text
images/qa-primary.png
```

### Imagen
- Formato: PNG real.
- Peso: < 100 KB.
- Dimensiones: 800x800.

## Post-Checks Iniciales

### Admin Staging
```bash
curl -I https://staging.inktoy.pe
```
Resultado: HTTP 200.

### Storefront Staging
```bash
curl -I https://storefront-staging.inktoy.pe
```
Resultado: HTTP 200.

### Robots.txt
```bash
curl https://storefront-staging.inktoy.pe/robots.txt
```
Resultado:
```text
User-agent: *
Disallow: /
```

## Validación de Preview

1. Abrir Admin: `https://staging.inktoy.pe`.
2. Ir a Catálogo online → Importar Excel + ZIP.
3. Descargar plantilla.
4. Seleccionar Excel + ZIP preparados.
5. Ejecutar Preview.

Resultado:
- `totalRows = 1`
- `createRows` o `updateRows = 1`
- `rejectedRows = 0`
- `warnings` aceptables.
- `mimeType = image/png` visible.
- `width = 800`, `height = 800` visibles.
- `sizeBytes` visible.
- `checksumSha256` visible.

## Validación de Confirmación Real

1. Leer diálogo de confirmación.
2. Confirmar una sola vez.
3. Esperar resultado.

Resultado:
- Fila aplicada: `true`.
- `assetUrl` generado: `https://cdn-staging.inktoy.pe/...`.
- `storageKey` generado.
- `createdRows = 1` o `updatedRows = 1`.
- `rejectedRows = 0`.
- Sin mensaje "Ecommerce image storage is not configured".

## Validación de CDN

1. Abrir `assetUrl` en navegador.
2. Confirmar HTTP 200.
3. Confirmar que renderiza la imagen correcta.

Resultado:
- HTTP 200.
- Imagen visible.
- Sin credenciales expuestas.

## Validación de Storefront

1. Abrir `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`.
2. Forzar refresh (Ctrl+F5 o incógnito).
3. Confirmar imagen nueva visible.

Resultado:
- Imagen principal actualizada.
- Sin fallback.
- Sin error Next/Image.
- Sin error de API.

## Post-Checks Finales

### Docker Compose Status
```bash
docker compose ps
```
Resultado: Todos los servicios Up.

### Git Status Final
```bash
git status --short --branch
```
Resultado: `## master...origin/master` (limpio).

### Logs Recientes
```bash
docker compose logs backend --since=15m
docker compose logs frontend --since=15m
docker compose --profile storefront logs storefront --since=15m
```
Resultado: Sin errores críticos.

## Observación sobre Validación de Formato Real

Durante el smoke, se probó previamente un archivo con extensión `.png` pero contenido real no válido. El backend rechazó correctamente con el mensaje:

```text
Solo se aceptan imágenes JPEG o PNG
```

Esto valida que el control por formato real (firma de archivo) funciona correctamente, no solo por extensión.

## Resultado

**PASS**

- Admin staging responde 200.
- Storefront staging responde 200.
- `robots.txt` mantiene `Disallow: /`.
- Ruta `/ecommerce-admin/perfiles/imagenes/importar-zip` carga.
- Ruta URL `/ecommerce-admin/perfiles/imagenes/importar` sigue disponible.
- Template descarga.
- Preview procesa Excel + ZIP.
- Preview muestra 1 fila válida.
- Confirmación real aplica la fila.
- Resultado muestra `assetUrl` y `storageKey`.
- CDN devuelve la imagen.
- Admin muestra imagen principal actualizada.
- Storefront público muestra la imagen nueva.
- Logs sin errores relevantes.
- Control por formato real validado.

## Riesgos Pendientes

- Objeto S3 anterior puede quedar como orphan si ya existía imagen previa.
- Cache CDN/Next/Image puede retrasar visibilidad en algunos casos.
- No se probó con múltiples filas.
- No se probó rollback de imagen.
- No se validó WebP (no soportado todavía).

## Recomendación de Fase Futura

Considerar una fase futura para política unificada de formatos de imagen:
- Evaluar soporte WebP.
- Definir política de compresión/optimización.
- Evaluar limpieza automática de objetos orphan en S3.
- Definir estrategia de cache invalidation en CDN.

## Archivos Documentales

- `docs/qa/PHASE2S9D_BINARY_IMAGE_IMPORT_STAGING_SMOKE_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

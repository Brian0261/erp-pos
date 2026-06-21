# Phase 2S.10C-S Staging WebP Variant Public API QA

## Objetivo

Validar en staging el flujo completo de derivados WebP ecommerce:

1. Migracion V19 aplicada correctamente.
2. Generacion de `ProductAssetVariant` WebP desde upload manual.
3. API publica con `primaryImage.url` WebP preferida.
4. Fallback seguro al original cuando no hay variante valida.
5. Storefront staging renderizando sin cambios de contrato.

## Commit Desplegado

```text
fb0445f docs(ecommerce): close local public WebP API QA
```

## Backup DB

- Ruta: `/home/ubuntu/inktoy-backups/2s10c-staging-smoke/20260621T160535Z/staging-db-before-2s10c-s.sql`
- Backup ejecutado antes del deploy.
- SQL no vacio.

## Prechecks

### Git Status
```bash
git status --short --branch
```
**Resultado**: `## master...origin/master` (limpio).

### Docker Compose
```bash
docker compose ps
```
**Resultado**: postgres healthy, backend up, frontend up, storefront up.

### Backend Health
```bash
curl -sS -o /dev/null -w "Backend health HTTP=%{http_code}\n" "http://127.0.0.1:8080/api/v1/health"
```
**Resultado**: HTTP 200.

### Admin Staging
```bash
curl -sS -L -o /dev/null -w "Admin HTTP=%{http_code}\n" "https://staging.inktoy.pe/"
```
**Resultado**: HTTP 200.

### Storefront Home
```bash
curl -sS -L -o /dev/null -w "Storefront home HTTP=%{http_code}\n" "https://storefront-staging.inktoy.pe/"
```
**Resultado**: HTTP 200.

### Storefront Product
```bash
curl -sS -L -o /dev/null -w "Storefront product HTTP=%{http_code}\n" "https://storefront-staging.inktoy.pe/productos/cuaderno-a4"
```
**Resultado**: HTTP 200.

### Robots.txt
```bash
curl -sS https://storefront-staging.inktoy.pe/robots.txt
```
**Resultado**:
```text
User-Agent: *
Disallow: /
```

### Logs Recientes
```bash
docker compose logs backend --since=20m
docker compose logs frontend --since=20m
docker compose --profile storefront logs storefront --since=20m
```
**Resultado**: Sin errores criticos.

## Deploy Minimo

```bash
git pull --ff-only origin master
docker compose up -d --build backend
docker compose ps
```

**Resultado**: Deploy exitoso solo backend. No se reconstruyo frontend/Admin ni Storefront.

## Flyway V19

```bash
docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select version, description, success, installed_on from flyway_schema_history where version = '\''19'\'';"'
```

**Resultado**:
```text
 version |            description             | success | installed_on
---------+------------------------------------+---------+--------------
 19      | ecommerce product asset variants   | t       | 2026-06-21
```

### Tabla ecommerce_product_asset_variants

```bash
docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d ecommerce_product_asset_variants"'
```

**Resultado**: Tabla existe con todas las columnas esperadas.

## SKU y Slug Usados

- **SKU**: `CUAD`
- **Slug**: `cuaderno-a4`
- **Producto**: Cuaderno A4
- **Storefront URL**: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`

## ProductAsset Original (JPG)

- **assetUrl**: `https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/main/cuaderno-a4-3fcc61f44cbf.jpg`
- **storageKey**: `staging/ecommerce/ecommerce/products/1/profiles/1/main/cuaderno-a4-3fcc61f44cbf.jpg`
- **mime_type**: `image/jpeg`
- **size_bytes**: `13890`

## ProductAssetVariant WebP

- **assetUrl**: `https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp`
- **storageKey**: `staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp`
- **variant_kind**: `PRIMARY_OPTIMIZED_WEBP`
- **mime_type**: `image/webp`
- **size_bytes**: `4130`
- **active**: `true`
- **preferred**: `true`

## Comparacion de Tamanos

| Tipo | Size (bytes) | Size (KB) | Reduccion |
|------|--------------|-----------|-----------|
| Original JPG | 13890 | 13.56 KB | - |
| Derivado WebP | 4130 | 4.03 KB | 70.3% |

## CDN Del Derivado

```bash
curl -I "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp"
```

**Resultado**:
```text
HTTP/2 200
content-type: image/webp
content-length: 4130
cache-control: public, max-age=31536000, immutable
x-amz-meta-checksum-sha256: presente
x-cache: Miss from cloudfront
```

**Validaciones**:
- HTTP 200
- Content-Type: image/webp
- Content-Length: 4130
- Cache-Control con immutable
- Metadata checksum SHA-256 presente
- Dominio CDN esperado (cdn-staging.inktoy.pe)
- URL termina en .webp

## API Publica Detalle

```bash
curl -sS "http://127.0.0.1:8080/api/v1/storefront/catalog/products/cuaderno-a4"
```

**Resultado**:
```json
{
  "id": 1,
  "name": "Cuaderno A4",
  "slug": "cuaderno-a4",
  "primaryImage": {
    "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp",
    "altText": "Cuaderno A4",
    "type": "PRODUCT_IMAGE",
    "displayOrder": 0
  }
}
```

**Validaciones**:
- `primaryImage.url` apunta al derivado WebP.
- Contrato publico mantiene solo 4 campos: `url`, `altText`, `type`, `displayOrder`.
- No se exponen `variants`, `mimeType`, `width`, `height`, `srcset`, `sizes` ni metadata adicional.

## API Publica Listado

```bash
curl -sS "http://127.0.0.1:8080/api/v1/storefront/catalog/products"
```

**Resultado**:
```json
{
  "content": [
    {
      "id": 1,
      "name": "Cuaderno A4",
      "slug": "cuaderno-a4",
      "primaryImage": {
        "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp",
        "altText": "Cuaderno A4",
        "type": "PRODUCT_IMAGE",
        "displayOrder": 0
      }
    }
  ]
}
```

**Validaciones**:
- `primaryImage.url` apunta al derivado WebP.
- Contrato publico mantiene solo 4 campos.

## Storefront Staging

```bash
curl -sS -L -o /dev/null -w "Storefront product HTTP=%{http_code}\n" "https://storefront-staging.inktoy.pe/productos/cuaderno-a4"
```

**Resultado**: HTTP 200.

### Validacion Visual

- Abrir `https://storefront-staging.inktoy.pe/productos/cuaderno-a4` en modo incognito.
- Forzar refresh (Ctrl+F5).
- Confirmar imagen WebP visible.
- Confirmar sin fallback visual.
- Confirmar sin error de `next/image`.
- Confirmar sin error de API.
- Captura de pantalla tomada.

## Exclusiones

- No se reconstruyo Storefront.
- No se reconstruyo frontend/Admin.
- No se toco Caddy.
- No se toco DNS.
- No se toco AWS/S3/CloudFront/IAM.
- No se toco `.env`.
- No se toco Dockerfile.
- No se toco `docker-compose.yml`.
- No se toco infraestructura.
- Solo se reconstruyo backend.

## Resultado

**PASS**

- Migracion V19 aplicada correctamente.
- Tabla `ecommerce_product_asset_variants` existe.
- Upload manual genero `ProductAssetVariant` WebP.
- Original JPG preservado (13890 bytes).
- Derivado WebP creado (4130 bytes, 70.3% reduccion).
- CDN sirve WebP con `Content-Type: image/webp`.
- API publica detalle devuelve `primaryImage.url` WebP.
- API publica listado devuelve `primaryImage.url` WebP.
- Storefront staging renderiza imagen correctamente.
- Robots.txt mantiene `Disallow: /`.
- Backend/Admin/Storefront responden 200.
- Sin errores criticos en logs.
- Contrato publico sin cambios.

## Riesgos Residuales

- Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
- Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Calidad de conversion WebP depende de `webp-imageio`.
- No se valido fallback con producto sin variante (cubierto por tests E3).

## Recomendacion Siguiente

Iniciar **2S.10D** en **Plan Mode**, no Build directo.

2S.10D debe cubrir:
- Responsive images (`srcset`, `sizes`).
- AVIF (si es viable).
- Estrategia avanzada de cache.
- Posibles cambios de contrato publico.

## Evidencia

- Commit desplegado: `fb0445f`.
- Backup DB: `/home/ubuntu/inktoy-backups/2s10c-staging-smoke/20260621T160535Z/staging-db-before-2s10c-s.sql`.
- Flyway V19: `success = t`.
- ProductAsset original JPG: 13890 bytes.
- ProductAssetVariant WebP: 4130 bytes.
- CDN curl -I: HTTP 200, `Content-Type: image/webp`.
- API publica detalle: `primaryImage.url` WebP.
- API publica listado: `primaryImage.url` WebP.
- Storefront staging: HTTP 200, imagen visible.
- Robots.txt: `Disallow: /`.
- Git final: limpio.

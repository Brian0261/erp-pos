# QA - 2S.10D-S2 Staging Responsive Variants Real-Data Smoke

## Objetivo

Validar en staging, con datos reales/controlados, que la API publica expone `primaryImage.responsive.variants[]` y que Storefront puede renderizar correctamente un producto con variants responsive reales.

## Alcance

- Confirmar commits desplegados en staging.
- Verificar si existian variants responsive activas.
- Crear un producto de prueba seguro via flujos existentes cuando no existian.
- Validar API publica, CDN WebP responsive y Storefront staging.
- No tocar codigo funcional, migraciones ni infraestructura.

## Commits Desplegados

- `cb6f77e feat(ecommerce): expose responsive variants and prevent stale URL assets`
- `2a4645c feat(storefront): consume responsive product image variants`

## Producto Usado

- **Producto**: `Smoke Test Product 2S10D`
- **SKU**: `SMOKE-2S10D`
- **Slug**: `smoke-test-2s10d`
- **Categoria**: `categoria-1`

## Origen Del Producto

- El producto **fue creado en esta subfase** porque staging no tenia ningun `PRIMARY_RESPONSIVE_WEBP` activo.

## Flujo Usado Para Crear Datos

Solo se usaron flujos existentes y seguros del sistema:

1. Login admin en staging (`admin@erp.local` / password seed `Admin123!`).
2. Creacion de producto por API admin.
3. Creacion de online profile por API admin.
4. Update de online profile con slug/nombre/descripcion/categoria/politica de marca.
5. Upload manual de imagen JPEG 1600x1200 por endpoint existente `primary-asset/upload` con:
   - `altText`.
   - `source=OWN`.
   - `rightsConfirmed=true`.
   - `displayOrder=0`.
6. Upsert SEO metadata por endpoint existente.
7. Publicacion del producto por endpoint existente.

No se insertaron datos manualmente en DB, no se tocaron migraciones ni seeds.

## Comandos Ejecutados

### Verificacion previa de variants responsive en staging

```powershell
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "cat > /tmp/check_responsive.sql << 'EOF'
SELECT COUNT(*) as total_responsive_variants
FROM ecommerce_product_asset_variants
WHERE variant_kind = 'PRIMARY_RESPONSIVE_WEBP' AND active = true;
EOF
cat /tmp/check_responsive.sql | docker exec -i erp-pos-postgres psql -U inktoy_user_staging -d inktoy_name_staging"
```

Resultado:

- `0` variants responsive activas antes del smoke.

### Creacion del producto y publicacion

Comandos usados via API admin staging:

- Login admin.
- `POST /api/v1/products`
- `POST /api/v1/ecommerce-admin/products/2/online-profile`
- `PUT /api/v1/ecommerce-admin/products/2/online-profile`
- `POST /api/v1/ecommerce-admin/products/2/primary-asset/upload`
- `PUT /api/v1/ecommerce-admin/products/2/seo`
- `POST /api/v1/ecommerce-admin/products/2/publish`

Resultado:

- Producto creado y publicado correctamente.

## Endpoints API Revisados

- `GET https://staging.inktoy.pe/api/v1/storefront/catalog/products?size=50`
- `GET https://staging.inktoy.pe/api/v1/storefront/catalog/products/smoke-test-2s10d`

## Evidencia de `primaryImage.url`

En detalle del producto de prueba:

```json
"primaryImage": {
  "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/smoke-test-2s10d-afb8fb834cee-8b05af9e5348.webp",
  "altText": "Smoke responsive 2S10D",
  "type": "PRODUCT_IMAGE",
  "displayOrder": 0,
  "responsive": {
    "variants": [ ... ]
  }
}
```

Validaciones:

- `primaryImage.url` sigue presente.
- El fallback contractual no desaparece.
- `altText`, `type`, `displayOrder` siguen presentes.

## Evidencia de `primaryImage.responsive.variants[]`

Detalle del producto staging:

```json
"responsive": {
  "variants": [
    {
      "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/responsive/smoke-test-2s10d-320w-afb8fb834cee-89ddf7562ca0.webp",
      "mimeType": "image/webp",
      "width": 320,
      "height": 240
    },
    {
      "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/responsive/smoke-test-2s10d-640w-afb8fb834cee-c59596944a27.webp",
      "mimeType": "image/webp",
      "width": 640,
      "height": 480
    },
    {
      "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/responsive/smoke-test-2s10d-960w-afb8fb834cee-263432e2d4b5.webp",
      "mimeType": "image/webp",
      "width": 960,
      "height": 720
    },
    {
      "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/responsive/smoke-test-2s10d-1280w-afb8fb834cee-ec96e37e8bc1.webp",
      "mimeType": "image/webp",
      "width": 1280,
      "height": 960
    }
  ]
}
```

Validaciones:

- `responsive.variants[]` presente y no vacio.
- 4 anchos reales: `320`, `640`, `960`, `1280`.
- Todas las variants son `image/webp`.
- Dimensiones positivas.
- No se exponen campos internos (`productAssetId`, `storageKey`, `storageProvider`, `storageBucket`, `checksumSha256`, `sourceChecksumSha256`, `active`, `preferred`, `variantKind`, `purpose`, `sortOrder`, `createdAt`, `updatedAt`).

## Evidencia de URLs WebP responsive

### 320w

- URL: `.../smoke-test-2s10d-320w-afb8fb834cee-89ddf7562ca0.webp`
- HTTP 200.
- `Content-Type: image/webp`.
- `Content-Length: 1128`.

### 640w

- URL: `.../smoke-test-2s10d-640w-afb8fb834cee-c59596944a27.webp`
- HTTP 200.
- `Content-Type: image/webp`.
- `Content-Length: 2910`.

### 960w

- URL: `.../smoke-test-2s10d-960w-afb8fb834cee-263432e2d4b5.webp`
- HTTP 200.
- `Content-Type: image/webp`.
- `Content-Length: 4872`.

### 1280w

- URL: `.../smoke-test-2s10d-1280w-afb8fb834cee-ec96e37e8bc1.webp`
- HTTP 200.
- `Content-Type: image/webp`.
- `Content-Length: 7022`.

## Rutas Storefront Revisadas

- `https://storefront-staging.inktoy.pe/`
- `https://storefront-staging.inktoy.pe/productos`
- `https://storefront-staging.inktoy.pe/categorias/categoria-1`
- `https://storefront-staging.inktoy.pe/productos/smoke-test-2s10d`

## Evidencia Storefront

### Antes de publicar el producto con responsive variants

- `/` -> 200
- `/productos` -> 200
- `/categorias/categoria-1` -> 200
- `/productos/cuaderno-a4` -> 200

### Despues de publicar el producto con responsive variants

- `/` -> **500**
- `/productos` -> **500**
- `/categorias/categoria-1` -> **500**
- `/productos/smoke-test-2s10d` -> **500**

### Error observado en logs de Storefront

```text
Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".
{alt: ..., className: ..., fill: true, loader: function, priority: ..., sizes: ..., src: ...}
                                                 ^^^^^^^^
digest: '3477877200'
```

Interpretacion:

- El Storefront rompe exactamente cuando intenta renderizar un producto con `responsive.variants[]` reales.
- El problema está en pasar `loader: function` a `next/image` en el contexto actual.
- El bug afecta home/listado/categoria/detalle porque todas esas rutas renderizan productos con imagen.

## Resultado

**FAIL**

## Motivo del FAIL

- La API publica staging devuelve correctamente `primaryImage.responsive.variants[]` reales.
- Las URLs WebP responsive responden HTTP 200 y `content-type: image/webp`.
- Pero el Storefront staging rompe en runtime al renderizar el producto con responsive variants, por un error del `loader` de `next/image`.

## Confirmaciones

- No se toco backend funcional en esta subfase.
- No se toco Storefront funcional en esta subfase.
- No se toco infraestructura.
- No se creo migracion.
- No se toco gallery.
- No se implemento AVIF; sigue deferred/blocked.
- Cache avanzada sigue diferida.

## Riesgos Residuales

- El producto de prueba publicado deja staging con paginas Storefront afectadas mientras el bug siga presente.
- Se requiere una subfase correctiva frontend para resolver el uso del `loader` con `next/image`.
- Hasta corregirlo y revalidarlo, 2S.10D no puede cerrarse como PASS total.

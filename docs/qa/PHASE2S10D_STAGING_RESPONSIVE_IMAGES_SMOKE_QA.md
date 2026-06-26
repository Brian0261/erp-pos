# QA - 2S.10D-S Staging Responsive Images Smoke

## Objetivo

Validar en staging el despliegue conjunto backend + Storefront para responsive images, confirmando compatibilidad del contrato publico, fallback con `primaryImage.url` y render correcto del Storefront sin tocar infraestructura ni codigo funcional adicional.

## Alcance

- Push de commits locales a `origin/master`.
- Update minimo en staging de `backend` + `storefront`.
- Smoke HTTP sobre API publica y Storefront staging.
- Confirmacion de contrato `primaryImage` con `responsive` opcional.
- Confirmacion de fallback con `primaryImage.url` cuando no hay variants activas.

## Commits Desplegados

- `cb6f77e feat(ecommerce): expose responsive variants and prevent stale URL assets`
- `2a4645c feat(storefront): consume responsive product image variants`

## Comandos Ejecutados

### Prechecks locales

```powershell
git status
git log --oneline origin/master..HEAD
git diff --stat origin/master..HEAD
```

Resultado:

- Working tree limpio.
- Solo 2 commits pendientes.

### Push a origin/master

```powershell
git push origin master
```

Resultado:

- PASS.
- `bd9fbc9..2a4645c master -> master`.

### Acceso y deploy minimo en staging

```powershell
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "cd /home/ubuntu/erp-pos && git status --short --branch"
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "cd /home/ubuntu/erp-pos && git log --oneline -1"
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "cd /home/ubuntu/erp-pos && docker compose ps"
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "cd /home/ubuntu/erp-pos && git pull --ff-only origin master && docker compose --profile storefront up -d --build backend storefront && docker compose ps"
```

Resultado:

- Host staging limpio antes del pull.
- Head previo en host: `fb0445f`.
- Fast-forward hasta `2a4645c`.
- Rebuild y restart de `backend` + `storefront` exitosos.
- `frontend` Angular y `postgres` se mantuvieron sin rebuild.

### Smoke API publica staging

```powershell
& curl.exe -sS "https://staging.inktoy.pe/api/v1/storefront/catalog/products?size=1"
& curl.exe -sS "https://staging.inktoy.pe/api/v1/storefront/catalog/products/cuaderno-a4"
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -o StrictHostKeyChecking=no ubuntu@52.205.169.234 "curl -sS -o /dev/null -w 'Backend host API HTTP=%{http_code}\n' 'http://127.0.0.1:8080/api/v1/storefront/catalog/products?size=1'"
```

Resultado:

- API publica responde 200 via dominio publico.
- API host-local responde 200 en `127.0.0.1:8080`.

### Smoke Storefront staging

```powershell
& curl.exe -sS -L -o NUL -w "Admin HTTP=%{http_code}`n" "https://staging.inktoy.pe/"
& curl.exe -sS -L -o NUL -w "Storefront home HTTP=%{http_code}`n" "https://storefront-staging.inktoy.pe/"
& curl.exe -sS -L -o NUL -w "Storefront products HTTP=%{http_code}`n" "https://storefront-staging.inktoy.pe/productos"
& curl.exe -sS -L -o NUL -w "Storefront category HTTP=%{http_code}`n" "https://storefront-staging.inktoy.pe/categorias/categoria-1"
& curl.exe -sS -L -o NUL -w "Storefront product HTTP=%{http_code}`n" "https://storefront-staging.inktoy.pe/productos/cuaderno-a4"
& curl.exe -sS "https://storefront-staging.inktoy.pe/robots.txt"
```

Resultado:

- Admin: HTTP 200.
- Storefront home: HTTP 200.
- Storefront products: HTTP 200.
- Storefront category: HTTP 200.
- Storefront product: HTTP 200.
- `robots.txt` mantiene:

```text
User-Agent: *
Disallow: /
```

### CDN WebP

```powershell
& curl.exe -I "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp"
```

Resultado:

- HTTP 200.
- `Content-Type: image/webp`.
- `Content-Length: 4130`.
- `Cache-Control: public, max-age=31536000, immutable`.

## Servicios Levantados o Reutilizados

- `erp-pos-postgres` reutilizado.
- `erp-pos-frontend` reutilizado sin rebuild.
- `erp-pos-backend` rebuild + recreate.
- `erp-pos-storefront` rebuild + recreate.

## URLs y Endpoints Revisados

### API

- `https://staging.inktoy.pe/api/v1/storefront/catalog/products?size=1`
- `https://staging.inktoy.pe/api/v1/storefront/catalog/products/cuaderno-a4`
- `http://127.0.0.1:8080/api/v1/storefront/catalog/products?size=1` (desde host staging)

### Storefront

- `https://storefront-staging.inktoy.pe/`
- `https://storefront-staging.inktoy.pe/productos`
- `https://storefront-staging.inktoy.pe/categorias/categoria-1`
- `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`
- `https://storefront-staging.inktoy.pe/robots.txt`

## Slugs Usados

- Producto: `cuaderno-a4`
- Categoria: `categoria-1`

## Evidencia API

### Listado publico

Respuesta observada:

```json
{
  "items": [
    {
      "slug": "cuaderno-a4",
      "primaryImage": {
        "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp",
        "altText": "Imagen QA WebP 2S10B",
        "type": "PRODUCT_IMAGE",
        "displayOrder": 0,
        "responsive": null
      }
    }
  ]
}
```

### Detalle publico

Respuesta observada:

```json
{
  "slug": "cuaderno-a4",
  "primaryImage": {
    "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp",
    "altText": "Imagen QA WebP 2S10B",
    "type": "PRODUCT_IMAGE",
    "displayOrder": 0,
    "responsive": null
  }
}
```

Validaciones:

- `primaryImage.url` sigue presente.
- `primaryImage.url` mantiene fallback contractual.
- `responsive` existe en contrato desplegado y hoy aparece `null`.
- No se exponen campos internos como `productAssetId`, `storageKey`, `storageProvider`, `storageBucket`, `checksumSha256`, `sourceChecksumSha256`, `active`, `preferred`, `variantKind`, `purpose`, `sortOrder`, `createdAt`, `updatedAt`.
- Listado y detalle mantienen contrato consistente.

## Evidencia Storefront

- `/` responde 200.
- `/productos` responde 200.
- `/categorias/categoria-1` responde 200.
- `/productos/cuaderno-a4` responde 200.
- No se detectaron errores criticos en logs recientes de `backend` ni `storefront`.
- El HTML de `https://storefront-staging.inktoy.pe/productos/cuaderno-a4` renderiza imagen con `next/image` y `img` final sin `<picture>`.

## Evidencia de `responsive.variants[]`

- **No existe evidencia funcional real en staging de un producto con `responsive.variants[]` poblado.**
- El producto visible `cuaderno-a4` devuelve `responsive: null` en listado y detalle.
- Por lo tanto, el consumo real de variants responsive queda sin validar en staging por falta de datos staging con `PRIMARY_RESPONSIVE_WEBP` activa.

## Evidencia de fallback `primaryImage.url`

- Aunque `responsive` es `null`, Storefront staging renderiza `cuaderno-a4` correctamente con HTTP 200.
- La imagen mostrada usa `primaryImage.url` sin error de render.
- Esto confirma backward compatibility y que `responsive.variants[]` no es obligatoria para renderizar.

## Evidencia de URLs WebP responsive

- **No existe URL responsive staging validable en esta subfase**, porque no se observó ningun `responsive.variants[]` poblado en API publica staging.
- URL WebP validada disponible:
  - `https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp`
  - HTTP 200.
  - `Content-Type: image/webp`.
- Esta URL corresponde al derivado WebP preferido/fallback actual, no a una variant responsive expuesta en `responsive.variants[]`.

## Resultado

**PARTIAL**

Se valida correctamente:

- Push de ambos commits.
- Deploy minimo staging de `backend` + `storefront`.
- Backend y Storefront responden 200.
- Contrato nuevo desplegado con `responsive: null`.
- Backward compatibility y fallback con `primaryImage.url`.
- Render Storefront correcto con `next/image`.

Queda pendiente:

- Validar consumo real de `responsive.variants[]` con un producto staging que tenga `PRIMARY_RESPONSIVE_WEBP` activa.

## Confirmaciones

- No se toco backend funcional en esta subfase; solo se desplego codigo ya commiteado.
- No se toco Storefront funcional en esta subfase; solo se desplego codigo ya commiteado.
- No se toco infraestructura.
- No se creo migracion nueva; solo se aplico V20 ya versionada al actualizar staging.
- No se toco gallery.
- No se implemento AVIF; sigue deferred/blocked.
- Cache avanzada sigue diferida.

## Riesgos Residuales

- Falta un producto staging con `responsive.variants[]` poblado para validar el flujo completo end-to-end.
- La validacion de widths especificos (`320w`, `640w`, `960w`, `1280w`) queda pendiente hasta disponer de ese producto.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Cache CDN/Next/Image puede influir en observaciones visuales posteriores.

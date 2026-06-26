# QA - 2S.10D-G-D Storefront Responsive Loader Boundary Fix

## Objetivo

Corregir el bug frontend-only que hacia fallar Storefront con HTTP 500 cuando un producto publico tenia `primaryImage.responsive.variants[]` reales, manteniendo `next/image`, `primaryImage.url` como fallback y el consumo real de variants responsive.

## Causa Raiz Confirmada

`ProductImageFrame` era un Server Component y creaba una funcion inline `responsiveLoader`. Esa funcion se pasaba como prop `loader` a `next/image`.

En Next.js 16 / React 19, las props que cruzan de Server Components a Client Components deben ser serializables. La funcion `loader` creada en servidor no lo era, por lo que Storefront fallaba con:

```text
Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".
{alt: ..., className: ..., fill: true, loader: function, priority: ..., sizes: ..., src: ...}
                                                 ^^^^^^^^
```

## Solucion Aplicada

- `ProductImageFrame` se mantiene como Server Component.
- Se creo `ProductImageFrameClient` como Client Component pequeno con `"use client"`.
- Se movio solo al Client Component:
  - import de `next/image`.
  - definicion del custom loader.
  - render de `Image`.
- `ProductImageFrame` ahora conserva el frame visual, placeholder y fallback cuando no hay `src`.
- `ProductImageFrame` pasa al Client Component solo props serializables:
  - `src`.
  - `alt`.
  - `priority`.
  - `sizes`.
  - `responsiveVariants`.
- No se pasan funciones desde Server Component hacia Client Component.
- No se importo runtime de `storefront/lib/images.ts` en el Client Component; solo se usa un type-only import.
- Se duplico localmente una funcion minima y pura para elegir variant por width.

## Por Que Se Eligio Client Component Pequeno

- Corrige el boundary exacto sin convertir todo el frame visual en cliente.
- Mantiene baja la superficie client-side.
- Evita arrastrar logica server/build con `process.env` desde `storefront/lib/images.ts`.
- Mantiene `next/image`.
- Mantiene `primaryImage.url` como fallback.
- Mantiene consumo real de `responsive.variants[]`.
- Mantiene compatibilidad con `responsive: null`, vacio o invalido.
- Evita workaround prohibidos como `<img>`, `<picture>` o desactivar responsive variants.

## Archivos Modificados

- `storefront/components/ui/product-image-frame.tsx`
- `storefront/components/ui/product-image-frame-client.tsx`
- `docs/qa/PHASE2S10D_GD_STOREFRONT_RESPONSIVE_LOADER_BOUNDARY_FIX_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Checks Locales Ejecutados

### `npm run lint`

Resultado: PASS.

### `npx tsc --noEmit`

Resultado: PASS.

### `npm run build`

Resultado: PASS.

Observacion no bloqueante:

- Warning existente de Next.js/Turbopack por multiples lockfiles y root inferido.

## Smoke Local

Rutas locales revisadas contra Storefront local disponible:

- `http://localhost:3000/` -> HTTP 200.
- `http://localhost:3000/productos` -> HTTP 200.
- `http://localhost:3000/categorias/categoria-online-1` -> HTTP 200.
- `http://localhost:3000/productos/producto-6` -> HTTP 200.

## Commit

- `96dc6c3 fix(storefront): keep responsive image loader inside client boundary`.

## Push

- Push realizado a `origin/master`.

## Staging

- Staging actualizado desde `2a4645c` hasta `96dc6c3` por fast-forward.
- Comando ejecutado:

```bash
git pull --ff-only origin master
docker compose --profile storefront up -d --build storefront
```

Nota operativa:

- Aunque el comando apunto a `storefront`, Docker Compose tambien reconstruyo/recreo `backend` por dependencias del perfil.
- No hubo cambios funcionales backend en el commit.
- No se modificaron migraciones ni infraestructura.

## Rutas Storefront Staging Revisadas

- `https://storefront-staging.inktoy.pe/` -> HTTP 200.
- `https://storefront-staging.inktoy.pe/productos` -> HTTP 200.
- `https://storefront-staging.inktoy.pe/categorias/categoria-1` -> HTTP 200.
- `https://storefront-staging.inktoy.pe/productos/smoke-test-2s10d` -> HTTP 200.

Observacion:

- La primera pasada inmediatamente despues del deploy devolvio 500 por `StorefrontApiError` mientras backend terminaba de arrancar.
- Tras estabilizar servicios, las cuatro rutas devolvieron HTTP 200.

## Endpoint API Revisado

- `GET https://staging.inktoy.pe/api/v1/storefront/catalog/products/smoke-test-2s10d` -> HTTP 200.

## Evidencia de `primaryImage.url`

```json
{
  "url": "https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/2/profiles/2/variants/smoke-test-2s10d-afb8fb834cee-8b05af9e5348.webp",
  "altText": "Smoke responsive 2S10D",
  "type": "PRODUCT_IMAGE",
  "displayOrder": 0
}
```

Validacion:

- `primaryImage.url` sigue presente como fallback contractual.

## Evidencia de `primaryImage.responsive.variants[]`

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
- Variants WebP reales: `320w`, `640w`, `960w`, `1280w`.
- Width y height positivos.
- No se observaron campos internos.

## Evidencia de URLs WebP Responsive

- 320w: HTTP 200, `Content-Type: image/webp`, `Content-Length: 1128`.
- 640w: HTTP 200, `Content-Type: image/webp`, `Content-Length: 2910`.
- 960w: HTTP 200, `Content-Type: image/webp`, `Content-Length: 4872`.
- 1280w: HTTP 200, `Content-Type: image/webp`, `Content-Length: 7022`.

## Confirmacion Sobre `loader: function`

- Local build PASS sin error de serializacion por `loader`.
- Logs Storefront staging estabilizados (`docker logs --since 20s erp-pos-storefront`) sin:
  - `Functions cannot be passed directly to Client Components`.
  - `loader: function`.
- Los errores `StorefrontApiError` observados fueron transitorios durante el reinicio/reconexion post-deploy y no persistieron tras estabilizar servicios.

## Confirmaciones de Alcance

- No se toco backend.
- No se toco infraestructura.
- No se creo migracion.
- No se toco Dockerfile/docker-compose.
- No se tocaron Caddy/DNS/AWS/S3/CloudFront/IAM.
- No se tocaron secretos ni `.env` reales.
- No se implemento AVIF; sigue deferred/blocked.
- No se implemento cache avanzada; sigue diferida.
- No se toco gallery.
- No se cambio a `<img>`.
- No se uso `<picture>`.
- No se desactivo `responsive.variants[]`.
- No se elimino ni despublico `smoke-test-2s10d`.
- No se creo tag.

## Resultado

PASS.

## Riesgos Residuales

- Docker Compose reconstruyo/recreo backend durante el deploy del perfil aunque la correccion fue frontend-only; no hubo cambio funcional backend.
- La primera pasada de rutas Storefront justo despues del deploy devolvio 500 por backend aun arrancando; la pasada estabilizada devolvio 200 en todas las rutas.
- AVIF sigue deferred/blocked.
- Cache avanzada sigue diferida.

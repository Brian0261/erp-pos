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

- Pendiente de crear al momento de esta primera actualizacion documental.

## Push

- Pendiente.

## Staging

- Pendiente de actualizar.

## Rutas Storefront Staging Revisadas

- Pendiente tras push/deploy.

## Endpoint API Revisado

- Pendiente tras push/deploy.

## Evidencia de `primaryImage.url`

- Pendiente tras smoke staging final.

## Evidencia de `primaryImage.responsive.variants[]`

- Pendiente tras smoke staging final.

## Evidencia de URLs WebP Responsive

- Pendiente tras smoke staging final.

## Confirmacion Sobre `loader: function`

- Local build PASS sin error de serializacion por `loader`.
- Confirmacion final en logs staging pendiente tras deploy.

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

PARTIAL hasta completar commit, push, deploy y smoke staging.

## Riesgos Residuales

- Falta validar en staging con el producto real `smoke-test-2s10d`.
- Falta confirmar logs staging sin `Functions cannot be passed directly to Client Components` ni `loader: function`.
- 2S.10D todavia no puede cerrarse como PASS total hasta finalizar el smoke staging post-fix.

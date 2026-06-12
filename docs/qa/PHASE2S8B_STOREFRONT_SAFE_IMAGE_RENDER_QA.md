# Phase 2S.8B Storefront Safe Image Render QA

## Objetivo

Permitir que Storefront renderice imagenes publicas ecommerce de forma segura cuando `primaryImage.url` sea un path publico relativo o una URL `https` de dominio explicitamente permitido.

## Alcance

- Storefront Next.js.
- `next.config.ts` con `images.remotePatterns` estricto.
- Helper central `storefront/lib/images.ts`.
- Paginas Storefront que consumen `primaryImage` y metadata Open Graph.

## Fuera De Alcance Confirmado

- Sin cambios backend.
- Sin cambios Angular admin.
- Sin cambios Producto ERP, POS, stock, inventario, unidad, costo ni precio ERP.
- Sin Flyway, Docker, auth/security ni indexacion.
- Sin upload binario.
- Sin storage/CDN.
- Sin ZIP.
- Sin importacion masiva de imagenes ni columna imagen en Excel.
- Sin galeria.
- Sin structured data ni Merchant Center.
- Sin buscador, filtros, carrito, checkout ni pagos.

## Variable De Entorno

- `STOREFRONT_IMAGE_ALLOWED_DOMAINS`
- Lista separada por comas.
- Documentada en `storefront/.env.local.example`.
- Default restrictivo: vacia, sin dominios externos permitidos.
- No se asume dominio productivo real.

## Politica Storefront

- Permitido: path relativo publico que empieza con `/` y no empieza con `//`.
- Permitido: URL absoluta `https://` cuyo host coincida con `STOREFRONT_IMAGE_ALLOWED_DOMAINS` o subdominio de un dominio permitido.
- Bloqueado: `http`, `file`, `data`, `ftp`, credenciales, strings vacios, whitespace/control chars, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`.

## remotePatterns

- `storefront/next.config.ts` genera `images.remotePatterns` desde `STOREFRONT_IMAGE_ALLOWED_DOMAINS`.
- Solo usa protocolo `https`.
- No agrega wildcard global.
- Si la variable esta vacia, `remotePatterns` queda vacio y no rompe build.
- Paths relativos existentes siguen funcionando.

## Uso En Storefront

- `storefront/app/page.tsx`
- `storefront/app/productos/page.tsx`
- `storefront/app/productos/[slug]/page.tsx`
- `storefront/app/categorias/[slug]/page.tsx`

Las paginas usan `getSafeImageSrc` y `getSafeImageAlt` para render de producto. Metadata usa `getSafeOpenGraphImage` para evitar OG images externas no permitidas.

## Fallback

- Si la imagen no es segura o no esta permitida, se envia `null` a `ProductImageFrame`.
- Se mantiene el fallback visual actual: `Imagen InkToy proximamente`.
- No se muestra imagen externa no permitida.
- No debe ocurrir error runtime de `next/image` por host no permitido.

## Validaciones Ejecutadas

| Command | Result |
|---|---|
| `npm run build` in `storefront` | OK |
| `npm run lint` in `storefront` | OK |
| `git diff --check` | OK |

Nota: `npm run build` mostro warning no bloqueante de Next.js por multiples lockfiles/workspace root.

## Alineacion Obligatoria De Allowlists

- Backend 2S.8A: `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS` valida guardado, readiness y publicacion de `ProductAsset.assetUrl`.
- Storefront 2S.8B: `STOREFRONT_IMAGE_ALLOWED_DOMAINS` valida render seguro, `next/image` y OG image.
- Ambas allowlists deben mantenerse alineadas:
  - Backend bloquea URLs no permitidas antes de guardar/publicar.
  - Storefront bloquea URLs no permitidas antes de renderizar.
- Si un dominio se agrega en backend, debe agregarse en Storefront para que la imagen se vea.
- Si un dominio se quita en backend, debe quitarse en Storefront para que deje de renderizarse.

## Warning De Next No Bloqueante

- `npm run build` muestra warning de Next.js por multiples lockfiles/workspace root.
- Este warning no bloquea build ni lint.
- Se documenta como observacion operativa, no como defecto de 2S.8B.

## Riesgos Pendientes

- La allowlist Storefront debe mantenerse alineada con la allowlist backend 2S.8A.
- Aun no hay upload/storage/CDN real.
- Aun no hay validacion binaria de MIME, dimensiones o peso.
- Activar indexacion sigue fuera de alcance.

## Siguiente Fase Recomendada

- 2S.8C — Decision e implementacion controlada de storage/CDN o carga manual inicial de imagenes, sin activar indexacion.

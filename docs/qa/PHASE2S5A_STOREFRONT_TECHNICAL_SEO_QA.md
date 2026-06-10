# PHASE2S5A - Storefront Technical SEO QA

## Objetivo

Cerrar la base SEO tecnica del Storefront sin activar indexacion, dejando preparada la publicacion futura con sitemap.xml, robots controlado por entorno y canonicals absolutos.

## Alcance implementado

- `storefront/app/sitemap.ts` creado.
- `storefront/app/robots.ts` creado.
- `storefront/lib/seo.ts` creado.
- `storefront/.env.local.example` actualizado con `STOREFRONT_PUBLIC_BASE_URL`.
- Canonical/metadata normalizados en `storefront/app/page.tsx`, `storefront/app/productos/page.tsx` y `storefront/app/categorias/page.tsx`.
- `storefront/public/robots.txt` eliminado para evitar doble fuente de `/robots.txt`.
- `storefront/app/layout.tsx` mantiene `index: false` y `follow: false` por defecto.

## Decisiones tecnicas

- `storefront/app/robots.ts` es la unica fuente efectiva de `/robots.txt`.
- Por defecto, `STOREFRONT_INDEXING_ENABLED=false` devuelve `User-agent: *` + `Disallow: /`.
- `STOREFRONT_PUBLIC_BASE_URL` se resuelve desde env y, si falta o es invalida, usa fallback seguro `http://localhost:3000`.
- `storefront/app/sitemap.ts` consume el sitemap JSON existente del backend desde `GET /api/v1/storefront/seo/sitemap`.
- El sitemap XML no inventa URLs: solo transforma las entradas entregadas por el backend.
- Si el backend no responde, el sitemap devuelve rutas base seguras para no romper build/runtime.

## Archivos creados, modificados y eliminados

- Creados:
  - `storefront/lib/seo.ts`
  - `storefront/app/sitemap.ts`
  - `storefront/app/robots.ts`
  - `docs/qa/PHASE2S5A_STOREFRONT_TECHNICAL_SEO_QA.md`
- Modificados:
  - `storefront/.env.local.example`
  - `storefront/app/layout.tsx`
  - `storefront/app/page.tsx`
  - `storefront/app/productos/page.tsx`
  - `storefront/app/categorias/page.tsx`
- Eliminados:
  - `storefront/public/robots.txt`

## Validaciones ejecutadas

- `npm run build` en `storefront/`: OK.
- `npm run lint` en `storefront/`: OK.
- `npx tsc --noEmit` en `storefront/`: OK.
- `git diff --check`: OK.

## Smoke ejecutado

- `/` 200.
- `/productos` 200.
- `/categorias` 200.
- `/sitemap.xml` 200.
- `/robots.txt` 200.
- `/buscar` 404 esperado.
- `robots` bloquea por defecto.
- `noindex` sigue activo por defecto.
- Sin llamadas nuevas a `/api/v1/ecommerce-admin`.

## Exclusiones confirmadas

- No backend.
- No contratos, DTOs ni endpoints.
- No structured data.
- No buscador.
- No filtros.
- No carrito.
- No checkout.
- No pagos.
- No Merchant Center.
- No `remotePatterns`.
- No imagenes externas.

## Riesgos pendientes

- Configurar un dominio real en `STOREFRONT_PUBLIC_BASE_URL` antes de publicar.
- Limpiar datos de prueba antes de indexar.
- Activar indexacion solo en una fase posterior separada y controlada.

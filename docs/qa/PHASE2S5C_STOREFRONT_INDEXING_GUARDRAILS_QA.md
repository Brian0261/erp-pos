# PHASE2S5C - Storefront Indexing Guardrails QA

## Objetivo

Cerrar los guardrails tecnicos que evitan una activacion accidental de indexacion en un entorno no preparado.

## Guardrails implementados

- `canStorefrontAllowIndexing()` centraliza la decision de indexacion.
- La indexacion solo puede permitirse si `STOREFRONT_INDEXING_ENABLED=true` y `STOREFRONT_PUBLIC_BASE_URL` es publicable.
- Se bloquea indexacion si la base URL falta, es invalida, es `localhost`, `127.0.0.1`, `0.0.0.0` o dominio `example/test`.
- `robots.ts` sigue bloqueando cuando el flag esta true pero la base URL no es publicable.
- Metadata global y dinamica usan el helper compartido para evitar inconsistencias.
- `.env.local.example` documenta que no debe activarse indexacion con localhost ni datos smoke/test.

## Archivos modificados

- `storefront/lib/seo.ts`
- `storefront/app/robots.ts`
- `storefront/app/layout.tsx`
- `storefront/app/productos/[slug]/page.tsx`
- `storefront/app/categorias/[slug]/page.tsx`
- `storefront/.env.local.example`

## Confirmaciones tecnicas

- Indexacion sigue bloqueada por defecto.
- `localhost` no puede quedar indexable aunque `STOREFRONT_INDEXING_ENABLED=true`.
- No se toco backend, Angular, ecommerce-admin, contratos, DTOs, endpoints, Flyway, Docker ni seguridad.

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
- Con env por defecto, robots bloquea indexacion.
- Con env por defecto, metadata sigue noindex.
- Sin llamadas nuevas a `/api/v1/ecommerce-admin`.

## Exclusiones confirmadas

- No backend.
- No contratos.
- No structured data.
- No buscador.
- No filtros.
- No carrito.
- No checkout.
- No pagos.
- No Merchant Center.
- No `remotePatterns`.

## Riesgos pendientes

- Limpiar datos smoke/test antes de publicar.
- Configurar dominio real en `STOREFRONT_PUBLIC_BASE_URL`.
- Mejorar contenido comercial real.
- Activar indexacion solo en una fase posterior separada y controlada.

## Siguiente frente recomendado

- `2S.6 - Discovery de limpieza de datos públicos y contenido indexable`.

# QA Checklist - Fase 2D Storefront Architecture Decision

## Estado

Checklist documental para validar Fase 2D. No ejecuta runtime, no crea Next.js y no implementa codigo funcional.

## Alcance validado

- [x] ADR Storefront Next.js creado: `docs/adr/ecommerce/ECOM-ADR-020-storefront-nextjs-delivery-architecture.md`.
- [x] Plan Storefront Next.js creado: `docs/ecommerce/STOREFRONT_NEXTJS_DELIVERY_PLAN.md`.
- [x] Rutas publicas objetivo definidas: `/productos/{slug}` y `/categorias/{slug}`.
- [x] `/marcas/{slug}` queda diferido.
- [x] Estrategia SSG/ISR definida como principal para productos y categorias.
- [x] SSR definido como estrategia diferida solo para casos necesarios.
- [x] `sitemap.xml` futuro definido como responsabilidad de Next.js usando `GET /api/v1/storefront/seo/sitemap`.
- [x] `robots.txt` futuro definido como responsabilidad/control de Storefront.
- [x] `canonical` definido desde `canonicalPath` o regla backend/contractual aprobada.
- [x] Staging definido como no indexable por defecto.
- [x] Filtros, facetas, busquedas y paginas pobres definidos como no indexables por defecto.

## Separacion admin/public

- [x] Angular `frontend/` queda solo para ERP/POS interno.
- [x] Storefront publica futura queda separada como `storefront/` raiz, sin crearse en Fase 2D.
- [x] Storefront API publica/controlada queda bajo `/api/v1/storefront/...`.
- [x] API administrativa `/api/v1/ecommerce-admin/...` no queda expuesta como contrato publico.
- [x] DTOs administrativos no deben reutilizarse como contratos publicos.
- [x] Storefront futura no debe consultar base de datos directamente.

## Restricciones de no implementacion

- [x] Sin codigo funcional.
- [x] Sin proyecto Next.js creado.
- [x] Sin carpeta `storefront/` creada.
- [x] Sin dependencias instaladas.
- [x] Sin cambios en Angular `frontend/`.
- [x] Sin cambios en backend funcional.
- [x] Sin cambios Flyway/DB.
- [x] Sin cambios Docker.
- [x] Sin cambios `.env`.
- [x] Sin secretos leidos o modificados.
- [x] Sin AWS/staging.
- [x] Sin `sitemap.xml` real.
- [x] Sin checkout.
- [x] Sin pagos.
- [x] Sin delivery.
- [x] Sin Merchant Center.
- [x] Sin pedidos online.
- [x] Sin stock reservado.

## Evidencia documental esperada

- [x] Roadmap actualizado con Fase 2D como fase documental/arquitectonica.
- [x] Backlog actualizado con historias Fase 2D.
- [x] Estrategia SEO-first alineada con Next.js, sitemap JSON backend, canonicalPath y noindex staging.
- [x] Current status actualizado con Fase 2D iniciada.
- [x] Change control actualizado con alcance, archivos y restricciones.

## Criterio de salida QA documental

Fase 2D queda lista para revision humana si:

1. Los documentos creados y actualizados son consistentes entre si.
2. No existen cambios fuera de `docs/`.
3. No se creo Next.js ni `storefront/`.
4. No se tocaron codigo funcional, dependencias, entorno ni infraestructura.
5. `git diff --check` no reporta errores.

## Recomendacion QA

Antes de commit, revisar documentalmente ADR-020, el plan de delivery y este checklist para confirmar que Fase 2E queda correctamente acotada como shell publico minimo y no como tienda transaccional.

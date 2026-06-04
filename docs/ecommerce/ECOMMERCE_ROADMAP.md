# Roadmap Ecommerce InkToy

## Estado actual

- Fase 1C ecommerce admin interno cerrada funcional y documentalmente.
- Fase 2A Storefront Discovery & Contracts cerrada documentalmente.
- Fase 2B Public Catalog API Design cerrada documentalmente.
- Fase 2C Public Catalog API Read-only Implementation cerrada funcional y documentalmente.
- Fase 2D Storefront Architecture Decision & SEO Delivery Plan cerrada documentalmente.
- Fase 2E.0 Storefront MVP Shell Planning cerrada documentalmente.
- Fase 2E.1 Storefront MVP Shell Implementation cerrada funcionalmente (commit `c049e3e`).
- Fase 2E.2 QA y documentacion del shell cerrada documentalmente.
- Fase 2F.0 Public SEO Catalog MVP Planning cerrada documentalmente (commit `4e22712`).
- Fase 2F.1 Diseno visual con Google Stitch aprobada (Catalogo Creativo Profesional).
- Fase 2F.2 Componentes base Next.js/Tailwind cerrada funcional y documentalmente.
  - 2F.2A: Foundations visuales + UI base (Button, Badge, Chip, Breadcrumbs, SectionHeading, ProductImageFrame, Accordion).
  - 2F.2B: Layout (StorefrontHeader, StorefrontFooter, BottomNavigation) con logo InkToy real.
  - 2F.2C: Catalogo visual (ProductCard, CategoryCard, EmptyState, StickyProductCTA) + preview tecnico en `/`.
  - Commit: `1a55ec0 feat(storefront): add catalog visual components`.
- Fase actual autorizada: Fase 2F.2D QA tecnica y documentacion de componentes.
- Fase 2F.2D es solo documental/QA. No implementa codigo funcional.

## Principios

- ERP/POS sigue siendo la fuente de verdad para catalogo, precio, stock, pedidos, ventas y facturacion.
- La futura tienda online debe ser SEO-first desde su arquitectura.
- La API publica debe separarse de la API administrativa interna.
- `/api/v1/ecommerce-admin/...` no se expone ni se reutiliza como contrato publico.
- Los DTOs publicos deben ser distintos de los DTOs administrativos.
- El frontend publico no calcula precio efectivo ni decide si un producto es publicable.
- Toda regla critica permanece server-side.

## Fases propuestas

| Fase | Objetivo | Resultado esperado |
|---|---|---|
| 2A | Storefront SEO-first Discovery & Contracts | Roadmap, backlog, estrategia SEO-first, contratos draft y checklist QA documental. |
| 2B | Public Catalog API Design | Diseno contractual de API publica read-only con DTOs publicos y errores seguros. |
| 2C | Public Catalog API Read-only Implementation | Implementacion local de API publica read-only para catalogo, categorias y SEO basico. |
| 2D | Storefront Architecture Decision & SEO Delivery Plan | Decision documental sobre Next.js, SSG/ISR, SSR diferido, rutas publicas, `sitemap.xml` futuro, `robots.txt`, canonical, noindex staging, estructura futura `storefront/` y limites de Storefront. |
| 2E.0 | Storefront MVP Shell Planning | Decision tecnica documental del stack (Next.js 16, App Router, TypeScript, Tailwind), estructura de carpetas y configuracion base del shell. |
| 2E.1 | Storefront MVP Shell Implementation | Shell publico minimo instalado en `storefront/` con build exitoso, sin paginas reales. |
| 2F.0 | Public SEO Catalog MVP Planning | Plan documental, limpieza de deuda heredada y definicion de subfases con Google Stitch. |
| 2F.1 | Diseno visual con Google Stitch | Artefactos visuales aprobados: home, productos, categorias, layout, componentes, responsive. |
| 2F.2 | Componentes base Next.js/Tailwind | Layout, header/footer, cards, grids, estados vacios/error sin API real aun. |
| 2F.3 | Integracion real Storefront API | Paginas /productos, /productos/{slug}, /categorias, /categorias/{slug} consumiendo endpoints. |
| 2F.4 | SEO tecnico inicial | generateMetadata, canonical, notFound(), noindex/indexable, ISR. |
| 2F.5 | QA/cierre documental 2F | Build/lint/typecheck, smoke local, docs actualizados y deudas registradas. |
| Posteriores | Intencion de compra, pedidos, pagos, delivery, Merchant Center y despliegue | Fases futuras separadas, aprobadas una por una. |

## Limites de aprobacion actuales

- Fase 2F.0 cerrada documentalmente (commit `4e22712`).
- Fase 2F.1 aprobada como diseno visual "Catalogo Creativo Profesional".
- Fase 2F.1 es solo aprobacion visual. No implementa codigo funcional.
- No se autoriza en fase actual:
  - Paginas reales de producto/categoria
  - Consumo real de endpoints Storefront
  - sitemap.xml real
  - Checkout, carrito, pagos
  - Pedidos online
  - Delivery
  - Merchant Center
  - Stock reservado
  - AWS/staging

## Criterio de salida de Fase 2F.2D

- QA documental de componentes completado.
- Documentacion de sistema de componentes creada (`STOREFRONT_COMPONENTS_SYSTEM_2F2.md`).
- QA checklist de componentes creado (`PHASE2F2_STOREFRONT_COMPONENTS_QA_CHECKLIST.md`).
- CURRENT_STATUS, CHANGE_CONTROL, ROADMAP, BACKLOG y MVP_PLAN actualizados.
- Deudas no bloqueantes registradas.
- No hay paginas reales implementadas.
- No hay consumo real de API desde paginas.
- No hay cambios fuera de `docs/` y `storefront/`.

## Siguiente paso esperado

Abrir Fase 2F.3A — Alineacion de tipos TypeScript/API client con DTOs publicos reales antes de implementar paginas reales de catalogo.

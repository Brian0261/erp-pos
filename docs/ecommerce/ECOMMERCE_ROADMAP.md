# Roadmap Ecommerce InkToy

## Estado actual

- Fase 1C ecommerce admin interno cerrada funcional y documentalmente.
- Fase 2A Storefront Discovery & Contracts cerrada documentalmente.
- Fase 2B Public Catalog API Design cerrada documentalmente.
- Fase 2C Public Catalog API Read-only Implementation cerrada funcional y documentalmente.
- Fase 2D Storefront Architecture Decision & SEO Delivery Plan cerrada documentalmente.
- Fase 2E.0 Storefront MVP Shell Planning cerrada documentalmente.
- Fase 2E.1 Storefront MVP Shell Implementation cerrada funcionalmente (commit `c049e3e`).
- Fase actual autorizada: Fase 2E.2 QA y documentacion del shell.
- Fase 2E.2 es solo documental/QA. No implementa codigo funcional.

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
| 2F | Public SEO Catalog MVP | Catalogo publico SEO con listados y detalle de producto/categoria. |
| Posteriores | Intencion de compra, pedidos, pagos, delivery, Merchant Center y despliegue | Fases futuras separadas, aprobadas una por una. |

## Limites de aprobacion actuales

- Fase 2E.2 esta aprobada solo como trabajo documental/QA.
- Fase 2F (catalogo publico SEO) no queda aprobada todavia.
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

## Criterio de salida de Fase 2E.2

- QA documental del shell completado.
- CURRENT_STATUS, CHANGE_CONTROL, ROADMAP, BACKLOG y QA checklist actualizados.
- Deudas no bloqueantes registradas (npm audit, warning Turbopack, README generico, SVGs default).
- No hay paginas reales implementadas.
- No hay consumo real de API.
- No hay cambios fuera de `docs/` y `storefront/`.

## Siguiente paso esperado

Preparar Fase 2F Public SEO Catalog MVP en Plan Mode para definir listados y detalle de producto/categoria reales, antes de implementar cualquier pagina funcional.

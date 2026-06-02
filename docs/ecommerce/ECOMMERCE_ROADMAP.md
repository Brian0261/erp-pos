# Roadmap Ecommerce InkToy

## Estado actual

- Fase 1C ecommerce admin interno cerrada funcional y documentalmente.
- Fase 2A Storefront Discovery & Contracts cerrada documentalmente.
- Fase 2B Public Catalog API Design cerrada documentalmente.
- Fase 2C Public Catalog API Read-only Implementation cerrada funcional y documentalmente.
- Fase actual autorizada: Fase 2D Storefront Architecture Decision & SEO Delivery Plan.
- Esta fase es documental/arquitectonica y no implementa codigo funcional, Next.js, `storefront/`, dependencias ni infraestructura publica.

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
| 2E | Storefront MVP Shell | Shell publico inicial y capas tecnicas minimas solo si Fase 2D queda revisada y aprobada; sin compra online. |
| 2F | Public SEO Catalog MVP | Catalogo publico SEO con listados y detalle de producto/categoria. |
| Posteriores | Intencion de compra, pedidos, pagos, delivery, Merchant Center y despliegue | Fases futuras separadas, aprobadas una por una. |

## Limites de aprobacion actuales

- Fase 2D esta aprobada solo como trabajo documental/arquitectonico.
- Fase 2E no queda aprobada para implementacion todavia.
- No se autoriza en esta fase:
  - Next.js
  - carpeta `storefront/`
  - instalacion de dependencias
  - Storefront funcional
  - sitemap.xml real
  - Checkout
  - Pagos
  - Pedidos online
  - Delivery
  - Merchant Center
  - AWS/staging

## Criterio de salida de Fase 2D

- ADR Storefront Next.js Delivery Architecture creado.
- Plan Storefront Next.js Delivery creado.
- Checklist QA documental Fase 2D creado.
- Rutas publicas objetivo documentadas: `/productos/{slug}` y `/categorias/{slug}`.
- `/marcas/{slug}` diferido.
- Estrategia SSG/ISR principal y SSR diferido documentada.
- `sitemap.xml` futuro definido como generado por Next.js usando fuente JSON backend.
- `robots.txt`, canonical y noindex staging documentados.
- Separacion Angular interno vs Storefront publica validada.
- Restricciones fuera de alcance registradas.

## Siguiente paso esperado

Revisar y aprobar la documentacion de Fase 2D antes de abrir Fase 2E Storefront MVP Shell. Fase 2E solo deberia crear el shell publico minimo si existe aprobacion explicita para crear `storefront/` e instalar dependencias.

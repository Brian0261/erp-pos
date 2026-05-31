# Roadmap Ecommerce InkToy

## Estado actual

- Fase 1C ecommerce admin interno cerrada funcional y documentalmente.
- Fase actual autorizada: Fase 2A documental.
- Esta fase no implementa codigo funcional, endpoints, Next.js ni infraestructura publica.

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
| 2D | Storefront Architecture Decision | Decision final sobre SSR/SSG/ISR, estructura del proyecto y limites de Storefront. |
| 2E | Storefront MVP Shell | Shell publico inicial, navegacion base y capas tecnicas minimas sin compra online. |
| 2F | Public SEO Catalog MVP | Catalogo publico SEO con listados y detalle de producto/categoria. |
| Posteriores | Intencion de compra, pedidos, pagos, delivery, Merchant Center y despliegue | Fases futuras separadas, aprobadas una por una. |

## Limites de aprobacion actuales

- Fase 2A esta aprobada solo como trabajo documental.
- Fases 2B en adelante no quedan aprobadas para implementacion todavia.
- No se autoriza en esta fase:
  - Next.js
  - Storefront funcional
  - Checkout
  - Pagos
  - Pedidos online
  - Delivery
  - Merchant Center
  - AWS/staging

## Criterio de salida de Fase 2A

- Roadmap creado.
- Backlog inicial creado.
- Estrategia SEO-first creada.
- Contratos publicos draft creados.
- Checklist QA documental creado.
- Decisiones cerradas y pendientes registradas.

## Siguiente paso esperado

Revisar y aprobar la documentacion de Fase 2A antes de abrir Fase 2B Public Catalog API Design.

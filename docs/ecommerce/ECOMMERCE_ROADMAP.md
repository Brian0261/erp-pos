# Roadmap Ecommerce InkToy

## Estado actual

- Fase 1C ecommerce admin interno cerrada funcional y documentalmente.
- Fase 2A Storefront Discovery & Contracts cerrada documentalmente.
- Fase 2B Public Catalog API Design cerrada documentalmente.
- Fase 2C Public Catalog API Read-only Implementation cerrada funcional y documentalmente.
- Fase 2D Storefront Architecture Decision & SEO Delivery Plan cerrada documentalmente.
- Fase actual autorizada: Fase 2E.0 Storefront MVP Shell Planning (stack tecnico, estructura y shell minimo).
- Fase 2E.0 es documental/tecnica y no implementa `storefront/`, Next.js, dependencias ni infraestructura publica.

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

- Fase 2E.0 esta aprobada solo como trabajo documental/tecnico de planificacion.
- Fase 2E.1 (implementacion del shell) no queda aprobada todavia.
- No se autoriza en esta fase:
  - Next.js instalado
  - carpeta `storefront/` creada
  - dependencias instaladas
  - Storefront funcional
  - sitemap.xml real
  - Checkout
  - Pagos
  - Pedidos online
  - Delivery
  - Merchant Center
  - AWS/staging

## Criterio de salida de Fase 2E.0

- ADR Storefront Tech Stack (ECOM-ADR-021) creado.
- Plan MVP Shell creado.
- Checklist QA Fase 2E creado.
- Stack tecnico confirmado: Next.js 16, App Router, TypeScript, npm, Tailwind CSS.
- Estructura de carpetas futura documentada.
- Variables de entorno y seguridad documentadas.
- `robots.txt` de desarrollo definido.
- Paginas reales y sitemap.xml diferidos.
- Restricciones fuera de alcance registradas.

## Siguiente paso esperado

Revisar y aprobar la documentacion de Fase 2E.0 antes de abrir Fase 2E.1 Storefront MVP Shell Implementation. Fase 2E.1 solo deberia crear el shell publico minimo si existe aprobacion explicita para crear `storefront/` e instalar dependencias.

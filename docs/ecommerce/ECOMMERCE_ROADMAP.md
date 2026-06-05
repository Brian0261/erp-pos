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
- Fase 2F.2D QA tecnica y documentacion de componentes cerrada documentalmente.
- Fase 2G.1 Publicacion de producto operativo a perfil ecommerce cerrada funcionalmente (commit `f766397`).
- Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront cerrada funcional y documentalmente.
  - End-to-end validado: Producto ERP/POS → Perfil online DRAFT → PUBLISHED → Storefront `/productos/{slug}` (200 OK).
  - Casos negativos validados: 404, 409, 403.
  - Documentacion: `docs/qa/PHASE2G2_PUBLISHED_PRODUCT_SMOKE_TEST.md`.
- Fase actual autorizada: Fase 2G.3A — Indicador de perfil online en Productos (Angular frontend).
- NOTA: `/productos/[slug]` ya fue implementada en 2F.3B y validada exitosamente en 2G.2. No requiere nueva implementacion.

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
| 2G.1 | Crear perfil online desde producto ERP/POS | Endpoint POST para crear perfil DRAFT desde producto existente. |
| 2G.2 | Smoke Test Real Producto Publicado → Storefront | Validacion end-to-end: producto → perfil publicado → Storefront 200 OK. |
| 2G.3A | Indicador de perfil online en Productos | Badge/columna en tabla Productos Angular que muestre estado del perfil online (NONE/DRAFT/PUBLISHED). |
| Posteriores | Intencion de compra, pedidos, pagos, delivery, Merchant Center y despliegue | Fases futuras separadas, aprobadas una por una. |

## Limites de aprobacion actuales

- Fase 2G.2 cerrada funcional y documentalmente.
- Fase 2G.3A autorizada para implementacion de indicador de perfil online en Productos.
- `/productos/[slug]` ya fue implementada en 2F.3B y validada exitosamente en 2G.2.
- No se autoriza en fase actual:
  - Checkout, carrito, pagos
  - Pedidos online
  - Delivery
  - Merchant Center
  - Stock reservado
  - AWS/staging
  - Login cliente, perfil cliente, panel publico

## Criterio de salida de Fase 2G.3A

- Indicador visual de estado de perfil online en tabla de Productos.
- Estados visibles: Sin perfil, DRAFT, PUBLISHED.
- Integracion con backend existente (sin nuevos endpoints si ya existe informacion disponible).
- Build frontend Angular exitoso.
- Sin cambios en Storefront Next.js.
- Sin checkout, carrito, pagos, pedidos, login, perfil.

## Siguiente paso esperado

Implementar Fase 2G.3A — Indicador de perfil online en Productos (Angular frontend).

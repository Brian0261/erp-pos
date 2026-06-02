# Estrategia Storefront SEO-First Draft

## Estado

Documento base actualizado en Fase 2D para alinear la estrategia SEO-first con la futura Storefront Next.js. No implementa Storefront, Next.js, `sitemap.xml` real ni codigo funcional.

## Objetivo

Definir la estrategia minima para que la futura tienda publica de InkToy nazca SEO-first, con URLs limpias, metadata controlada y contratos publicos seguros derivados del ERP/POS.

## Principios

- ERP/POS es la fuente de verdad.
- La API publica sera separada de la API administrativa.
- Next.js sera el futuro generador de paginas publicas SEO-first cuando Fase 2E o posterior lo autorice.
- Angular `frontend/` queda solo para ERP/POS interno.
- El frontend publico no calcula precio efectivo ni decide publicacion.
- Toda pagina indexable debe derivar de datos publicos validados server-side.

## Arquitectura URL draft

- Producto: `/productos/{slug}`
- Categoria publica: `/categorias/{slug}`
- Marca publica: `/marcas/{slug}` diferida para una fase posterior.
- No usar IDs internos en URLs publicas.
- Los filtros y facetas quedaran en query params y no seran canonicos ni indexables por defecto.

## Slugs

- Deben ser limpios, unicos y estables.
- Deben evitar mayusculas, tildes, caracteres especiales e IDs internos.
- La estrategia de historial/redireccion queda para fase posterior.
- Los slugs publicos se resuelven desde backend/API publica, no desde heuristicas del frontend.

## Title y meta description

- Toda pagina indexable debe tener `title` y `meta description`.
- La metadata debe venir del backend o de fallback aprobado en fase posterior.
- El frontend publico no debe inventar metadata critica sin respaldo contractual.

## Canonical

- Toda URL publica indexable debe tener canonical explicito.
- Canonical debe apuntar a la URL principal por slug.
- La Storefront futura debe usar `canonicalPath` del backend cuando este disponible en el contrato publico.
- Filtros, busquedas y paginacion no deben reemplazar la canonical principal sin una decision formal posterior.

## sitemap.xml

- Debe incluir solo URLs publicadas, canónicas e indexables.
- No debe incluir staging, filtros, facetas ni contenidos pobres.
- El `sitemap.xml` futuro sera generado por Next.js/Storefront usando `GET /api/v1/storefront/seo/sitemap` como fuente JSON backend.
- El endpoint backend es fuente JSON, no `sitemap.xml` real.
- Fase 2D no implementa `sitemap.xml` real.

## robots.txt

- Produccion futura: permitir rastreo de paginas publicas validas.
- Staging: no indexable por defecto.
- Rutas de administracion y privadas fuera del alcance publico.
- `robots.txt` futuro sera generado o controlado por la Storefront, sin usarse como mecanismo de seguridad.

## Index / Noindex

- `index` solo para paginas publicas con contenido minimo y aptas.
- `noindex` por defecto para:
  - filtros/facetas;
  - busquedas;
  - paginacion o combinaciones no aprobadas como landing SEO;
  - paginas pobres o incompletas;
  - staging;
  - contenidos experimentales o temporales.

## Rendering SEO futuro

- SSG/ISR sera la estrategia principal para paginas de producto y categoria.
- SSR queda diferido para casos realmente necesarios y no sera el default del catalogo publico.
- El HTML indexable debe generarse desde datos publicos de Storefront API.
- El catalogo publico no debe depender solo de renderizado cliente para SEO.

## Categorias publicas

- Deben ser landing pages indexables solo si tienen contenido suficiente.
- Deben usar slugs publicos y canonical claros.
- Deben enlazar a productos publicados relevantes.

## Paginas de producto

- Deben representar solo productos `PUBLISHED` y aptos para publicacion publica.
- Deben exponer nombre publico, slug, metadata, imagen principal valida y precio efectivo server-side.
- La politica inicial de productos agotados queda documentada como pendiente.

## Interlinking basico

- Producto -> categoria principal.
- Categoria -> productos publicados.
- Producto -> marca publica solo si la marca entra en el alcance del MVP.
- No sobrecargar el interlinking antes de definir arquitectura final del Storefront.

## Riesgos SEO a evitar

- staging indexado;
- filtros indexados sin control;
- paginas pobres o incompletas indexadas;
- contenido duplicado entre producto, variante, marca o categoria;
- metadata inventada por frontend;
- precio o stock calculado en cliente;
- exposicion de DTOs admin;
- URLs con IDs internos;
- canonical inconsistente;
- sitemap con URLs no publicables.

## Decisiones cerradas

- Base path publico draft: `/api/v1/storefront/...`.
- API publica inicial sera read-only.
- DTOs publicos separados de DTOs admin.
- `/api/v1/ecommerce-admin/...` no se expone como contrato publico.
- Next.js sera la futura Storefront publica SEO-first.
- `frontend/` Angular queda solo para ERP/POS interno.
- `storefront/` queda como ubicacion futura recomendada, sin crearse en Fase 2D.
- SSG/ISR sera la estrategia principal para productos y categorias.
- `sitemap.xml` futuro sera generado por Next.js usando JSON backend.
- Staging sera no indexable por defecto.

## Pendientes documentados

- Si marcas publicas entran en MVP inicial o fase posterior.
- Politica inicial de productos agotados.
- Schema.org avanzado.
- Merchant Center.
- Implementacion real de `sitemap.xml` (diferido a fase posterior).
- Implementacion real de `robots.txt` productivo (diferido a fase posterior).
- Paginas reales de producto y categoria (diferido a Fase 2F con aprobacion explicita).

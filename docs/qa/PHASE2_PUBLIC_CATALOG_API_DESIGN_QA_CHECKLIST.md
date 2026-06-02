# Checklist QA Fase 2C - Public Catalog API Implementation

## Estado

Checklist de validacion QA para Fase 2C (implementacion backend read-only). Fase 2B documental previa ya cerrada.

## Checklist de implementacion API

- [x] Namespace MVP definido como `/api/v1/storefront/catalog/...`.
- [x] Duplicidad con `/api/v1/storefront/products` evitada para el MVP.
- [x] Endpoints MVP read-only implementados y funcionales.
- [x] Endpoints diferidos documentados y no implementados.
- [x] Request params permitidos documentados.
- [x] Paginacion y maximos documentados.
- [x] Sorts permitidos iniciales documentados.
- [x] Filtros diferidos o condicionados documentados.

## Checklist de separacion admin/public

- [x] Se explicita que `/api/v1/ecommerce-admin/...` no es contrato publico.
- [x] Se explicita que DTOs publicos no reutilizan DTOs admin.
- [x] Se prohibe exponer entidades JPA o modelos internos directamente.
- [x] Se mantiene ERP/POS como fuente de verdad.
- [x] Fase 2C valida que admin API siga protegida tras abrir rutas publicas GET.

## Checklist de DTOs publicos

- [x] `PublicPageResponse<T>` definido e implementado.
- [x] `PublicProductListItemResponse` definido e implementado.
- [x] `PublicProductDetailResponse` definido e implementado.
- [x] `PublicCategoryResponse` definido e implementado.
- [x] `PublicBrandSummaryResponse` definido.
- [x] `PublicPriceResponse` definido e implementado.
- [x] `PublicAvailabilityResponse` definido e implementado.
- [x] `PublicImageResponse` definido e implementado.
- [x] `PublicSeoResponse` definido e implementado.
- [x] `PublicSitemapEntryResponse` definido e implementado.
- [x] `PublicSitemapResponse` definido e implementado.
- [x] `PublicErrorResponse` definido.
- [x] Matriz de campos prohibidos documentada y respetada en implementacion.

## Checklist SEO

- [x] Canonical obligatorio para paginas indexables documentado e implementado.
- [x] Robots/indexable documentado e implementado.
- [x] Sitemap JSON implementado como fuente futura (`GET /api/v1/storefront/seo/sitemap`).
- [x] Exclusion de staging documentada.
- [x] Exclusion de filtros/facetas del canonical por defecto documentada.
- [x] Categoria activa vacia como `indexable=false` documentada e implementada.
- [x] Producto agotado publicado como pagina posible pero no comprable documentado.

## Checklist de errores publicos

- [x] `400 PUBLIC_INVALID_REQUEST` documentado.
- [x] `404 PUBLIC_RESOURCE_NOT_FOUND` documentado e implementado.
- [x] Producto no publicado como 404 seguro documentado e implementado.
- [x] Slug inexistente como 404 seguro documentado e implementado.
- [x] Categoria inactiva o inexistente como 404 seguro documentada e implementada.
- [x] `500 PUBLIC_INTERNAL_ERROR` generico documentado.
- [x] Prohibicion de stack trace, SQL y clases internas documentada.

## Checklist de seguridad

- [x] Solo GET publico para MVP documentado e implementado.
- [x] Sin credenciales ni sesiones publicas para endpoints MVP documentado e implementado.
- [x] No exponer costos, margenes, proveedores ni stock exacto documentado e implementado.
- [x] No exponer IDs internos innecesarios documentado e implementado.
- [x] Rate limiting y CORS restrictivo marcados como requisitos de implementacion futura.
- [x] `SecurityConfig` modificado solo para abrir rutas GET publicas, admin protegido.
- [x] `GlobalExceptionHandler` no modificado con mensajes internos expuestos.

## Checklist de tests focalizados

- [x] `StorefrontPublicProductsIntegrationTest` — listado y detalle de productos publicos.
- [x] `StorefrontPublicCategoriesIntegrationTest` — listado y detalle de categorias publicas.
- [x] `StorefrontPublicSitemapIntegrationTest` — inclusion/exclusion y seguridad sitemap.
- [x] `AuthRbacCorsIntegrationTest` — baseline seguridad y RBAC.
- [x] `SecurityConfigTest` — configuracion de seguridad.
- [x] Resultado: 52 tests, 0 failures, BUILD SUCCESS.

## Criterios de salida Fase 2C

- [x] Endpoints MVP implementados y funcionales.
- [x] DTOs publicos implementados y separados de admin.
- [x] Campos prohibidos no expuestos en respuestas.
- [x] Reglas 404/200/400 implementadas.
- [x] Sitemap JSON implementado (no sitemap.xml real).
- [x] Decisiones de sitemap, marcas, agotados y categorias vacias respetadas.
- [x] Arquitectura hexagonal estricta mantenida.
- [x] Tests focalizados verdes (52/52, BUILD SUCCESS).
- [x] Commits pusheados a master.
- [x] No se toco frontend Angular, Flyway/DB, Docker, `.env`, secretos, dependencias, POS/ventas/caja/facturacion/inventario.

## Pendientes y deuda QA

- [ ] Full `mvn test` no limpio por deuda preexistente:
  - `ProductCleanupPreviewIntegrationTest.shouldBlockExecuteWhenElectronicDocumentExistsAndKeepDataUnchanged`
  - `DuplicateKey` en `billing_series / uq_billing_series_doc_type_environment_active`
  - Pendiente prioritaria antes de avanzar a fases mayores.
- [ ] Filtros `categorySlug` diferidos a fase posterior.
- [ ] Marcas publicas diferidas a fase posterior.
- [ ] `sitemap.xml` real diferido a fase posterior (solo existe fuente JSON).
- [ ] Next.js/Storefront publica diferidos a fase posterior.
- [ ] Checkout/pagos/pedidos/stock reservado diferidos a fases posteriores.

## Fuera de alcance confirmado

- [x] No se implemento sitemap.xml real.
- [x] No se implemento Next.js ni Storefront publica.
- [x] No se implementaron filtros categorySlug.
- [x] No se implementaron marcas publicas.
- [x] No se implemento checkout, pagos, delivery, Merchant Center, pedidos online ni stock reservado.
- [x] No se toco frontend Angular, Flyway/DB, Docker, `.env`, secretos, dependencias.
- [x] No se toco POS, ventas, caja, facturacion ni inventario.

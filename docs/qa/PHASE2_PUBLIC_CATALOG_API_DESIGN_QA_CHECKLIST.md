# Checklist QA Fase 2B - Public Catalog API Design

## Estado

Checklist documental para Fase 2B. No valida codigo funcional, endpoints reales ni runtime.

## Checklist de diseno API

- [x] Namespace MVP definido como `/api/v1/storefront/catalog/...`.
- [x] Duplicidad con `/api/v1/storefront/products` evitada para el MVP.
- [x] Endpoints MVP read-only documentados.
- [x] Endpoints diferidos documentados.
- [x] Request params permitidos documentados.
- [x] Paginacion y maximos documentados.
- [x] Sorts permitidos iniciales documentados.
- [x] Filtros diferidos o condicionados documentados.

## Checklist de separacion admin/public

- [x] Se explicita que `/api/v1/ecommerce-admin/...` no es contrato publico.
- [x] Se explicita que DTOs publicos no reutilizan DTOs admin.
- [x] Se prohibe exponer entidades JPA o modelos internos directamente.
- [x] Se mantiene ERP/POS como fuente de verdad.
- [ ] Fase 2C valida que admin API siga protegida tras abrir rutas publicas GET.

## Checklist de DTOs publicos

- [x] `PublicPageResponse<T>` definido.
- [x] `PublicProductListItemResponse` definido.
- [x] `PublicProductDetailResponse` definido.
- [x] `PublicCategoryResponse` definido.
- [x] `PublicBrandSummaryResponse` definido.
- [x] `PublicPriceResponse` definido.
- [x] `PublicAvailabilityResponse` definido.
- [x] `PublicImageResponse` definido.
- [x] `PublicSeoResponse` definido.
- [x] `PublicSitemapEntryResponse` definido.
- [x] `PublicErrorResponse` definido.
- [x] Matriz de campos prohibidos documentada.

## Checklist SEO

- [x] Canonical obligatorio para paginas indexables documentado.
- [x] Robots/indexable documentado.
- [x] Sitemap JSON como fuente futura documentado.
- [x] Exclusion de staging documentada.
- [x] Exclusion de filtros/facetas del canonical por defecto documentada.
- [x] Categoria activa vacia como `indexable=false` documentada.
- [x] Producto agotado publicado como pagina posible pero no comprable documentado.

## Checklist de errores publicos

- [x] `400 PUBLIC_INVALID_REQUEST` documentado.
- [x] `404 PUBLIC_RESOURCE_NOT_FOUND` documentado.
- [x] Producto no publicado como 404 seguro documentado.
- [x] Slug inexistente como 404 seguro documentado.
- [x] Categoria inactiva o inexistente como 404 seguro documentado.
- [x] `500 PUBLIC_INTERNAL_ERROR` generico documentado.
- [x] Prohibicion de stack trace, SQL y clases internas documentada.

## Checklist de seguridad

- [x] Solo GET publico para MVP documentado.
- [x] Sin credenciales ni sesiones publicas para endpoints MVP documentado.
- [x] No exponer costos, margenes, proveedores ni stock exacto documentado.
- [x] No exponer IDs internos innecesarios documentado.
- [x] Rate limiting y CORS restrictivo marcados como requisitos de implementacion futura.
- [x] No modificar `SecurityConfig` en Fase 2B.
- [x] No modificar `GlobalExceptionHandler` en Fase 2B.

## Checklist de preparacion para Fase 2C

- [x] Contrato MVP listo para implementacion backend read-only.
- [x] DTOs publicos candidatos listos para convertir a Java en Fase 2C.
- [x] Casos 200/400/404/500 documentados.
- [x] Riesgos de N+1, error handler y apertura de rutas publicas documentados.
- [ ] Fase 2C debe definir tests de controller/use case antes de implementar.
- [ ] Fase 2C debe validar seguridad de rutas publicas GET y admin protegida.
- [ ] Fase 2C debe validar que no se exponen campos prohibidos.

## Criterios de salida Fase 2B

- [x] Endpoints MVP definidos.
- [x] DTOs publicos definidos.
- [x] Campos prohibidos documentados.
- [x] Reglas 404/200/400 documentadas.
- [x] Decisiones de sitemap, marcas, agotados y categorias vacias cerradas.
- [x] No codigo funcional tocado durante la documentacion.
- [x] Fase 2C queda lista para planificacion de implementacion backend read-only.

## Fuera de alcance confirmado

- [x] No controllers publicos.
- [x] No DTOs Java reales.
- [x] No use cases, ports, repositories ni adapters.
- [x] No Flyway/DB.
- [x] No endpoints reales.
- [x] No Next.js ni Storefront publica.
- [x] No checkout, Mercado Pago, delivery, Merchant Center, pedidos online ni stock reservado.

# Contratos preliminares ecommerce — InkToy

## Estado

Aprobado para cierre formal de Fase 0 documental ecommerce.

## Objetivo

Definir los contratos preliminares necesarios para iniciar la implementación futura de la tienda online SEO-first de InkToy sin improvisar modelos, DTOs, endpoints, reglas de negocio, validaciones, estados, errores ni responsabilidades entre frontend, backend, ERP/POS, Storefront API, Angular interno y Next.js.

Este documento convierte las decisiones aprobadas en los ECOM-ADR-001 al ECOM-ADR-019 en una guía contractual inicial para fases posteriores de implementación. Los ADR explican qué se decidió y por qué; este documento define qué contratos mínimos deben respetarse antes de escribir código funcional.

## Alcance

Este documento cubre contratos preliminares para Storefront API, catálogo online, categorías online, marcas, variantes, imágenes/assets, SEO metadata, almacén online, stock reservado, pedidos online, clientes online y datos personales, Mercado Pago, facturación automática, delivery nacional, UBIGEO, couriers, Merchant Center, SEO técnico y auditoría ecommerce transversal.

Este documento no implementa código, no crea endpoints reales, no define migraciones finales, no modifica DB/Flyway, no cambia infraestructura y no activa venta online.

## ADRs relacionados

- ECOM-ADR-001: Arquitectura ecommerce SEO-first.
- ECOM-ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ECOM-ADR-003: Catálogo online y publicación de productos.
- ECOM-ADR-004: Marcas.
- ECOM-ADR-005: Variantes de producto.
- ECOM-ADR-006: Slugs y URLs SEO.
- ECOM-ADR-007: Imágenes y assets de producto.
- ECOM-ADR-008: SEO metadata.
- ECOM-ADR-009: Almacén online configurable, stock disponible online y stock reservado.
- ECOM-ADR-010: Stock reservado, concurrencia y estrategia anti-sobreventa.
- ECOM-ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ECOM-ADR-012: Pedidos online y lifecycle ecommerce.
- ECOM-ADR-013: Mercado Pago, webhook e idempotencia.
- ECOM-ADR-014: Facturación automática ecommerce.
- ECOM-ADR-015: Delivery nacional y couriers.
- ECOM-ADR-016: Seguridad ecommerce y protección de APIs públicas.
- ECOM-ADR-017: Storefront API pública/controlada.
- ECOM-ADR-018: Administración ecommerce en Angular interno.
- ECOM-ADR-019: Merchant Center y SEO técnico avanzado.

---

# 1. Reglas globales

1. ERP/POS Spring Boot será la fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
2. La tienda pública será Next.js SEO-first en `inktoy.pe`.
3. Angular interno será la consola administrativa ecommerce en `app.inktoy.pe`.
4. Storefront API será la única capa pública/controlada para ecommerce en `api.inktoy.pe`.
5. Storefront API se implementará inicialmente como módulo dentro del monolito modular Spring Boot, diseñado como extraction-ready.
6. No se expondrán endpoints internos del ERP/POS como API pública.
7. No se reutilizarán DTOs administrativos como DTOs públicos.
8. No se expondrán entidades JPA, entidades internas ni modelos de dominio directamente por APIs públicas.
9. El frontend público nunca decidirá precio, stock, descuento, total, envío, pago, facturación ni estado final del pedido.
10. Toda validación crítica debe ejecutarse server-side.
11. Toda operación crítica debe ser auditable.
12. Toda operación crítica relacionada con pagos, reservas, ventas, facturación o webhooks debe ser idempotente cuando corresponda.
13. No se duplicará catálogo, precio ni stock fuera del ERP/POS.
14. No se implementará checkout, Mercado Pago, facturación automática ni delivery real antes de tener catálogo online, stock, precios y contratos base correctamente definidos.
15. No se generará deuda técnica por avanzar rápido.
16. La implementación futura deberá respetar arquitectura hexagonal estricta.
17. Todo cambio de fase debe actualizar documentación y checklist QA correspondiente.
18. Los estados críticos no se cambian de forma directa desde controladores ni desde frontend; deben cambiar mediante casos de uso autorizados.
19. Todo contrato implementado debe tener manejo de errores consistente, seguro y validado.
20. Todo contrato implementado debe tener pruebas y checklist QA de fase.

---

# 2. Convenciones generales

## 2.1 Versionado conceptual de API

La Storefront API pública deberá versionarse desde el inicio.

Ruta conceptual recomendada:

```text
/api/v1/storefront/...
```

Los endpoints administrativos internos no deberán compartir el namespace público de Storefront API.

## 2.2 Separación de DTOs

Debe existir separación conceptual entre:

- DTOs públicos para Storefront API.
- DTOs administrativos para Angular interno.
- DTOs internos de aplicación.
- Entidades de dominio.
- Entidades de persistencia.

Regla obligatoria:

> Ningún DTO administrativo, entidad JPA o entidad interna de dominio debe exponerse directamente a la tienda pública.

## 2.3 Arquitectura hexagonal obligatoria

Toda implementación futura deberá respetar separación estricta de capas:

| Capa | Responsabilidad | Prohibiciones |
|---|---|---|
| Dominio | Reglas de negocio, entidades de dominio, value objects, invariantes | No depender de Spring MVC, JPA, controladores, DTOs HTTP, frameworks web ni infraestructura. |
| Aplicación | Casos de uso, puertos, orquestación, transacciones de aplicación | No contener detalles de HTTP, SQL específico ni decisiones visuales. |
| Adaptadores de entrada | REST controllers, handlers, mappers de request/response | No contener lógica de negocio crítica. |
| Adaptadores de salida | Persistencia, proveedores externos, Mercado Pago, courier, archivos, email | No filtrar reglas de negocio al dominio. |
| Infraestructura | Configuración, seguridad, persistencia, integraciones | No contaminar dominio ni aplicación con detalles técnicos innecesarios. |

Reglas obligatorias:

- Los controladores no calculan precio, stock, envío ni estados finales.
- Los servicios de aplicación/casos de uso ejecutan validaciones críticas.
- Los repositorios concretos pertenecen a infraestructura/adaptadores.
- Los puertos definen dependencias desde aplicación hacia afuera.
- Los mappers separan DTOs de modelos internos.
- No se permite lógica crítica duplicada entre backend y frontend.
- No se permite que Angular o Next.js repliquen reglas server-side como fuente de verdad.

## 2.4 Errores públicos y administrativos

Storefront API debe devolver errores seguros, sin stack traces, nombres de clases, SQL, secretos ni detalles internos.

| HTTP | Uso |
|---|---|
| 400 | Request inválido o datos incompletos. |
| 401 | Autenticación requerida. |
| 403 | Acceso denegado. |
| 404 | Recurso público no encontrado o no publicado. |
| 409 | Conflicto de negocio: stock insuficiente, precio cambió, checkout inválido. |
| 422 | Datos válidos sintácticamente, pero no procesables por reglas de negocio. |
| 429 | Rate limit excedido. |
| 500 | Error inesperado con mensaje genérico. |

Formato conceptual de error público:

```json
{
  "code": "BUSINESS_ERROR_CODE",
  "message": "Mensaje seguro y entendible",
  "details": [],
  "traceId": "opcional"
}
```

## 2.5 Auditoría

Deben auditarse como mínimo:

- publicación/despublicación de productos;
- cambios de precio online;
- cambios de almacén online;
- cambios de stock reservado;
- cambios de cobertura/tarifas;
- cambios de metadata SEO crítica;
- cambios de slug público;
- creación/cancelación de pedidos online;
- procesamiento de pagos;
- procesamiento de webhooks;
- conversión pedido → venta;
- emisión/reintento de comprobante;
- asignación de courier/tracking;
- resolución de incidencias.

## 2.6 Idempotencia

Debe considerarse idempotencia en creación de pedido, creación de reserva, creación de preferencia Mercado Pago, procesamiento de webhook, confirmación de pago, confirmación/liberación de reserva, conversión pedido → venta, emisión de comprobante, reintentos de facturación y conciliación de pagos.

## 2.7 Seguridad mínima

Toda fase futura deberá cumplir autenticación/autorización por rol, CORS restrictivo, validación server-side, rate limiting donde aplique, logging seguro, protección de datos personales, no exposición de errores técnicos, protección contra IDOR, separación entre endpoints públicos y administrativos, y separación de secretos por entorno.

## 2.8 Estados y transiciones controladas

Los estados de producto, publicación, reserva, pedido, pago, facturación y delivery no deben modificarse libremente.

Reglas:

1. Toda transición crítica debe pasar por un caso de uso.
2. Toda transición debe validar el estado actual.
3. Toda transición debe validar permisos.
4. Toda transición debe auditarse si afecta operación real.
5. Toda transición idempotente debe ignorar duplicados de forma segura.
6. No se permiten saltos de estado no definidos.
7. No se permite que frontend decida el estado final.
8. Las pantallas Angular solo solicitan acciones; el backend decide si la transición es válida.
9. Storefront API solo expone estados públicos seguros.
10. Estados internos sensibles no deben exponerse innecesariamente al cliente.

---

# 3. Contratos preliminares

## 3.1 Storefront API

### Propósito

Definir la frontera pública/controlada que consumirá la tienda Next.js sin exponer endpoints internos del ERP/POS.

### Alcance

Storefront API expondrá catálogo público, productos publicados, categorías online, marcas públicas, slugs, metadata SEO, imágenes públicas, disponibilidad pública, precio online efectivo, validación de carrito, ubicación, cálculo de envío, creación futura de pedido, inicio futuro de pago, consulta segura de estado de pedido y Merchant Center futuro.

### Datos mínimos

DTOs públicos conceptuales:

- `PublicProductListItem`.
- `PublicProductDetail`.
- `PublicVariant`.
- `PublicBrand`.
- `PublicCategory`.
- `PublicSeoMetadata`.
- `PublicImageAsset`.
- `PublicAvailability`.
- `PublicPrice`.
- `CartValidationRequest`.
- `CartValidationResponse`.
- `ShippingQuoteRequest`.
- `ShippingQuoteResponse`.
- `PublicOrderStatus`.
- `PublicErrorResponse`.

### Endpoints conceptuales

```text
GET /api/v1/storefront/products
GET /api/v1/storefront/products/{slug}
GET /api/v1/storefront/categories
GET /api/v1/storefront/categories/{slug}
GET /api/v1/storefront/brands
GET /api/v1/storefront/brands/{slug}
GET /api/v1/storefront/sitemap
GET /api/v1/storefront/locations/departments
GET /api/v1/storefront/locations/provinces?departmentId={id}
GET /api/v1/storefront/locations/districts?provinceId={id}
POST /api/v1/storefront/shipping/validate-address
POST /api/v1/storefront/shipping/quote
POST /api/v1/storefront/cart/validate
POST /api/v1/storefront/orders
POST /api/v1/storefront/payments/mercado-pago/preference
GET /api/v1/storefront/orders/{publicOrderNumber}/status?token={token}
GET /api/v1/storefront/orders/{publicOrderNumber}/shipping?token={token}
GET /api/v1/storefront/merchant-center/feed
```

### Validaciones server-side

Producto publicado y activo, slug público, precio efectivo calculado en backend, disponibilidad calculada en backend, envío calculado en backend, carrito revalidado antes de pedido, no aceptar totales/stock/precio del frontend.

### Errores esperados

`PRODUCT_NOT_FOUND`, `PRODUCT_NOT_PUBLISHED`, `CATEGORY_NOT_FOUND`, `BRAND_NOT_FOUND`, `INVALID_SLUG`, `INVALID_CART`, `PRICE_CHANGED`, `OUT_OF_STOCK`, `ZONE_NOT_COVERED`, `SHIPPING_QUOTE_REQUIRED`, `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED_ORDER_ACCESS`.

### Seguridad

CORS restrictivo, rate limiting, DTOs públicos, no exponer IDs internos sensibles, no exponer stock operativo exacto si no es necesario, no exponer costos/márgenes/reglas internas completas, consultas de pedidos/tracking/comprobantes protegidas por token seguro, sesión o mecanismo equivalente, logging seguro.

### Auditoría

Auditar validación de carrito con cambios críticos, creación futura de pedido, inicio futuro de pago, consulta de pedido si aplica a seguridad, errores repetidos o abuso.

### Relación con ADRs

ECOM-ADR-001, ECOM-ADR-002, ECOM-ADR-016, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No crear endpoints reales todavía, no crear BFF separado, no implementar checkout, no implementar Mercado Pago, no implementar Merchant Center real, no abrir API pública en producción, no tocar CORS real todavía.

---

## 3.2 Catálogo online

### Propósito

Definir cómo un producto interno del ERP/POS se convierte en producto publicable para tienda online.

### Alcance

Producto interno, producto publicado online, campos online, validaciones de publicación, visibilidad, relación con marca, categoría, variantes, imágenes, SEO, precios y stock.

### Datos mínimos

`productId`, `publishedOnline`, `visibilityStatus`, `onlineName`, `onlineDescription`, `slug`, `brandId`, `onlineCategoryId`, `mainImage`, `gallery`, `seoMetadata`, `onlinePriceOverride`, `attributes`, `featured`, `createdAt`, `updatedAt`.

### Estados sugeridos

`DRAFT`, `READY_FOR_REVIEW`, `PUBLISHED`, `UNPUBLISHED`, `BLOCKED`, `INCOMPLETE`.

### Validaciones server-side

No publicar si está inactivo, no tiene SKU, no tiene slug único, no tiene categoría online, no tiene imagen principal, no tiene precio válido, no tiene metadata mínima, no cumple reglas de marca, no cumple reglas de variante si aplica o está marcado como interno/no publicable.

### Errores esperados

`PRODUCT_INACTIVE`, `SKU_REQUIRED`, `SLUG_REQUIRED`, `SLUG_DUPLICATED`, `ONLINE_CATEGORY_REQUIRED`, `MAIN_IMAGE_REQUIRED`, `SEO_METADATA_INCOMPLETE`, `PRICE_INVALID`, `PRODUCT_NOT_ELIGIBLE_FOR_ONLINE`, `BRAND_INACTIVE`, `VARIANT_CONFIGURATION_INVALID`.

### Seguridad

Solo roles autorizados pueden publicar/despublicar. Angular interno consume endpoints administrativos protegidos. Storefront API solo expone productos publicados. No exponer productos internos o no publicados.

### Auditoría

Auditar publicación, despublicación, cambio de slug, cambio de metadata, cambio de precio online, cambio de imagen principal, cambio de categoría y cambio de marca.

### Relación con ADRs

ECOM-ADR-003, ECOM-ADR-004, ECOM-ADR-005, ECOM-ADR-006, ECOM-ADR-007, ECOM-ADR-008, ECOM-ADR-011, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No crear migraciones, no crear UI final, no publicar productos reales, no conectar Next.js, no generar sitemap/feed real.

---

## 3.3 Categorías online

### Propósito

Definir categorías públicas de ecommerce como estructura de navegación, SEO, breadcrumbs, sitemap, filtros, Merchant Center y organización del catálogo online.

### Alcance

Categorías públicas, jerarquía de categorías, relación con productos publicados, slugs, metadata SEO, breadcrumbs, sitemap, Storefront API y Merchant Center.

### Datos mínimos

`id`, `name`, `slug`, `parentCategoryId`, `description`, `seoTitle`, `seoDescription`, `canonicalUrl`, `robotsPolicy`, `active`, `publishedOnline`, `sortOrder`, `createdAt`, `updatedAt`.

### Estados sugeridos

`ACTIVE`, `INACTIVE`, `PUBLISHED`, `NOT_PUBLISHED`, `NOINDEX`, `INCOMPLETE`.

### Validaciones server-side

No publicar categoría sin slug único, no indexar categoría vacía salvo estrategia aprobada, no publicar categoría sin metadata mínima, no permitir ciclos en jerarquía, no exponer categorías internas, no permitir productos publicados en categorías inactivas, no incluir en sitemap categorías no indexables, no permitir categorías duplicadas por nombre normalizado dentro del mismo nivel jerárquico.

### Errores esperados

`CATEGORY_NOT_FOUND`, `CATEGORY_SLUG_DUPLICATED`, `CATEGORY_EMPTY_NOT_INDEXABLE`, `CATEGORY_METADATA_REQUIRED`, `CATEGORY_HIERARCHY_INVALID`, `CATEGORY_INACTIVE`, `CATEGORY_NOT_PUBLISHED`, `CATEGORY_NAME_DUPLICATED`.

### Seguridad

Storefront API solo expone categorías públicas. Angular interno administra categorías mediante endpoints internos protegidos. No exponer categorías internas, inactivas o técnicas. Cambios de slug/canonical requieren permisos y auditoría.

### Auditoría

Auditar creación/edición, publicación/despublicación, cambio de slug, cambio de jerarquía, cambio de metadata SEO y cambio de estado index/noindex.

### Relación con ADRs

ECOM-ADR-003, ECOM-ADR-006, ECOM-ADR-008, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No definir árbol final completo de categorías, no crear migraciones todavía, no crear UI final, no crear sitemap real, no indexar categorías reales todavía, no crear páginas públicas en Next.js todavía.

---

## 3.4 Marcas

### Propósito

Definir la entidad formal de marca para catálogo online, filtros, SEO, Merchant Center y operación interna.

### Alcance

Marcas internas, marcas públicas, metadata SEO de marca, slug de marca, logo futuro, relación con productos y variantes.

### Datos mínimos

`id`, `name`, `normalizedName`, `slug`, `description`, `seoTitle`, `seoDescription`, `logoUrl`, `active`, `publishedOnline`, `createdAt`, `updatedAt`.

### Estados sugeridos

`ACTIVE`, `INACTIVE`, `PUBLISHED`, `NOT_PUBLISHED`.

### Validaciones server-side

No permitir nombre duplicado normalizado, slug único obligatorio para marcas publicables, no publicar marca sin contenido mínimo, no asociar productos online a marca inactiva, producto con marca reconocible debe asociarse a entidad formal, producto sin marca solo permitido por regla explícita.

### Errores esperados

`BRAND_NAME_DUPLICATED`, `BRAND_SLUG_DUPLICATED`, `BRAND_NOT_FOUND`, `BRAND_INACTIVE`, `BRAND_CONTENT_REQUIRED`, `BRAND_REQUIRED_FOR_PRODUCT`.

### Seguridad

Edición solo para roles autorizados. Storefront API solo expone marcas públicas. No exponer marcas internas inactivas.

### Auditoría

Auditar creación, edición, activación/desactivación, publicación/despublicación, cambio de slug y cambio de metadata.

### Relación con ADRs

ECOM-ADR-004, ECOM-ADR-006, ECOM-ADR-008, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No crear migraciones, no crear UI final, no poblar catálogo completo, no crear páginas públicas de marca todavía.

---

## 3.5 Variantes

### Propósito

Definir cómo se representan productos con diferencias vendibles relevantes, como color, tamaño, presentación, medida o diseño.

### Alcance

Producto padre, variante vendible, SKU por variante, barcode opcional, stock por variante, precio por variante, imagen por variante, relación con Merchant Center.

### Datos mínimos

`id`, `parentProductId`, `sku`, `barcode`, `displayName`, `attributes`, `active`, `publishedOnline`, `onlinePriceOverride`, `mainImage`, `sortOrder`, `createdAt`, `updatedAt`.

### Estados sugeridos

`ACTIVE`, `INACTIVE`, `PUBLISHED`, `NOT_PUBLISHED`, `OUT_OF_STOCK`, `NOT_PURCHASABLE`.

### Validaciones server-side

SKU obligatorio, SKU único, barcode único si existe, no permitir compra de variante inactiva, no permitir compra sin stock disponible online, stock controlado por variante vendible, no duplicar producto padre por color/tamaño si corresponde a variantes, no crear variante si no aporta valor operativo.

### Errores esperados

`VARIANT_SKU_REQUIRED`, `VARIANT_SKU_DUPLICATED`, `VARIANT_BARCODE_DUPLICATED`, `VARIANT_NOT_FOUND`, `VARIANT_INACTIVE`, `VARIANT_OUT_OF_STOCK`, `VARIANT_CONFIGURATION_INVALID`.

### Seguridad

Solo roles autorizados editan variantes. Storefront API expone solo variantes públicas. No exponer datos internos de inventario.

### Auditoría

Auditar creación/edición de variante, cambio de SKU, cambio de barcode, cambio de precio, cambio de imagen y activación/desactivación.

### Relación con ADRs

ECOM-ADR-005, ECOM-ADR-009, ECOM-ADR-010, ECOM-ADR-011, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No migrar productos actuales sin análisis, no crear UI final, no cambiar POS todavía, no generar feed real con variantes.

---

## 3.6 Imágenes/assets

### Propósito

Definir cómo se administran imágenes públicas de productos, variantes y marcas para ecommerce, SEO, Core Web Vitals y Merchant Center.

### Alcance

Imagen principal, galería, imagen por variante, logo de marca, alt text, fuente, derechos de uso, metadatos técnicos, exposición pública.

### Datos mínimos

`id`, `productId`, `parentProductId`, `variantId`, `brandId`, `assetType`, `url`, `storageKey`, `altText`, `source`, `rightsConfirmed`, `mimeType`, `width`, `height`, `sizeBytes`, `sortOrder`, `active`, `createdAt`, `updatedAt`.

### Estados sugeridos

`ACTIVE`, `INACTIVE`, `PENDING_REVIEW`, `REJECTED`.

### Validaciones server-side

Producto online requiere imagen principal, imagen pública requiere alt text, imagen pública requiere derechos confirmados, no exponer assets inactivos, validar tipo de archivo, preparar validación de peso/dimensiones, variante puede tener imagen propia si cambia visualmente.

### Errores esperados

`MAIN_IMAGE_REQUIRED`, `ALT_TEXT_REQUIRED`, `IMAGE_RIGHTS_NOT_CONFIRMED`, `ASSET_NOT_FOUND`, `ASSET_INACTIVE`, `INVALID_IMAGE_FORMAT`, `IMAGE_TOO_LARGE`.

### Seguridad

No exponer storage interno sensible si no es necesario, no aceptar URLs externas sin validación futura, no mostrar assets internos, validar permisos de edición.

### Auditoría

Auditar asignación de imagen principal, cambio de imagen principal, confirmación de derechos, cambio de alt text y activación/desactivación.

### Relación con ADRs

ECOM-ADR-007, ECOM-ADR-008, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No elegir CDN definitivo, no implementar carga real de imágenes, no transformar imágenes todavía, no modificar imágenes actuales.

---

## 3.7 SEO metadata

### Propósito

Definir metadata SEO para páginas públicas indexables de productos, categorías, marcas, futuras listas escolares y guías.

### Alcance

Title, meta description, canonical, robots policy, Open Graph, structured data flags, revisión humana, relación con sitemap y Merchant Center.

### Datos mínimos

`id`, `entityType`, `entityId`, `seoTitle`, `seoDescription`, `canonicalUrl`, `robotsPolicy`, `ogTitle`, `ogDescription`, `ogImage`, `schemaType`, `structuredDataEnabled`, `lastReviewedAt`, `reviewedBy`, `active`, `createdAt`, `updatedAt`.

### Estados sugeridos

`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `NEEDS_CHANGES`, `NOINDEX`.

### Validaciones server-side

Página indexable requiere title único, description útil y canonical. No indexar página pobre, filtros/facetas por defecto ni staging. No publicar metadata generada por IA sin revisión humana. No permitir canonical hacia entidad incorrecta.

### Errores esperados

`SEO_TITLE_REQUIRED`, `SEO_TITLE_DUPLICATED`, `SEO_DESCRIPTION_REQUIRED`, `CANONICAL_REQUIRED`, `ROBOTS_POLICY_INVALID`, `SEO_REVIEW_REQUIRED`, `PAGE_NOT_INDEXABLE`.

### Seguridad

Solo roles autorizados editan metadata. No exponer notas internas de revisión por Storefront API. No permitir manipulación pública de metadata.

### Auditoría

Auditar cambio de title, description, canonical, robots policy y aprobación de revisión humana.

### Relación con ADRs

ECOM-ADR-006, ECOM-ADR-008, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No implementar UI SEO final, no generar sitemap real, no activar indexación real, no crear páginas públicas todavía.

---

## 3.8 Almacén online

### Propósito

Definir cómo se configura el almacén que alimentará stock online.

### Alcance

Almacén online configurable, almacén compartido inicialmente con POS, reglas de cambio, historial, permisos e impacto en stock disponible online.

### Datos mínimos

`onlineWarehouseId`, `warehouseName`, `active`, `effectiveFrom`, `changedBy`, `changeReason`, `createdAt`, `updatedAt`.

### Estados sugeridos

`ACTIVE`, `INACTIVE`, `PENDING_CHANGE`, `BLOCKED_BY_ACTIVE_ORDERS`.

### Validaciones server-side

Almacén debe existir y estar activo. No cambiar almacén online si hay pedidos/reservas activas sin política definida. Cambio requiere rol autorizado, auditoría y validación de impacto antes de confirmar.

### Errores esperados

`WAREHOUSE_NOT_FOUND`, `WAREHOUSE_INACTIVE`, `ONLINE_WAREHOUSE_CHANGE_BLOCKED`, `ACTIVE_RESERVATIONS_EXIST`, `UNAUTHORIZED_WAREHOUSE_CHANGE`.

### Seguridad

Solo ADMIN/SUPERVISOR o rol autorizado. Confirmación obligatoria. No exponer configuración interna completa por Storefront API.

### Auditoría

Auditar almacén anterior, almacén nuevo, usuario, motivo, fecha/hora y resultado.

### Relación con ADRs

ADR-009, ADR-010, ADR-018.

### Qué NO implementar todavía

No crear pantalla final, no modificar inventario actual, no activar venta online, no cambiar almacén real.

---

## 3.9 Stock reservado

### Propósito

Definir el contrato base para reservas de stock online y prevención de sobreventa.

### Alcance

Reserva por pedido online, TTL, estados, concurrencia, idempotencia, relación con POS y relación con Mercado Pago.

### Datos mínimos

`reservationId`, `onlineOrderId`, `reservationStatus`, `expiresAt`, `createdAt`, `updatedAt`, `items`, `idempotencyKey`, `warehouseId`.

Item conceptual: `productId`, `variantId`, `sku`, `quantity`, `reservedQuantity`.

### Estados sugeridos

`PENDING_PAYMENT`, `CONFIRMED`, `RELEASED`, `EXPIRED`, `CANCELLED`, `FAILED`, `STOCK_EXCEPTION`.

### Validaciones server-side

No reservar más de lo disponible, no permitir stock reservado negativo, no confirmar reserva expirada sin revalidar, no liberar reserva ya liberada, no confirmar reserva ya confirmada, operaciones críticas transaccionales, validar concurrencia.

Fórmula base:

```text
stockDisponibleOnline = stockFisicoAlmacenOnline - stockReservadoOnline - stockSeguridad
```

### Errores esperados

`INSUFFICIENT_STOCK`, `RESERVATION_NOT_FOUND`, `RESERVATION_EXPIRED`, `RESERVATION_ALREADY_CONFIRMED`, `RESERVATION_ALREADY_RELEASED`, `STOCK_CONCURRENCY_CONFLICT`, `STOCK_EXCEPTION`.

### Seguridad

Frontend no decide stock. Storefront API solo expone disponibilidad pública. No exponer stock exacto operativo si no es necesario.

### Auditoría

Auditar creación, confirmación, liberación, expiración, incidencia, reintentos e idempotency key.

### Relación con ADRs

ADR-009, ADR-010, ADR-012, ADR-013, ADR-016.

### Qué NO implementar todavía

No implementar reservas reales, no modificar POS, no modificar inventario, no implementar checkout, no implementar Mercado Pago.

---

## 3.10 Pedidos online

### Propósito

Definir el contrato base del pedido online como entidad central del ecommerce.

### Alcance

Pedido online, items, cliente, dirección, snapshot de precios, snapshot de envío, reserva, pago, delivery, venta, comprobante y lifecycle.

### Datos mínimos

`onlineOrderId`, `publicOrderNumber`, `orderStatus`, `customerSnapshot`, `shippingAddressSnapshot`, `items`, `priceSnapshot`, `shippingCostSnapshot`, `paymentReference`, `stockReservationReference`, `deliveryReference`, `saleReference`, `electronicDocumentReference`, `createdAt`, `updatedAt`.

Item conceptual: `productId`, `variantId`, `sku`, `nameSnapshot`, `unitPriceSnapshot`, `quantity`, `subtotal`.

### Estados sugeridos

`PENDING_PAYMENT`, `PAYMENT_PROCESSING`, `PAID`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `STOCK_RESERVED`, `STOCK_EXCEPTION`, `READY_TO_PREPARE`, `PREPARING`, `READY_TO_SHIP`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `CONVERTED_TO_SALE`.

### Validaciones server-side

No crear pedido sin carrito validado, precio calculado por backend y stock disponible/reserva válida. No convertir a venta sin pago aprobado y reserva confirmada. No facturar pedido con incidencia. No duplicar pedido, venta ni comprobante por reintento.

### Errores esperados

`INVALID_CART`, `ORDER_ALREADY_EXISTS`, `ORDER_NOT_FOUND`, `INVALID_ORDER_STATE`, `PAYMENT_REQUIRED`, `STOCK_RESERVATION_REQUIRED`, `ORDER_HAS_INCIDENT`, `ORDER_ALREADY_CONVERTED_TO_SALE`.

### Seguridad

Consulta pública de pedido con token seguro, sesión o mecanismo equivalente. No exponer datos personales innecesarios. No exponer IDs internos. Angular interno requiere permisos.

### Auditoría

Auditar creación, cambio de estado, cancelación, incidencia, conversión a venta, asociación de pago, asociación de comprobante y cambio de delivery.

### Relación con ADRs

ADR-010, ADR-011, ADR-012, ADR-013, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018.

### Qué NO implementar todavía

No implementar pedidos online reales, no implementar checkout, no implementar Mercado Pago, no implementar facturación automática, no activar venta online.

---

## 3.11 Clientes online y datos personales

### Propósito

Definir los datos mínimos del comprador para pedidos online, delivery, facturación, soporte, seguimiento y protección de datos personales.

### Alcance

Comprador invitado o registrado futuro, datos de contacto, documento si aplica, datos tributarios para factura, relación con dirección de envío, relación con pedidos online, consulta segura de estado de pedido, privacidad y acceso por rol.

### Datos mínimos

`customerId` opcional, `fullName`, `email`, `phone`, `documentType` opcional, `documentNumber` opcional, `billingData` si solicita factura, `shippingAddress`, `createdAt`, `updatedAt`.

Datos tributarios conceptuales para factura: `ruc`, `businessName`, `fiscalAddress`, `taxDocumentType`.

### Estados sugeridos

`GUEST`, `REGISTERED`, `ACTIVE`, `BLOCKED`, `DATA_REVIEW_REQUIRED`.

### Validaciones server-side

Email válido, celular requerido para delivery, nombre del destinatario requerido, datos tributarios válidos si solicita factura, RUC requerido para factura, razón social requerida para factura, dirección fiscal requerida para factura, no exponer datos personales sin autorización, no registrar datos sensibles completos en logs.

### Errores esperados

`CUSTOMER_EMAIL_INVALID`, `CUSTOMER_PHONE_REQUIRED`, `CUSTOMER_NAME_REQUIRED`, `TAX_DATA_REQUIRED`, `RUC_INVALID`, `BUSINESS_NAME_REQUIRED`, `FISCAL_ADDRESS_REQUIRED`, `UNAUTHORIZED_CUSTOMER_DATA_ACCESS`.

### Seguridad

Acceso por roles, masking cuando aplique, consulta pública de pedido con token seguro, no exponer datos personales por Storefront API salvo lo estrictamente necesario, no loguear documentos/direcciones/teléfonos completos si no es necesario, cumplir principio de minimización de datos.

### Auditoría

Auditar creación de datos de cliente en pedido, modificación de datos tributarios, consulta administrativa de información sensible si aplica, corrección de datos para facturación y resolución de incidencia de datos.

### Relación con ADRs

ADR-012, ADR-014, ADR-015, ADR-016, ADR-018.

### Qué NO implementar todavía

No implementar cuentas de cliente completas, panel de cliente, login público, historial de pedidos público, marketing automation ni CRM.

---

## 3.12 Mercado Pago

### Propósito

Definir el contrato base para integrar Mercado Pago de forma segura, server-side, idempotente y consistente con pedido, reserva, venta y facturación.

### Alcance

Intento de pago, preferencia, webhook, validación server-side, conciliación, incidencias e idempotencia.

### Datos mínimos

`paymentAttemptId`, `onlineOrderId`, `provider`, `preferenceId`, `paymentId`, `paymentStatus`, `expectedAmount`, `approvedAmount`, `currency`, `idempotencyKey`, `webhookEventId`, `createdAt`, `updatedAt`.

### Estados sugeridos

`PENDING`, `PROCESSING`, `APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED`, `REFUNDED`, `CHARGEBACK`, `AMOUNT_MISMATCH`, `STOCK_EXCEPTION`, `WEBHOOK_DUPLICATE_IGNORED`.

### Validaciones server-side

No crear preferencia sin pedido válido ni reserva válida. No confiar en monto del frontend. Validar monto aprobado contra total esperado. Validar estado real del pago cuando corresponda. Procesar webhook con idempotencia. No convertir a venta solo por redirect ni solo por webhook sin validaciones.

### Errores esperados

`PAYMENT_PREFERENCE_CREATION_FAILED`, `PAYMENT_WEBHOOK_INVALID`, `PAYMENT_DUPLICATED`, `PAYMENT_AMOUNT_MISMATCH`, `PAYMENT_WITHOUT_VALID_ORDER`, `PAYMENT_WITHOUT_VALID_RESERVATION`, `PAYMENT_PROVIDER_ERROR`.

### Seguridad

Credenciales fuera del repositorio, validación de webhook según mecanismo vigente, no registrar tokens ni datos sensibles completos, rate limiting/protección para webhook, logging seguro.

### Auditoría

Auditar creación de preferencia, recepción de webhook, validación de pago, confirmación, rechazo, incidencia, conciliación y reintentos.

### Relación con ADRs

ADR-010, ADR-011, ADR-012, ADR-013, ADR-014, ADR-016.

### Qué NO implementar todavía

No integrar Mercado Pago todavía, no crear credenciales reales, no crear endpoints reales, no activar pagos reales, no implementar checkout.

---

## 3.13 Facturación automática

### Propósito

Definir el contrato base para facturar pedidos online de forma automática, segura, idempotente y consistente con venta, pago y stock.

### Alcance

Pedido pagado, reserva confirmada, conversión a venta, boleta/factura, datos tributarios, serie/correlativo, comprobante electrónico, incidencias y reintentos.

### Datos mínimos

`billingRequestId`, `onlineOrderId`, `saleId`, `documentType`, `billingStatus`, `customerBillingSnapshot`, `billingItemsSnapshot`, `serie`, `correlative`, `electronicDocumentId`, `attempts`, `createdAt`, `updatedAt`.

### Estados sugeridos

`PENDING_BILLING`, `BILLING_IN_PROGRESS`, `BILLED`, `BILLING_FAILED`, `BILLING_RETRY_PENDING`, `BILLING_BLOCKED`, `BILLING_SERIES_NOT_AVAILABLE`, `BILLING_TAX_DATA_INVALID`, `BILLING_PROVIDER_ERROR`, `BILLING_DUPLICATE_IGNORED`.

### Validaciones server-side

No facturar sin venta válida, pago aprobado validado, reserva confirmada, monto consistente, datos tributarios válidos y serie activa. No duplicar comprobante ni facturar pedido con incidencia crítica.

### Errores esperados

`BILLING_SERIES_NOT_AVAILABLE`, `BILLING_TAX_DATA_INVALID`, `BILLING_AMOUNT_MISMATCH`, `BILLING_SALE_REQUIRED`, `BILLING_PAYMENT_REQUIRED`, `BILLING_STOCK_RESERVATION_REQUIRED`, `BILLING_DUPLICATED`, `BILLING_PROVIDER_ERROR`.

### Seguridad

Validar datos de boleta/factura. No confiar en datos del frontend sin validación. No exponer errores tributarios técnicos al cliente. Roles autorizados para reintentos.

### Auditoría

Auditar conversión pedido → venta, creación de solicitud, emisión, error, reintento, aceptación/rechazo y comprobante asociado.

### Relación con ADRs

ADR-012, ADR-013, ADR-014, ADR-016, ADR-018.

### Qué NO implementar todavía

No implementar facturación automática, no modificar billing actual, no emitir comprobantes ecommerce reales, no implementar notas de crédito todavía.

---

## 3.14 Delivery nacional, UBIGEO y couriers

### Propósito

Definir el contrato base para delivery nacional progresivo, selección controlada de ubicación, costos de envío, couriers, tracking y operación logística.

### Alcance

Catálogo geográfico, departamento, provincia, distrito, UBIGEO, cobertura, zona logística, tarifa, courier, dirección, tracking y estados de despacho.

### Datos mínimos

Ubicación: `departmentId`, `departmentName`, `provinceId`, `provinceName`, `districtId`, `districtName`, `ubigeo`, `active`, `covered`, `shippingZoneId`.

Dirección: `recipientName`, `phone`, `email`, `departmentId`, `provinceId`, `districtId`, `addressLine`, `reference`, `document`, `notes`.

Envío: `shippingCost`, `shippingMethod`, `courierId`, `trackingCode`, `shipmentStatus`.

### Estados sugeridos

`SHIPPING_PENDING`, `READY_TO_PREPARE`, `PREPARING`, `READY_TO_SHIP`, `COURIER_ASSIGNED`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `DELIVERY_FAILED`, `RETURN_PENDING`, `RETURNED`, `DELIVERY_CANCELLED`.

### Validaciones server-side

No permitir texto libre para departamento/provincia/distrito. Cliente selecciona ubicación desde listas controladas. Backend valida cobertura y calcula costo de envío. No permitir pago sin dirección válida ni costo definido. No confiar en costo del frontend. No cambiar costo después del pago sin flujo formal.

### Errores esperados

`INVALID_LOCATION`, `DISTRICT_NOT_COVERED`, `SHIPPING_RATE_NOT_FOUND`, `SHIPPING_QUOTE_REQUIRED`, `INVALID_ADDRESS`, `COURIER_NOT_AVAILABLE`, `TRACKING_REQUIRED`, `DELIVERY_STATE_INVALID`.

### Seguridad

Proteger datos personales. Mostrar dirección completa solo a roles autorizados. No exponer información interna del courier. Logging seguro. Storefront API solo expone estado público.

### Auditoría

Auditar cálculo de envío, cambio de tarifa, cambio de cobertura, asignación de courier, registro de tracking, cambio de estado de delivery e incidencia de entrega.

### Relación con ADRs

ADR-012, ADR-013, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018.

### Qué NO implementar todavía

No integrar courier por API, no activar delivery real, no prometer tiempos exactos, no crear tracking automático, no crear endpoints reales todavía.

---

## 3.15 Merchant Center y SEO técnico

### Propósito

Definir el contrato base para feed de productos, sitemap, robots, canonical, structured data, index/noindex y consistencia SEO técnica.

### Alcance

Feed Merchant Center futuro, sitemap dinámico, robots.txt, canonical, structured data, Product schema, BreadcrumbList, Organization/LocalBusiness, FAQPage, control de indexación, filtros/facetas y productos agotados.

### Datos mínimos para feed

`id`, `title`, `description`, `link`, `image_link`, `additional_image_link`, `availability`, `price`, `sale_price`, `brand`, `gtin`, `mpn` o `sku`, `condition`, `product_type`, `google_product_category`, `item_group_id`.

### Estados sugeridos

`ELIGIBLE`, `NOT_ELIGIBLE`, `MISSING_REQUIRED_DATA`, `READY_FOR_FEED`, `EXCLUDED`, `NEEDS_REVIEW`.

### Validaciones server-side

No incluir productos no publicados, sin precio válido, sin imagen principal, sin URL canónica o páginas noindex en sitemap. No indexar staging ni filtros/facetas por defecto. Precio y disponibilidad deben coincidir entre feed, tienda, schema y checkout. Structured data debe representar datos reales.

### Errores esperados

`MERCHANT_PRODUCT_NOT_ELIGIBLE`, `FEED_PRICE_MISMATCH`, `FEED_AVAILABILITY_MISMATCH`, `CANONICAL_REQUIRED`, `IMAGE_REQUIRED`, `STRUCTURED_DATA_INVALID`, `SITEMAP_URL_NOT_INDEXABLE`.

### Seguridad

No exponer productos internos, costos, márgenes ni staging. No usar robots.txt como seguridad.

### Auditoría

Auditar inclusión/exclusión de producto, revisión humana, cambios SEO críticos, errores de feed, cambios de index/noindex y cambios de canonical.

### Relación con ADRs

ECOM-ADR-006, ECOM-ADR-007, ECOM-ADR-008, ECOM-ADR-011, ECOM-ADR-017, ECOM-ADR-018, ECOM-ADR-019.

### Qué NO implementar todavía

No generar feed real, no configurar Merchant Center, no configurar Search Console, no implementar sitemap real, no implementar robots real, no activar indexación real.

---

## 3.16 Auditoría ecommerce transversal

### Propósito

Definir la trazabilidad mínima obligatoria para operaciones críticas ecommerce, permitiendo investigar cambios, incidencias, errores operativos, acciones de usuario y procesos automáticos.

### Alcance

Auditoría para catálogo, categorías, marcas, variantes, imágenes, SEO metadata, precios, almacén online, stock reservado, pedidos, pagos, facturación, delivery, Merchant Center, seguridad e incidencias.

### Datos mínimos

`auditEventId`, `actorUserId`, `actorRole`, `actorType`, `action`, `entityType`, `entityId`, `previousValue`, `newValue`, `reason`, `source`, `result`, `ipAddress` si aplica y es seguro, `userAgent` si aplica y es seguro, `createdAt`, `correlationId`, `traceId`.

### Eventos mínimos

`PRODUCT_PUBLISHED`, `PRODUCT_UNPUBLISHED`, `CATEGORY_CHANGED`, `BRAND_CHANGED`, `VARIANT_CHANGED`, `IMAGE_CHANGED`, `SEO_METADATA_CHANGED`, `ONLINE_PRICE_CHANGED`, `ONLINE_WAREHOUSE_CHANGED`, `STOCK_RESERVATION_CREATED`, `STOCK_RESERVATION_CONFIRMED`, `STOCK_RESERVATION_RELEASED`, `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `PAYMENT_PREFERENCE_CREATED`, `PAYMENT_WEBHOOK_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_INCIDENT_CREATED`, `ORDER_CONVERTED_TO_SALE`, `BILLING_REQUEST_CREATED`, `BILLING_RETRY_REQUESTED`, `SHIPPING_STATUS_CHANGED`, `COURIER_ASSIGNED`, `TRACKING_REGISTERED`, `MERCHANT_FEED_ELIGIBILITY_CHANGED`, `SECURITY_INCIDENT_CREATED`.

### Validaciones server-side

Toda operación crítica debe registrar auditoría. No registrar secretos, tarjetas ni información sensible de pagos. No registrar datos personales completos si no es necesario. Registrar resultado de la operación: éxito, error, ignorado por idempotencia o bloqueado por permisos. Correlacionar eventos de pedido, reserva, pago, venta y facturación.

### Errores esperados

`AUDIT_WRITE_FAILED`, `AUDIT_REQUIRED`, `AUDIT_CONTEXT_MISSING`.

La falla de auditoría en operaciones críticas debe tratarse según criticidad. Para acciones sensibles, puede bloquear la operación si no se puede registrar trazabilidad mínima.

### Seguridad

Auditoría visible solo para roles autorizados. Los logs no reemplazan la auditoría funcional. Los registros de auditoría no deben revelar secretos ni datos personales innecesarios. Debe existir correlación segura para debugging sin exponer detalles al cliente.

### Relación con ADRs

ADR-012, ADR-013, ADR-014, ADR-015, ADR-016, ADR-018.

### Qué NO implementar todavía

No crear tabla de auditoría todavía, no implementar visor de auditoría todavía, no definir retención final todavía, no implementar alertas todavía.

---

# 4. Reglas de no implementación todavía

Este documento no autoriza implementar:

- código backend;
- código frontend;
- endpoints;
- migraciones;
- modificaciones DB/Flyway;
- cambios de CORS;
- cambios de AWS/staging;
- tienda Next.js;
- checkout;
- Mercado Pago;
- facturación automática;
- delivery real;
- Merchant Center real;
- Search Console;
- sitemap real;
- robots real;
- carga masiva de catálogo;
- cambios en POS;
- cambios en inventario productivo.

## Prohibiciones específicas de alcance

No iniciar una fase que mezcle de golpe:

- catálogo + checkout;
- catálogo + Mercado Pago;
- catálogo + facturación automática;
- catálogo + delivery real;
- Storefront API pública + Next.js público + checkout;
- Mercado Pago + facturación + delivery;
- AWS/staging + cambios funcionales grandes.

Cada fase futura debe tener alcance pequeño, validable y reversible.

---

# 5. Criterios para pasar a implementación

Antes de implementar debe cumplirse:

1. ECOM-ADR-001 al ECOM-ADR-019 guardados y aprobados.
2. Este documento guardado en `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md`.
3. Checklist Fase 0 guardado en `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md`.
4. No hay contradicciones entre ADRs.
5. Primera fase de implementación definida.
6. Alcance de primera fase limitado.
7. QA por fase definido.
8. Criterios técnicos obligatorios aceptados.
9. Criterios UX/UI aceptados.
10. Confirmación de que la implementación empezará en local.
11. Confirmación de que AWS/staging no se tocará todavía.
12. Confirmación de que checkout/Mercado Pago/facturación/delivery real no se implementarán en la primera fase.
13. Prompt de implementación debe limitarse a la fase correspondiente.
14. Toda implementación futura debe actualizar documentación y checklist.
15. Toda implementación futura debe respetar arquitectura hexagonal.
16. Toda implementación futura debe incluir manejo de errores.
17. Toda implementación futura debe incluir validaciones server-side.
18. Toda implementación futura debe evitar deuda técnica.

## Primera fase técnica recomendada

La primera fase de implementación debe ser:

> Catálogo online base en ERP/POS: publicación online, campos mínimos, slugs, marca/categoría, imagen principal conceptual, metadata SEO básica, precio online efectivo y validaciones server-side.

No iniciar por checkout, Mercado Pago, facturación automática, delivery real, Merchant Center real ni AWS/staging.

---

# 6. Addendum Fase 1A - preparacion documental

Fase 1A queda definida como fase documental/tecnica, no funcional.

Alcance permitido en Fase 1A:

- registrar cierre documental de Fase 0;
- documentar plan de Fase 1 - Catalogo online base en ERP/POS;
- documentar checklist QA de Fase 1;
- registrar decisiones propuestas para revision humana;
- preparar criterios de entrada para Fase 1B.

Fuera de alcance en Fase 1A:

- backend funcional;
- frontend funcional;
- endpoints;
- DB/Flyway;
- AWS/staging;
- Next.js;
- Storefront API publica;
- checkout;
- Mercado Pago;
- facturacion automatica ecommerce;
- delivery real;
- Merchant Center real;
- POS, inventario, ventas, caja y facturacion.

Decisiones propuestas para Fase 1B, sujetas a aprobacion humana antes de implementar:

| Decision | Propuesta |
|---|---|
| Producto sin marca | No usar texto libre; permitir solo marca formal o regla explicita `Sin marca`/`Generico`. |
| Categoria online | Obligatoria para publicar; no obligatoria para `DRAFT`. |
| Asset formal | Perfil online puede existir en `DRAFT` sin asset; publicacion bloqueada sin imagen principal con alt text y derechos confirmados. |
| Namespace administrativo | Usar `/api/v1/ecommerce-admin/...` para administracion interna. |
| Permisos iniciales | `ADMIN` crea/edita/publica/despublica; `SUPERVISOR` lectura/revision inicial. |
| Flyway | No tocar en Fase 1A; Fase 1B requiere aprobacion explicita y migracion aditiva de bajo riesgo. |

La Fase 1B no debe iniciar si estas decisiones no estan confirmadas o si se intenta mezclar catalogo online con checkout, pagos, delivery, facturacion automatica, Next.js publico, Merchant Center real o AWS/staging.

# Storefront Public DTO Design - Fase 2B

## Estado

Diseno documental de DTOs publicos para Fase 2B. No crea clases Java reales ni modifica contratos existentes.

## Principio rector

Los DTOs publicos de Storefront deben ser distintos de los DTOs administrativos. Ningun DTO `EcommerceAdmin...`, entidad JPA, entidad de dominio interna ni read model operativo debe exponerse directamente por la API publica.

## DTOs candidatos

### PublicPageResponse<T>

Proposito: envolver listados publicos paginados.

Campos permitidos:

| Campo | Regla |
|---|---|
| `items` | Lista de DTOs publicos. |
| `page` | Numero de pagina base 0. |
| `size` | Tamano aplicado, limitado server-side. |
| `totalItems` | Total publico de resultados filtrados. |
| `totalPages` | Total de paginas publicas. |

Campos prohibidos: SQL, nombre de entidad, query interna, filtros administrativos, informacion de performance interna.

### PublicProductListItemResponse

Proposito: item compacto para listados publicos, categorias y busqueda.

Campos permitidos:

| Campo | Regla |
|---|---|
| `slug` | Identificador publico principal. |
| `name` | Nombre publico. |
| `shortDescription` | Descripcion corta publica si existe. |
| `primaryImage` | `PublicImageResponse` de imagen principal. |
| `price` | `PublicPriceResponse` calculado server-side. |
| `availability` | `PublicAvailabilityResponse`, sin stock exacto. |
| `category` | Resumen publico de categoria principal. |
| `brand` | `PublicBrandSummaryResponse` si existe marca formal. |
| `seoTitle` | Opcional para listados si aporta SSR/SEO. |
| `canonicalUrl` | URL publica principal. |

Reglas:

- Solo productos `PUBLISHED` y publicables.
- Precio efectivo calculado server-side.
- Disponibilidad publica no equivale a stock exacto.

Campos prohibidos: `productId`, `profileId`, costo, margen, proveedor, stock exacto, estado interno, auditoria, flags administrativos.

### PublicProductDetailResponse

Proposito: detalle publico SEO de producto por slug.

Campos permitidos:

| Campo | Regla |
|---|---|
| `slug` | Slug publico normalizado. |
| `name` | Nombre publico. |
| `description` | Descripcion publica completa. |
| `primaryImage` | Imagen principal publica. |
| `gallery` | Lista publica futura de imagenes. |
| `price` | Precio efectivo publico. |
| `availability` | Disponibilidad publica. |
| `category` | Categoria publica principal. |
| `brand` | Marca publica embebida si existe. |
| `seo` | `PublicSeoResponse`. |
| `canonicalUrl` | URL canonica. |
| `indexable` | Boolean derivado de reglas server-side. |

Reglas:

- Producto no publicado responde 404, no DTO con flag interno.
- Producto agotado puede responder 200 si sigue publicado e indexable.
- `purchasable=false` cuando `availability.status=OUT_OF_STOCK`.

Campos prohibidos: IDs internos innecesarios, version interna, `createdBy`, `updatedBy`, timestamps administrativos, razones internas de bloqueo, reglas completas de precio.

### PublicCategoryResponse

Proposito: representar categoria online publica.

Campos permitidos:

| Campo | Regla |
|---|---|
| `slug` | Identificador publico. |
| `name` | Nombre publico. |
| `description` | Descripcion publica. |
| `parentSlug` | Opcional si existe jerarquia publica. |
| `children` | Hijas publicas activas si aplica. |
| `seo` | Metadata publica. |
| `canonicalUrl` | URL canonica. |
| `indexable` | `false` para categoria vacia o sin metadata minima. |
| `productCount` | Opcional, conteo publico no operativo. |

Reglas:

- Categoria activa vacia puede responder 200 para navegacion, pero `indexable=false`.
- Categoria inactiva o inexistente responde 404.

Campos prohibidos: categoria interna ERP, IDs internos, flags admin, auditoria, conteos operativos privados.

### PublicBrandSummaryResponse

Proposito: marca publica embebida en productos o filtro publico inicial.

Campos permitidos:

| Campo | Regla |
|---|---|
| `slug` | Slug publico de marca. |
| `name` | Nombre formal de marca. |
| `description` | Opcional, solo si es publica. |
| `logoUrl` | Opcional futuro si existe asset publico. |

Reglas:

- Las paginas publicas de marca quedan diferidas.
- La marca puede aparecer embebida si existe dato formal suficiente.
- `brandSlug` puede ser filtro si la marca esta activa y hay productos publicados asociados.

Campos prohibidos: IDs internos, notas administrativas, marcas inactivas, duplicados normalizados, datos de auditoria.

### PublicPriceResponse

Proposito: precio publico efectivo.

Campos permitidos:

| Campo | Regla |
|---|---|
| `amount` | Decimal server-side. |
| `currency` | Inicialmente `PEN`. |
| `formatted` | Opcional para UX, no como verdad contable. |
| `hasOnlineOverride` | Opcional; no debe revelar reglas completas. |

Reglas:

- Precio efectivo se calcula server-side.
- El frontend publico no calcula ni modifica precio.
- Checkout futuro debe revalidar precio server-side.

Campos prohibidos: costo, margen, regla interna completa, usuario que modifico precio, motivo interno de override.

### PublicAvailabilityResponse

Proposito: exponer disponibilidad comercial segura.

Campos permitidos:

| Campo | Regla |
|---|---|
| `status` | `AVAILABLE`, `OUT_OF_STOCK`, `NOT_PURCHASABLE`. |
| `label` | Texto publico controlado. |
| `purchasable` | `false` para agotados o no comprables. |

Reglas:

- No equivale a stock exacto.
- Producto agotado publicado: `OUT_OF_STOCK`, `purchasable=false`.
- No permite compra ni reserva en Fase 2B/2C MVP read-only.

Campos prohibidos: stock fisico, stock reservado, stock de seguridad, warehouseId, ajustes internos.

### PublicImageResponse

Proposito: imagen publica segura para catalogo y SEO.

Campos permitidos:

| Campo | Regla |
|---|---|
| `url` | URL publica o path publico aprobado. |
| `altText` | Obligatorio para imagen principal publicable. |
| `type` | Tipo publico, por ejemplo `PRODUCT_IMAGE`. |
| `displayOrder` | Orden publico. |

Reglas:

- Imagen principal de producto publicado debe tener alt text.
- Derechos de uso deben estar confirmados antes de publicar, pero no se exponen como detalle admin.

Campos prohibidos: ruta interna de storage, filesystem local, bucket privado, token firmado permanente, usuario que subio asset.

### PublicSeoResponse

Proposito: metadata SEO publica para SSR/SSG/ISR futuro.

Campos permitidos:

| Campo | Regla |
|---|---|
| `title` | Obligatorio si `indexable=true`. |
| `description` | Obligatorio si `indexable=true`. |
| `canonicalUrl` | Obligatorio para paginas indexables. |
| `robots` | `INDEX_FOLLOW` o `NOINDEX_FOLLOW`. |
| `ogTitle` | Opcional publico. |
| `ogDescription` | Opcional publico. |
| `ogImageUrl` | Opcional publico. |
| `indexable` | Derivado server-side. |

Reglas:

- El frontend publico no decide indexabilidad.
- Filtros y busquedas no son indexables por defecto.
- Categoria vacia queda `indexable=false`.

Campos prohibidos: notas internas SEO, estado de revision admin, usuario revisor, historial interno.

### PublicSitemapEntryResponse

Proposito: entrada JSON para generar `sitemap.xml` en fase futura.

Campos permitidos:

| Campo | Regla |
|---|---|
| `loc` | URL canonica publica. |
| `type` | `PRODUCT`, `CATEGORY`, `BRAND` futuro. |
| `lastModified` | Fecha publica derivada de cambios relevantes. |
| `priority` | Opcional, solo si se decide formalmente. |
| `changeFrequency` | Opcional, solo si aporta valor. |

Reglas:

- Solo URLs publicadas, canonicas e indexables.
- No incluir staging, filtros, busquedas, checkout, pedidos, admin ni categorias vacias.

Campos prohibidos: IDs internos, rutas admin, timestamps de auditoria no publicos, flags internos.

### PublicErrorResponse

Proposito: contrato de error seguro para Storefront.

Campos permitidos:

| Campo | Regla |
|---|---|
| `code` | Codigo publico estable. |
| `message` | Mensaje seguro, sin detalles internos. |
| `details` | Lista publica opcional para validaciones. |
| `traceId` | Correlacion tecnica segura. |

Codigos iniciales:

- `PUBLIC_INVALID_REQUEST` para 400.
- `PUBLIC_RESOURCE_NOT_FOUND` para 404.
- `PUBLIC_UNPROCESSABLE_REQUEST` para 422 futuro si aplica.
- `PUBLIC_RATE_LIMITED` para 429 futuro.
- `PUBLIC_INTERNAL_ERROR` para 500.

Campos prohibidos: stack trace, SQL, clase Java, entidad interna, tabla, repository, path de servidor, secreto, token, regla administrativa completa.

## Matriz de campos prohibidos

| Campo o dato | Motivo |
|---|---|
| Costos | Riesgo comercial. |
| Margenes | Riesgo comercial. |
| Proveedores | Dato interno operativo. |
| Stock exacto | Riesgo de scraping y promesa comercial falsa. |
| IDs internos innecesarios | Riesgo de acoplamiento e IDOR futuro. |
| Flags administrativos | Exponen operacion interna. |
| Estados internos | Confunden al cliente y filtran reglas. |
| Usuarios internos | Dato de auditoria no publico. |
| Datos de auditoria | No aportan al cliente. |
| Rutas internas de archivos | Riesgo de exposicion de infraestructura. |
| Informacion sensible | Seguridad y privacidad. |

## Reglas transversales

- ERP/POS sigue siendo fuente de verdad.
- Publicacion e indexabilidad se deciden server-side.
- Precio efectivo se calcula server-side.
- Disponibilidad publica no equivale a stock exacto.
- Storefront futuro solo renderiza datos publicos aprobados.
- DTOs publicos deben ser estables y compatibles hacia atras cuando sea posible.

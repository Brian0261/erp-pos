# Storefront Public API Design - Fase 2B

## Estado

Diseno tecnico/documental de Fase 2B. No representa implementacion, no crea endpoints reales y no autoriza tocar backend, frontend, DB, seguridad ni infraestructura.

## Objetivo

Definir el contrato tecnico de la API publica read-only para catalogo publico SEO-first, de forma que Fase 2C pueda implementar backend local con bajo riesgo y sin exponer contratos internos del ERP/POS.

## Alcance

- Disenar endpoints publicos read-only de catalogo.
- Cerrar namespace MVP bajo `/api/v1/storefront/catalog/...`.
- Definir filtros, paginacion, ordenamientos y errores publicos seguros.
- Documentar reglas SEO para canonical, robots, indexabilidad y elegibilidad de sitemap.
- Mantener separacion estricta entre API publica y `/api/v1/ecommerce-admin/...`.

## Fuera de alcance

- Controllers publicos reales.
- DTOs Java reales.
- Use cases, ports, repositories o adapters nuevos.
- Cambios en `SecurityConfig` o `GlobalExceptionHandler`.
- Flyway/DB, migraciones, endpoints reales o pruebas automatizadas.
- Next.js, Storefront publica, checkout, Mercado Pago, delivery, Merchant Center, pedidos online, stock reservado o AWS/staging.

## Namespace publico MVP

El namespace definitivo del MVP de catalogo publico es:

```text
/api/v1/storefront/catalog/...
```

No se usara en el MVP el namespace corto `/api/v1/storefront/products` ni `/api/v1/storefront/categories` para evitar contratos duplicados.

## Endpoints MVP read-only

| Metodo | Endpoint | Proposito | Estado |
|---|---|---|---|
| GET | `/api/v1/storefront/catalog/products` | Listado publico paginado de productos publicados. | MVP 2C |
| GET | `/api/v1/storefront/catalog/products/{slug}` | Detalle publico SEO de producto publicado por slug. | MVP 2C |
| GET | `/api/v1/storefront/catalog/categories` | Listado publico de categorias online activas. | MVP 2C |
| GET | `/api/v1/storefront/catalog/categories/{slug}` | Detalle publico SEO de categoria online por slug. | MVP 2C |
| GET | `/api/v1/storefront/seo/sitemap` | Fuente JSON futura para generar `sitemap.xml`. | Diseno 2B, implementacion posterior |

## Endpoints diferidos

| Metodo | Endpoint | Motivo de diferimiento |
|---|---|---|
| GET | `/api/v1/storefront/catalog/brands` | Marcas quedan embebidas en producto y como filtro inicial si hay dato suficiente. |
| GET | `/api/v1/storefront/catalog/brands/{slug}` | Paginas publicas de marca requieren contenido minimo y valor SEO real. |
| GET | `/api/v1/storefront/seo/robots-policy` | No es necesario para MVP si robots/canonical se resuelven en Storefront futuro. |

## Request params permitidos

### GET /api/v1/storefront/catalog/products

| Parametro | Tipo | Regla |
|---|---|---|
| `categorySlug` | string | Filtra por categoria publica activa. |
| `brandSlug` | string | Permitido solo si la marca existe, esta activa y aporta filtro publico. |
| `q` | string | Busqueda textual controlada; debe normalizarse y limitar longitud en Fase 2C. |
| `availability` | enum | Valores publicos: `AVAILABLE`, `OUT_OF_STOCK`. |
| `page` | integer | Base 0, default `0`, no negativo. |
| `size` | integer | Default `20`, maximo recomendado `50`. |
| `sort` | string | Ver ordenamientos permitidos. |

### GET /api/v1/storefront/catalog/products/{slug}

- `slug` debe ser el identificador publico normalizado.
- No acepta ID interno.
- No acepta query params funcionales en MVP.

### GET /api/v1/storefront/catalog/categories

| Parametro | Tipo | Regla |
|---|---|---|
| `includeEmpty` | boolean | Diferido; default futuro recomendado `false` para listados indexables. |
| `page` | integer | Opcional si se pagina el listado; default `0`. |
| `size` | integer | Default `50`, maximo recomendado `100`. |

### GET /api/v1/storefront/catalog/categories/{slug}

- `slug` debe ser el identificador publico normalizado.
- Puede devolver categoria activa vacia con `indexable=false` si se decide mantenerla para navegacion.

### GET /api/v1/storefront/seo/sitemap

| Parametro | Tipo | Regla |
|---|---|---|
| `type` | enum | Opcional futuro: `PRODUCT`, `CATEGORY`, `BRAND`. En MVP inicial puede omitirse. |
| `page` | integer | Recomendado para evitar payloads ilimitados. |
| `size` | integer | Maximo recomendado `500` para fuente sitemap. |

## Paginacion

- `page` usa base 0.
- `size` debe tener default seguro.
- Maximo recomendado para productos: `50`.
- Maximo recomendado para categorias: `100`.
- Maximo recomendado para sitemap JSON: `500`.
- No se permiten listados ilimitados.
- Valores invalidos responden `400 PUBLIC_INVALID_REQUEST`.

## Ordenamientos permitidos iniciales

| Sort | Aplica a | Regla |
|---|---|---|
| `name_asc` | productos, categorias | Orden alfabetico publico. |
| `name_desc` | productos | Opcional si aporta UX. |
| `price_asc` | productos | Usa precio efectivo server-side. |
| `price_desc` | productos | Usa precio efectivo server-side. |
| `newest` | productos | Solo si existe fecha publica confiable. |

Sorts como relevancia, destacados o popularidad quedan diferidos hasta tener datos publicos confiables.

## Filtros diferidos o condicionados

- `minPrice` y `maxPrice`: diferidos hasta validar costo de consulta e indices necesarios.
- Atributos avanzados: diferidos hasta existir modelo publico de atributos.
- Facetas indexables: diferidas; filtros no son canonicos por defecto.
- Marca como pagina publica: diferida; marca como dato embebido o filtro puede existir si hay dato suficiente.

## Reglas de respuesta por caso

| Caso | Respuesta |
|---|---|
| Producto `PUBLISHED`, completo e indexable | `200` con DTO publico, `indexable=true` si metadata minima cumple. |
| Producto `PUBLISHED` agotado | `200`, `availability.status=OUT_OF_STOCK`, `purchasable=false`, sin stock exacto. |
| Producto no publicado | `404 PUBLIC_RESOURCE_NOT_FOUND`, sin revelar existencia interna. |
| Slug de producto inexistente | `404 PUBLIC_RESOURCE_NOT_FOUND`. |
| Categoria activa con productos y metadata minima | `200`, `indexable=true`, elegible para sitemap. |
| Categoria activa vacia | `200` si aporta navegacion, `indexable=false`, excluida de sitemap. |
| Categoria inactiva o inexistente | `404 PUBLIC_RESOURCE_NOT_FOUND`. |
| Parametros invalidos | `400 PUBLIC_INVALID_REQUEST`. |
| Error inesperado | `500 PUBLIC_INTERNAL_ERROR` con mensaje generico. |

## Reglas SEO

- Toda pagina indexable debe exponer `canonicalUrl`.
- Toda pagina indexable debe exponer `seo.title` y `seo.description`.
- `robots` debe ser explicito: `INDEX_FOLLOW` o `NOINDEX_FOLLOW`.
- Productos agotados pueden mantenerse indexables si estan publicados, completos y tienen valor SEO.
- Categorias vacias quedan `indexable=false` y fuera de sitemap.
- Filtros, busquedas y paginacion no reemplazan canonical principal.
- Staging nunca debe ser indexable.

## Sitemap JSON

`GET /api/v1/storefront/seo/sitemap` se disena como fuente JSON de datos para un `sitemap.xml` futuro.

Reglas:

- No genera `sitemap.xml` en Fase 2B.
- Next.js o el Storefront futuro generara `sitemap.xml` en una fase posterior.
- Solo incluye URLs publicadas, canonicas e indexables.
- Excluye productos no publicados, categorias vacias, filtros, busquedas, checkout, pedidos, admin y staging.

## Reglas de seguridad

- Solo `GET` publico para MVP.
- Sin credenciales ni sesiones publicas en estos endpoints.
- Admin API sigue protegida y separada bajo `/api/v1/ecommerce-admin/...`.
- No se exponen costos, margenes, proveedores, stock exacto, IDs internos innecesarios, flags administrativos, usuarios internos ni auditoria.
- No se expone stack trace, SQL, nombres de clases, entidades internas ni rutas internas de archivos.
- Rate limiting y CORS restrictivo se documentan como requisitos para implementacion posterior, sin modificarlos en Fase 2B.

## Cacheabilidad futura

- Todas las respuestas MVP son `GET` read-only.
- El diseno debe favorecer cache futuro y SSR/SSG/ISR.
- No se implementa cache en Fase 2B.
- Revalidacion futura debe considerar cambios de publicacion, precio efectivo, disponibilidad, slug, metadata e imagenes.

## Riesgos para Fase 2C

- Abrir rutas publicas demasiado amplio en seguridad.
- Reutilizar DTOs admin por rapidez.
- Exponer mensajes internos del error handler global.
- Generar N+1 en listados publicos si no existe read model adecuado.
- Duplicar contratos entre `/storefront/catalog/...` y rutas cortas.
- Indexar categorias vacias o filtros por accidente.
- Exponer stock exacto o IDs internos innecesarios.

## Criterio de salida Fase 2B

- Endpoints MVP y diferidos documentados.
- Request params, paginacion, filtros y sorts definidos.
- Reglas 200/400/404/500 documentadas.
- Reglas SEO y sitemap JSON documentadas.
- Separacion admin/public documentada.
- Riesgos para Fase 2C visibles.

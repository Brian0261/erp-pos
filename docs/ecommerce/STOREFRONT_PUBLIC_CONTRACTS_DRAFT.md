# Storefront Public Contracts Draft

## Estado

Contratos preliminares refinados en Fase 2B. No representan implementacion ni autorizan crear endpoints reales en esta fase.

## Principios

- Base path publico: `/api/v1/storefront/...`.
- Namespace MVP de catalogo publico: `/api/v1/storefront/catalog/...`.
- La API publica inicial sera read-only.
- Los DTOs publicos seran separados de los DTOs administrativos.
- `/api/v1/ecommerce-admin/...` no debe exponerse ni reutilizarse como contrato publico.
- Las respuestas deben ser seguras, estables y aptas para cache futuro.
- No se usaran rutas duplicadas como `/api/v1/storefront/products` en el MVP.

## Reglas de exposicion

- Exponer solo productos `PUBLISHED` y aptos para publicacion publica.
- No exponer:
  - costos;
  - margenes;
  - proveedores;
  - stock operativo exacto;
  - flags administrativos;
  - IDs internos innecesarios.
- El frontend publico no calcula precio efectivo ni decide si un producto es publicable.
- El ERP/POS sigue siendo la fuente de verdad.

## Decisiones cerradas en Fase 2B

- Endpoints MVP bajo `/api/v1/storefront/catalog/...`.
- Marcas publicas embebidas en producto si existen; paginas publicas de marca quedan diferidas.
- `GET /api/v1/storefront/seo/sitemap` sera fuente JSON futura, no generador de `sitemap.xml`.
- Producto no publicado y slug inexistente responden `404 PUBLIC_RESOURCE_NOT_FOUND`.
- Producto agotado publicado puede responder `200` con `availability=OUT_OF_STOCK` y `purchasable=false`.
- Categoria activa vacia puede responder `200`, pero `indexable=false` y excluida de sitemap.
- API disenada para cache futura, sin implementar cache todavia.

## Contratos MVP read-only

### GET /api/v1/storefront/catalog/products

- Proposito: listado publico read-only de productos publicados.
- Estado: MVP Fase 2C.
- Params permitidos: `categorySlug`, `brandSlug` si aplica, `q`, `availability`, `page`, `size`, `sort`.
- Paginacion: `page` base 0, `size` default 20, maximo recomendado 50.
- Payload esperado draft:
  - `items[]`
  - `page`
  - `size`
  - `totalItems`
  - `totalPages`
- Item publico candidato:
  - `slug`
  - `name`
  - `shortDescription`
  - `primaryImageUrl`
  - `price`
  - `currency`
  - `availabilityLabel`
  - `categorySlug`
  - `brandSlug` opcional si existe marca publica formal
  - `seoTitle` opcional si aplica en listado futuro
- Reglas:
  - solo productos `PUBLISHED`;
  - no exponer stock exacto;
  - precio efectivo calculado server-side.

### GET /api/v1/storefront/catalog/products/{slug}

- Proposito: detalle publico read-only de producto por slug.
- Estado: MVP Fase 2C.
- Regla 404: producto no publicado o slug inexistente responde `PUBLIC_RESOURCE_NOT_FOUND`.
- DTO publico candidato:
  - `slug`
  - `name`
  - `description`
  - `primaryImage`
  - `gallery` opcional futuro
  - `price`
  - `currency`
  - `availability`
  - `category`
  - `brand` opcional
  - `seo`
  - `canonicalUrl`
  - `indexable`
- Reglas:
  - producto agotado publicado puede responder `OUT_OF_STOCK` y `purchasable=false`;
  - no permite compra ni reserva;
  - no revela existencia de productos internos.

### GET /api/v1/storefront/catalog/categories

- Proposito: listado publico read-only de categorias publicas.
- Estado: MVP Fase 2C.
- DTO candidato:
  - `slug`
  - `name`
  - `description`
  - `indexable`
  - `canonicalUrl`
- Reglas:
  - solo categorias online activas;
  - categorias vacias pueden omitirse del listado indexable;
  - no exponer categorias internas ERP/POS.

### GET /api/v1/storefront/catalog/categories/{slug}

- Proposito: detalle publico read-only de categoria por slug.
- Estado: MVP Fase 2C.
- Regla 404: categoria inactiva o inexistente responde `PUBLIC_RESOURCE_NOT_FOUND`.
- DTO candidato:
  - `slug`
  - `name`
  - `description`
  - `seo`
  - `canonicalUrl`
  - `indexable`
  - `productListingRef` o estructura equivalente futura
- Reglas:
  - categoria activa con productos y metadata minima puede ser `indexable=true`;
  - categoria activa vacia puede responder `200`, pero `indexable=false`;
  - categoria vacia queda excluida de sitemap.

### GET /api/v1/storefront/seo/sitemap

- Proposito: fuente JSON futura para exponer datos necesarios para `sitemap.xml`.
- Estado: diseno Fase 2B; implementacion posterior.
- Restriccion: incluir solo URLs publicadas, canónicas e indexables.
- No genera `sitemap.xml` en backend durante Fase 2B.
- Next.js o Storefront futuro generara `sitemap.xml` en fase posterior.

## Contratos diferidos

### GET /api/v1/storefront/catalog/brands

- Proposito: listado publico de marcas.
- Estado: diferido fuera del MVP inicial.
- Motivo: paginas publicas de marca requieren contenido minimo y valor SEO real.

### GET /api/v1/storefront/catalog/brands/{slug}

- Proposito: detalle publico de marca por slug.
- Estado: diferido fuera del MVP inicial.
- Motivo: evitar paginas pobres o duplicadas.

### GET /api/v1/storefront/seo/robots-policy

- Proposito: candidato opcional para exponer politica publica de `robots`/indexacion si aporta trazabilidad.
- Estado: diferido, no obligatorio en MVP inicial.

## Reglas publicas por caso

| Caso | Respuesta publica |
|---|---|
| Producto publicado, completo e indexable | `200` con DTO publico. |
| Producto publicado agotado | `200`, `availability=OUT_OF_STOCK`, `purchasable=false`. |
| Producto no publicado | `404 PUBLIC_RESOURCE_NOT_FOUND`. |
| Slug inexistente | `404 PUBLIC_RESOURCE_NOT_FOUND`. |
| Categoria activa con productos | `200`, `indexable=true` si cumple metadata minima. |
| Categoria activa vacia | `200`, `indexable=false`, fuera de sitemap. |
| Categoria inactiva o inexistente | `404 PUBLIC_RESOURCE_NOT_FOUND`. |

## Errores publicos seguros

- `400 PUBLIC_INVALID_REQUEST`: solicitud invalida.
- `404 PUBLIC_RESOURCE_NOT_FOUND`: recurso publico no encontrado, no publicado o inactivo.
- `422 PUBLIC_UNPROCESSABLE_REQUEST`: reservado para reglas publicas futuras si aplica.
- `429 PUBLIC_RATE_LIMITED`: limite de consumo excedido en fase futura.
- `500 PUBLIC_INTERNAL_ERROR`: error interno generico sin detalles tecnicos.

No exponer stack trace, SQL, nombres internos de clases, entidades internas, secretos, IDs internos innecesarios ni reglas administrativas completas.

Formato publico recomendado:

```json
{
  "code": "PUBLIC_RESOURCE_NOT_FOUND",
  "message": "Recurso publico no encontrado",
  "details": [],
  "traceId": "opcional"
}
```

## Consideraciones de cache futura

- Contratos pensados para cache controlado en fases posteriores.
- Respuestas read-only y estables favorecen SSR/SSG/ISR futuro.
- No se implementa cache en Fase 2B.
- Revalidacion futura debe considerar cambios de publicacion, precio efectivo, disponibilidad, slug, metadata e imagenes.

## Referencias de diseno Fase 2B

- `docs/ecommerce/STOREFRONT_PUBLIC_API_DESIGN.md`.
- `docs/ecommerce/STOREFRONT_PUBLIC_DTO_DESIGN.md`.
- `docs/qa/PHASE2_PUBLIC_CATALOG_API_DESIGN_QA_CHECKLIST.md`.

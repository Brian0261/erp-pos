# Storefront Public Contracts Draft

## Estado

Contratos preliminares draft para Fase 2A. No representan implementacion ni autorizan crear endpoints en esta fase.

## Principios

- Base path draft: `/api/v1/storefront/...`.
- La API publica inicial sera read-only.
- Los DTOs publicos seran separados de los DTOs administrativos.
- `/api/v1/ecommerce-admin/...` no debe exponerse ni reutilizarse como contrato publico.
- Las respuestas deben ser seguras, estables y aptas para cache futuro.

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

## Contratos candidatos

### GET /api/v1/storefront/catalog/products

- Proposito: listado publico read-only de productos publicados.
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
  - `brandSlug` opcional si aplica en fase futura
  - `seoTitle` opcional si aplica en listado futuro

### GET /api/v1/storefront/catalog/products/{slug}

- Proposito: detalle publico read-only de producto por slug.
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

### GET /api/v1/storefront/catalog/categories

- Proposito: listado publico read-only de categorias publicas.
- DTO candidato:
  - `slug`
  - `name`
  - `description`
  - `indexable`
  - `canonicalUrl`

### GET /api/v1/storefront/catalog/categories/{slug}

- Proposito: detalle publico read-only de categoria por slug.
- DTO candidato:
  - `slug`
  - `name`
  - `description`
  - `seo`
  - `canonicalUrl`
  - `indexable`
  - `productListingRef` o estructura equivalente futura

### GET /api/v1/storefront/seo/sitemap

- Proposito: contrato candidato para exponer datos necesarios para `sitemap.xml` futuro.
- Estado: decision tecnica pendiente entre endpoint JSON y generacion directa.
- Restriccion: incluir solo URLs publicadas, canónicas e indexables.

### GET /api/v1/storefront/seo/robots-policy

- Proposito: candidato opcional para exponer politica publica de `robots`/indexacion si aporta trazabilidad.
- Estado: candidato, no obligatorio en MVP inicial.

## Errores publicos seguros

- `400`: solicitud invalida.
- `404`: recurso publico no encontrado.
- `429`: limite de consumo excedido en fase futura.
- `500`: error interno generico sin detalles tecnicos.

No exponer stack trace, SQL, nombres internos de clases, secretos ni reglas administrativas completas.

## Consideraciones de cache futura

- Contratos pensados para cache controlado en fases posteriores.
- Respuestas read-only y estables favorecen SSR/SSG/ISR futuro.
- El diseño final de cache y revalidacion se cierra en Fase 2B y Fase 2D.

## Pendientes de diseno para Fase 2B

- Filtros permitidos en listados publicos.
- Paginacion y ordenamiento publico.
- Marcas publicas en MVP inicial o fase posterior.
- Politica de productos agotados.
- Sitemap como endpoint JSON o generacion directa.
- DTO exacto de metadata SEO publica.

# Storefront Next.js Delivery Plan - Fase 2D

## Estado

Documento de arquitectura y delivery para Fase 2D. No crea Next.js, no crea `storefront/`, no instala dependencias y no implementa codigo funcional.

## Objetivo de Fase 2D

Cerrar la decision de arquitectura para la futura Storefront publica SEO-first de InkToy y definir como se entregaran paginas publicas indexables usando Next.js, Storefront API Spring Boot y contratos SEO seguros.

## Alcance futuro de Storefront

La Storefront futura sera la tienda publica de InkToy en `inktoy.pe`. Su alcance inicial sera catalogo publico SEO sin compra online.

Alcance futuro inicial:

- home publica basica;
- navegacion publica basica;
- listado publico de productos;
- detalle publico de producto en `/productos/{slug}`;
- listado o landing de categorias;
- detalle publico de categoria en `/categorias/{slug}`;
- metadata SEO por pagina;
- canonical por pagina;
- Open Graph basico;
- `sitemap.xml` generado desde fuente JSON backend;
- `robots.txt` controlado por Storefront;
- staging no indexable.

`/marcas/{slug}` queda diferido hasta una fase posterior.

## Arquitectura propuesta

```text
Cliente / crawler
  -> inktoy.pe
  -> Next.js Storefront futura
  -> GET /api/v1/storefront/...
  -> Spring Boot ERP/POS monolito modular
  -> PostgreSQL
```

Principios:

- ERP/POS sigue siendo fuente de verdad para catalogo, precio, stock, pedidos, ventas y facturacion.
- Storefront publica no consume endpoints administrativos.
- Storefront publica no calcula reglas criticas.
- Storefront API sigue en Spring Boot por ahora.
- Storefront API se mantiene extraction-ready para un BFF separado solo si existe necesidad real futura.
- Angular `frontend/` queda solo para ERP/POS interno.

## Estructura futura de carpetas

Estructura recomendada cuando se autorice Fase 2E:

```text
erp-pos/
  backend/      # Spring Boot ERP/POS + Storefront API publica/controlada
  frontend/     # Angular ERP/POS interno
  storefront/   # Next.js Storefront publica futura
  docs/         # Documentacion tecnica, QA y ADRs
```

Reglas:

- No crear `storefront/` en Fase 2D.
- No mezclar Storefront publica dentro de `frontend/`.
- No instalar dependencias hasta que Fase 2E quede aprobada.
- No reutilizar componentes Angular internos para trafico publico.

## Consumo de endpoints backend

La Storefront futura consumira unicamente endpoints publicos bajo `/api/v1/storefront/...`.

Endpoints ya disponibles desde Fase 2C:

| Caso | Endpoint | Uso futuro |
|---|---|---|
| Listado de productos | `GET /api/v1/storefront/catalog/products` | Listados publicos y exploracion inicial. |
| Detalle de producto | `GET /api/v1/storefront/catalog/products/{slug}` | Pagina `/productos/{slug}` con SSG/ISR. |
| Listado de categorias | `GET /api/v1/storefront/catalog/categories` | Navegacion y landing de categorias. |
| Detalle de categoria | `GET /api/v1/storefront/catalog/categories/{slug}` | Pagina `/categorias/{slug}` con SSG/ISR. |
| Fuente sitemap JSON | `GET /api/v1/storefront/seo/sitemap` | Generacion futura de `sitemap.xml` desde Next.js. |

Prohibido para Storefront:

- consumir `/api/v1/ecommerce-admin/...`;
- consumir endpoints internos de POS, ventas, caja, facturacion o inventario;
- consultar base de datos directamente;
- exponer DTOs administrativos;
- confiar en datos criticos enviados por el cliente.

## Estrategia SEO

### Metadata

Cada pagina indexable debe tener title y meta description. La metadata debe venir del backend o de reglas fallback aprobadas documentalmente.

La Storefront no debe inventar metadata critica si el contrato no entrega informacion suficiente.

### Canonical

El canonical debe derivar de `canonicalPath` cuando este disponible en el contrato publico. Para productos y categorias debe apuntar a la URL principal por slug.

Ejemplos objetivo:

- `/productos/{slug}`
- `/categorias/{slug}`

Filtros, facetas, busquedas y paginacion no deben reemplazar la canonical principal sin una decision posterior.

### Open Graph

Open Graph basico debe usar datos publicos del producto o categoria:

- title publico;
- description publica;
- canonical publica;
- imagen principal publica cuando exista;
- alt text cuando este disponible.

Schema.org avanzado queda diferido.

### sitemap.xml

`sitemap.xml` futuro sera generado por Next.js usando `GET /api/v1/storefront/seo/sitemap` como fuente JSON.

Reglas:

- incluir solo URLs publicadas, canonicas e indexables;
- excluir staging;
- excluir filtros, facetas, busquedas, checkout, pedidos y admin;
- excluir productos o categorias no publicables;
- excluir paginas pobres o noindex.

Fase 2D no implementa `sitemap.xml` real.

### robots.txt

`robots.txt` futuro sera generado o controlado por la Storefront.

Produccion futura:

- permitir rastreo de paginas publicas indexables;
- bloquear o desalentar rutas privadas o tecnicas sin usar robots como seguridad.

Staging:

- no indexable por defecto;
- usar `noindex` y controles de entorno cuando aplique;
- no depender de `robots.txt` como mecanismo de proteccion de datos.

### Noindex staging

Staging nunca debe indexarse. Toda estrategia de staging debe incluir `noindex` por defecto y evitar incluir URLs staging en sitemap.

## Estrategia de rendering

### SSG/ISR principal

SSG/ISR sera la estrategia principal para catalogo publico SEO:

- `/productos/{slug}` con datos de detalle publico por slug;
- `/categorias/{slug}` con datos de categoria publica por slug;
- `sitemap.xml` generado desde fuente JSON backend;
- metadata y canonical generadas durante renderizado server-side/build-time.

ISR permite balancear SEO, rendimiento y actualizacion progresiva sin renderizar todo por request.

### SSR diferido

SSR queda diferido para casos donde SSG/ISR no sea suficiente, por ejemplo:

- informacion publica que cambie con frecuencia no cacheable;
- reglas futuras que dependan de request;
- vistas futuras no indexables donde sea necesario validar contexto en servidor.

No usar SSR por defecto para catalogo si ISR cubre los requisitos.

## Estrategia local/dev sin AWS todavia

Fases futuras deben iniciar localmente antes de tocar AWS/staging.

Lineamientos:

- backend local como fuente de API;
- Storefront local consumiendo `/api/v1/storefront/...` mediante configuracion documentada;
- sin credenciales reales;
- sin cambios en `.env` durante Fase 2D;
- sin Docker nuevo durante Fase 2D;
- sin staging hasta que exista shell local estable y aprobado.

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Angular interno se mezcla con tienda publica | Mantener `frontend/` interno y crear `storefront/` separado solo en fase aprobada. |
| Next.js consume endpoints admin | Limitar contratos a `/api/v1/storefront/...` y validar QA documental. |
| Sitemap incluye URLs no publicables | Generarlo desde JSON backend filtrado y reglas SEO aprobadas. |
| Staging indexado | `noindex` por defecto y exclusion de sitemap. |
| SSR innecesario aumenta costo y complejidad | Usar SSG/ISR por defecto para catalogo. |
| Metadata incompleta o inventada | Requerir metadata contractual o fallback aprobado. |
| Checkout se adelanta sin stock reservado | Mantener checkout, pagos, pedidos y stock reservado fuera de alcance. |

## Criterios para pasar a Fase 2E

Fase 2E Storefront MVP Shell solo debe iniciar si:

1. ADR-020 queda revisado y aprobado.
2. Este plan de delivery queda revisado y aprobado.
3. Checklist QA Fase 2D queda completado documentalmente.
4. Se confirma que Fase 2E creara solo shell publico minimo sin compra online.
5. Se confirma si Fase 2E puede crear `storefront/` e instalar dependencias.
6. Se confirma estrategia local/dev sin AWS/staging.
7. Se mantiene prohibicion de checkout, pagos, pedidos, stock reservado, delivery y Merchant Center.

## Fuera de alcance explicito

Fase 2D no incluye:

- crear Next.js;
- crear carpeta `storefront/`;
- instalar dependencias;
- tocar Angular `frontend/`;
- tocar backend funcional;
- tocar Flyway/DB;
- tocar Docker;
- tocar `.env`;
- tocar secretos;
- tocar AWS/staging;
- modificar POS, ventas, caja, facturacion o inventario;
- implementar `sitemap.xml` real;
- implementar checkout;
- implementar pagos;
- implementar delivery;
- implementar Merchant Center;
- implementar pedidos online;
- implementar stock reservado.

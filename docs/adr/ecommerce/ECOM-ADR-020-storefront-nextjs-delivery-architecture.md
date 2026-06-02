# ADR-020 - Arquitectura de entrega Storefront Next.js SEO-first

## Estado

Propuesto para aprobacion en Fase 2D.

## Contexto

InkToy ERP/POS ya cuenta con una Storefront API read-only implementada en Spring Boot 3.x como parte de Fase 2C. Los endpoints publicos disponibles son:

- `GET /api/v1/storefront/catalog/products`
- `GET /api/v1/storefront/catalog/products/{slug}`
- `GET /api/v1/storefront/catalog/categories`
- `GET /api/v1/storefront/catalog/categories/{slug}`
- `GET /api/v1/storefront/seo/sitemap`

La Fase 2C cerro con tests focalizados Storefront verdes y full backend suite verde. El endpoint de sitemap es una fuente JSON para una fase futura; no es `sitemap.xml` real.

La tienda publica debe nacer SEO-first, separada del ERP/POS interno y sin exponer endpoints administrativos. El frontend Angular actual fue construido para operacion interna autenticada y no debe convertirse en la tienda publica.

## Problema

Se necesita cerrar la decision de arquitectura de entrega de la futura Storefront antes de crear el proyecto Next.js o implementar paginas publicas. La decision debe evitar:

- mezclar el Angular interno con trafico publico;
- crear una SPA no indexable;
- duplicar catalogo, precios o stock fuera del ERP/POS;
- exponer `/api/v1/ecommerce-admin/...` a internet;
- generar `sitemap.xml`, canonical o robots sin una fuente confiable;
- adelantar checkout, pagos, pedidos o stock reservado sin fases previas.

## Decision

InkToy usara Next.js para la futura Storefront publica SEO-first.

La aplicacion publica se ubicara en una carpeta raiz separada llamada `storefront/` cuando se autorice su creacion en una fase posterior. La carpeta `frontend/` seguira reservada para el Angular interno del ERP/POS.

La Storefront API continuara viviendo dentro del monolito modular Spring Boot por ahora, bajo `/api/v1/storefront/...`, respetando arquitectura hexagonal estricta y principios extraction-ready. No se creara un BFF separado en Fase 2D.

## Limites de aplicaciones

| Aplicacion | Ubicacion | Rol |
|---|---|---|
| ERP/POS interno Angular | `frontend/` | Operacion interna autenticada: POS, inventario, ventas, caja, facturacion y administracion. |
| Backend Spring Boot | `backend/` | Fuente de verdad, reglas server-side y Storefront API publica/controlada. |
| Storefront publica Next.js | `storefront/` futuro | Tienda publica SEO-first, paginas indexables y experiencia publica. |

## Rutas publicas objetivo

Las rutas publicas objetivo para el MVP SEO son:

- Producto: `/productos/{slug}`.
- Categoria: `/categorias/{slug}`.

La ruta `/marcas/{slug}` queda diferida hasta que existan marca publica, metadata, contenido suficiente y reglas de indexacion aprobadas.

No se usaran IDs internos en URLs publicas.

## Estrategia de rendering

La estrategia principal sera SSG/ISR para paginas publicas de catalogo:

- Producto por slug: SSG/ISR usando `GET /api/v1/storefront/catalog/products/{slug}`.
- Categoria por slug: SSG/ISR usando `GET /api/v1/storefront/catalog/categories/{slug}`.
- Listados publicos basicos: SSG/ISR o renderizado hibrido segun paginacion y filtros aprobados.
- `sitemap.xml`: generado por Next.js usando `GET /api/v1/storefront/seo/sitemap`.

SSR queda reservado para casos realmente necesarios, por ejemplo informacion que no pueda cachearse de forma segura o que requiera evaluacion por request. No se usara SSR por defecto para catalogo si SSG/ISR cubre SEO, rendimiento y freshness aceptable.

## Estrategia SEO tecnica

Next.js sera responsable de generar las paginas HTML publicas indexables, metadata, canonical, Open Graph, `sitemap.xml` y `robots.txt` futuros, consumiendo contratos publicos del backend.

Reglas:

- `sitemap.xml` futuro sera generado por Next.js desde la fuente JSON `GET /api/v1/storefront/seo/sitemap`.
- `robots.txt` futuro sera generado o controlado por la Storefront.
- `canonical` debe derivar del `canonicalPath` entregado por backend o de una regla documental aprobada equivalente.
- Staging debe ser no indexable por defecto.
- Filtros, facetas, busquedas y paginacion no seran indexables por defecto.
- Paginas pobres o incompletas deben quedar `noindex`.
- Metadata critica no debe inventarse en cliente sin respaldo contractual.

## Seguridad y frontera publica

La Storefront publica solo consumira endpoints bajo `/api/v1/storefront/...`.

Reglas obligatorias:

- No consumir `/api/v1/ecommerce-admin/...` desde Next.js.
- No exponer DTOs administrativos.
- No consultar base de datos desde Next.js.
- No calcular precio efectivo, disponibilidad, stock, descuentos, totales, envio, estado de pedido, pago o facturacion en frontend.
- No guardar secretos en Next.js.
- No exponer stock operativo interno, costos, margenes, proveedores ni reglas internas completas.

## Consecuencias positivas

- La tienda publica nace separada del ERP/POS interno.
- Mejora la base de SEO tecnico con HTML indexable, metadata y rutas limpias.
- Evita acoplar Angular interno a trafico publico.
- Mantiene al ERP/POS como fuente de verdad.
- Permite cache e ISR sobre contratos publicos estables.
- Prepara una evolucion ordenada hacia sitemap real, Merchant Center, checkout y pagos en fases posteriores.

## Consecuencias negativas o costos

- Se agregara una segunda aplicacion frontend cuando se autorice `storefront/`.
- Habra que mantener configuracion separada para Storefront, Angular interno y backend.
- Se requerira disciplina de contratos para no duplicar logica en Next.js.
- La invalidacion ISR y frescura de catalogo deberan definirse con cuidado en fases posteriores.

## Fuera de alcance de Fase 2D

Fase 2D no implementa:

- proyecto Next.js;
- carpeta `storefront/`;
- dependencias nuevas;
- codigo frontend Angular;
- codigo backend funcional;
- migraciones Flyway o cambios DB;
- Docker, `.env`, secretos, AWS/staging;
- `sitemap.xml` real;
- checkout;
- pagos;
- delivery;
- Merchant Center;
- pedidos online;
- stock reservado.

## Criterios de aceptacion

Esta decision queda lista para aprobacion si:

1. Next.js queda confirmado como futura Storefront publica SEO-first.
2. `frontend/` queda reservado para Angular interno.
3. `storefront/` queda documentado como ubicacion futura, sin crearse en Fase 2D.
4. Storefront API queda dentro del monolito Spring Boot por ahora y extraction-ready.
5. `/productos/{slug}` y `/categorias/{slug}` quedan como rutas objetivo.
6. `/marcas/{slug}` queda diferido.
7. SSG/ISR queda como estrategia principal.
8. SSR queda diferido a casos necesarios.
9. `sitemap.xml` futuro queda definido como responsabilidad de Next.js usando JSON backend.
10. `robots.txt`, canonical y noindex staging quedan documentados.
11. El alcance prohibido queda explicitamente documentado.

## Decision resultante

Fase 2D define la arquitectura de entrega de la Storefront publica SEO-first sin implementar codigo. La siguiente fase posible, Fase 2E, solo deberia iniciar despues de revisar y aprobar esta documentacion.

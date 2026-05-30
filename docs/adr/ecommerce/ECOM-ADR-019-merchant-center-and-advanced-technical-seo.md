# ADR-019 — Merchant Center y SEO técnico avanzado para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first será una aplicación pública Next.js con SSR/SSG/ISR publicada en `inktoy.pe`.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.
- ADR-007: Imágenes y assets de producto.
- ADR-008: SEO metadata.
- ADR-009: Almacén online configurable, stock disponible online y stock reservado.
- ADR-010: Stock reservado, concurrencia y estrategia anti-sobreventa.
- ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ADR-012: Pedidos online y lifecycle ecommerce.
- ADR-013: Mercado Pago, webhook e idempotencia.
- ADR-014: Facturación automática ecommerce.
- ADR-015: Delivery nacional y couriers.
- ADR-016: Seguridad ecommerce y protección de APIs públicas.
- ADR-017: Storefront API pública/controlada.
- ADR-018: Administración ecommerce en Angular interno.

Decisiones base ya aprobadas:

- La tienda pública será Next.js con SSR/SSG/ISR en `inktoy.pe`.
- El ERP/POS interno estará en `app.inktoy.pe`.
- La Storefront API/API pública controlada estará en `api.inktoy.pe`.
- ERP/POS Spring Boot será la fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
- Angular interno será la consola administrativa ecommerce.
- Storefront API será la única capa pública ecommerce.
- Storefront API se implementará inicialmente como módulo dentro del monolito modular Spring Boot, diseñado como extraction-ready.
- El frontend público nunca decidirá precios, stock, descuentos, totales, costo de envío, estado del pedido, estado del pago ni datos finales de facturación.
- El catálogo online, marcas, variantes, imágenes, metadata SEO, slugs, precios online, stock online, delivery y publicación deben administrarse desde el ERP/POS.
- Los productos publicados online deben tener validaciones mínimas de SEO, imagen, precio, disponibilidad y publicación.
- Las URLs públicas usarán slugs limpios, estables y canonical.
- Los filtros/facetas no serán indexables por defecto.
- Los productos, marcas y categorías sin contenido mínimo no deben indexarse.
- Las imágenes/assets se gestionarán desde el ERP/POS.
- El precio online efectivo, la disponibilidad pública y los datos expuestos al cliente se calculan server-side.
- La seguridad, trazabilidad, auditoría y control por roles son obligatorios.

Este ADR define la estrategia de Merchant Center y SEO técnico avanzado para garantizar consistencia entre ERP/POS, Storefront API, Next.js, sitemap, metadata, structured data, canonical, feed de productos, precio, disponibilidad e imágenes.

## Problema

Se debe definir cómo InkToy preparará su ecommerce para SEO técnico avanzado y Merchant Center sin generar inconsistencias entre la tienda pública, el feed de productos, el sitemap, la metadata, el schema, el precio, la disponibilidad y las imágenes.

La decisión debe resolver:

- qué productos son elegibles para Merchant Center;
- qué productos deben excluirse del feed;
- qué datos mínimos debe tener el feed;
- cómo generar sitemap dinámico;
- cómo manejar canonical;
- cómo definir robots.txt;
- cómo usar structured data correctamente;
- cómo evitar indexar filtros, facetas, páginas pobres o staging;
- cómo manejar productos agotados;
- cómo mantener consistencia entre precio mostrado, feed, schema y checkout;
- cómo mantener consistencia entre disponibilidad pública, feed, schema y checkout;
- cómo usar imágenes optimizadas y válidas;
- qué debe administrar Angular interno;
- qué debe exponer Storefront API;
- qué debe renderizar Next.js.

Riesgos si no se define esta estrategia:

- feed rechazado o con errores;
- productos no publicados expuestos;
- sitemap con URLs incorrectas;
- páginas pobres indexadas;
- staging indexado por error;
- filtros/facetas indexados sin control;
- canonical incorrecto;
- precio distinto entre Merchant Center y landing page;
- disponibilidad distinta entre feed, página y checkout;
- structured data falso o inconsistente;
- imágenes inválidas o de baja calidad;
- pérdida de tráfico SEO por URLs mal gestionadas;
- duplicidad de contenido;
- baja confianza de Google en el catálogo.

## Decisión

Merchant Center se preparará como una integración futura controlada, no como una carga manual improvisada.

Decisiones principales:

1. El ERP/POS será la fuente de verdad para publicación, precio, disponibilidad, marca, imágenes, metadata y datos de producto.
2. El feed de Merchant Center deberá generarse desde datos confiables del ERP/POS, mediante Storefront API o proceso backend controlado.
3. El feed no se generará desde datos hardcodeados en Next.js.
4. El sitemap dinámico incluirá solo URLs públicas, canónicas, publicadas e indexables.
5. Next.js renderizará metadata, canonical, robots y structured data de forma coherente con Storefront API.
6. Los filtros/facetas no serán indexables por defecto.
7. Staging nunca debe indexarse.
8. No se incluirán en sitemap ni feed productos no publicados, sin precio válido, sin imagen principal o no aptos para ecommerce.
9. La disponibilidad y el precio del feed deberán coincidir con la landing page pública, el structured data y el checkout.
10. Las páginas de productos agotados podrán mantenerse indexables si tienen valor SEO, pero no serán comprables.
11. Las variantes se tratarán de forma consistente con ADR-005: la variante será item comercial cuando corresponda, y el producto padre seguirá siendo la página SEO principal salvo excepción justificada.
12. Angular interno deberá permitir revisar elegibilidad SEO/Merchant Center, errores de feed y validaciones de publicación.
13. En la fase de implementación, los campos exactos del feed deberán validarse contra los requisitos vigentes de Google Merchant Center.

Decisión central:

> InkToy preparará Merchant Center y SEO técnico avanzado como una extensión controlada del catálogo online del ERP/POS. El feed, sitemap, metadata, canonical, structured data, precio, disponibilidad e imágenes deberán derivar de la misma fuente confiable para evitar inconsistencias entre Google, la tienda pública y el checkout.

## Alcance de Merchant Center

Merchant Center será una integración futura orientada a mostrar productos de InkToy en superficies de Google, anuncios y listados gratuitos cuando corresponda.

### Productos elegibles

Un producto será elegible para Merchant Center solo si cumple como mínimo:

- está activo en ERP/POS;
- está publicado online;
- tiene slug público válido;
- tiene URL canónica;
- tiene nombre público;
- tiene descripción pública suficiente;
- tiene precio online efectivo válido;
- tiene disponibilidad pública calculada server-side;
- tiene imagen principal pública;
- tiene derechos de uso de imagen confirmados;
- tiene marca cuando aplique;
- tiene SKU interno obligatorio;
- tiene barcode/GTIN cuando exista;
- tiene categoría online;
- no está bloqueado por política interna;
- no está marcado como interno/no publicable;
- no tiene incidencia crítica de catálogo.

### Productos excluidos

Deben excluirse del feed:

- productos no publicados;
- productos internos;
- productos inactivos;
- productos sin precio válido;
- productos sin imagen principal;
- productos sin URL canónica;
- productos con metadata insuficiente;
- productos sin descripción mínima;
- productos no comprables por regla interna;
- productos de staging;
- productos duplicados;
- variantes no publicables;
- productos con datos inconsistentes entre ERP/POS y tienda pública.

### Relación con marca

La marca debe provenir de la entidad formal definida en ADR-004. No debe usarse texto libre para productos publicados online si existe marca reconocible.

### Relación con barcode/GTIN

Cuando exista barcode/GTIN, debe asociarse correctamente al producto o variante vendible. Si no existe, se usará SKU/MPN interno cuando aplique, manteniendo consistencia con las reglas de catálogo de InkToy.

En implementación, se deberá validar la forma exacta de declarar productos sin GTIN/barcode según los requisitos vigentes de Merchant Center.

### Relación con variantes

Cuando existan variantes vendibles, cada variante podrá representar un item comercial propio en el feed si tiene diferencias relevantes como color, tamaño, presentación o diseño.

Reglas:

- cada variante debe tener SKU propio;
- barcode/GTIN es opcional, pero único si existe;
- variantes relacionadas deben compartir `item_group_id` conceptual;
- la landing page debe permitir seleccionar la variante;
- la disponibilidad y precio deben corresponder a la variante;
- no crear páginas indexables por variante si no tienen valor SEO real.

### Productos agotados

Un producto agotado puede seguir en feed o sitemap solo si la estrategia aprobada lo permite y la disponibilidad se informa correctamente. Para la primera versión, no se permitirá compra de productos agotados.

Reglas:

- si está agotado, no debe ser comprable;
- debe mostrarse disponibilidad real;
- puede conservar página indexable si tiene valor SEO;
- debe sugerir alternativas o productos relacionados cuando sea posible;
- no debe ocultarse automáticamente si es una URL con valor SEO.

## Datos mínimos recomendados para el feed

El feed de Merchant Center deberá prepararse para incluir, como mínimo:

| Campo conceptual | Descripción |
|---|---|
| `id` | Identificador público estable del item. Preferir SKU cuando aplique. |
| `title` | Nombre del producto o variante. Debe ser claro y coincidir con la landing page. |
| `description` | Descripción pública útil. |
| `link` | URL canónica del producto en `inktoy.pe`. |
| `image_link` | Imagen principal pública del producto o variante. |
| `additional_image_link` | Imágenes adicionales si aplica. |
| `availability` | Disponibilidad pública consistente con tienda y checkout. |
| `price` | Precio online efectivo. |
| `sale_price` | Precio promocional futuro si se implementa formalmente. |
| `brand` | Marca formal cuando aplique. |
| `gtin` | Barcode/GTIN cuando exista. |
| `mpn` o `sku` | SKU/MPN interno cuando aplique. |
| `condition` | Condición del producto, normalmente nuevo si corresponde. |
| `product_type` | Categoría propia de InkToy. |
| `google_product_category` | Categoría Google si se define y mantiene. |
| `item_group_id` | Agrupador de variantes cuando aplique. |

Reglas:

- no incluir campos inventados sin soporte en datos reales;
- no enviar precio distinto al mostrado en la tienda;
- no enviar disponibilidad distinta al checkout;
- no enviar imágenes no públicas;
- no enviar productos con landing page no indexable;
- no enviar productos sin URL canónica;
- no enviar productos con metadata generada por IA sin revisión humana;
- validar en implementación los requisitos vigentes de Merchant Center antes de generar el feed real.

## Sitemap dinámico

El sitemap dinámico deberá incluir solo URLs públicas, canónicas, publicadas e indexables.

### URLs a incluir

- home;
- productos publicados e indexables;
- categorías online indexables;
- marcas indexables;
- futuras listas escolares indexables;
- futuras guías/blog indexables;
- páginas institucionales públicas relevantes.

### URLs a excluir

- productos no publicados;
- productos internos;
- productos inactivos;
- páginas noindex;
- staging;
- filtros/facetas por defecto;
- búsquedas internas;
- carritos;
- checkout;
- páginas de cuenta;
- pedidos/tracking;
- comprobantes;
- páginas administrativas;
- categorías vacías;
- marcas sin contenido mínimo;
- páginas pobres;
- URLs con query params no canónicas.

### Productos

Incluir solo productos:

- publicados online;
- con slug válido;
- con canonical;
- con metadata mínima;
- con imagen principal;
- con precio válido;
- indexables según política SEO.

### Categorías

Incluir categorías:

- publicadas;
- con productos o contenido suficiente;
- con slug válido;
- con metadata mínima;
- indexables.

### Marcas

Incluir marcas:

- publicadas;
- con contenido mínimo;
- con productos asociados;
- con slug válido;
- indexables.

### Futuras listas escolares

Incluir solo cuando:

- tengan contenido suficiente;
- tengan productos asociados;
- estén aprobadas;
- no dupliquen contenido;
- tengan metadata revisada.

### Futuras guías/blog

Incluir solo cuando:

- tengan valor real;
- estén revisadas;
- tengan canonical;
- no sean contenido IA genérico sin revisión.

### `lastModified`

Debe actualizarse cuando cambie:

- publicación;
- slug;
- metadata;
- contenido visible;
- imagen principal;
- disponibilidad relevante;
- precio visible;
- estado index/noindex.

### Revalidación

Next.js deberá revalidar páginas y sitemap cuando cambien:

- publicación online;
- slug;
- canonical;
- metadata;
- imágenes;
- precio;
- disponibilidad;
- categoría;
- marca;
- estado index/noindex.

## Robots.txt

`robots.txt` deberá usarse como orientación de rastreo, no como mecanismo de seguridad.

### Producción

En `inktoy.pe`, debe permitir rastreo de páginas públicas indexables.

Debe evitar rastreo innecesario de:

- rutas internas;
- checkout;
- carrito;
- búsqueda interna si aplica;
- parámetros o rutas no canónicas;
- recursos privados.

### Staging

`staging.inktoy.pe` nunca debe indexarse.

Debe protegerse con:

- `noindex`;
- bloqueo por robots/header cuando aplique;
- idealmente control de acceso;
- separación de entorno;
- sin credenciales productivas.

### Regla crítica

No se debe usar robots.txt para proteger datos sensibles. Todo recurso privado debe estar protegido por autenticación/autorización.

## Canonical

Canonical debe ser consistente con ADR-006.

### Producto padre

La URL canónica normal será:

```text
/productos/{product-slug}
```

### Variantes

Por defecto, las variantes no serán indexables de forma independiente.

Reglas:

- si la variante no tiene valor SEO propio, canonical hacia el producto padre;
- si la variante tiene página indexable aprobada, debe tener slug, metadata y contenido diferencial;
- evitar páginas duplicadas por color/tamaño sin valor real.

### Filtros/facetas

Por defecto:

- no indexar;
- canonical hacia categoría principal;
- evitar múltiples URLs con contenido similar.

### Categorías

Cada categoría indexable debe tener canonical propio.

### Marcas

Cada marca indexable debe tener canonical propio.

### Paginación

La paginación debe evitar duplicidad y contenido pobre. La estrategia exacta se definirá al implementar listados, pero debe respetar canonical, crawl budget y UX.

### Prevención de duplicados

No deben existir múltiples URLs canónicas para el mismo producto, categoría, marca o guía.

## Structured data

Next.js deberá renderizar structured data coherente con los datos de Storefront API.

### Product

Debe incluir datos consistentes con la página:

- nombre;
- descripción;
- imagen;
- marca;
- SKU/GTIN si existe;
- precio;
- moneda;
- disponibilidad;
- URL canónica.

Regla:

> El schema Product no debe declarar precio o disponibilidad distintos a los visibles en la página y usados en el feed.

### ProductGroup

Puede usarse cuando existan variantes y la estrategia técnica lo justifique.

Debe reflejar:

- producto padre;
- variantes;
- atributos diferenciales;
- agrupación coherente.

### BreadcrumbList

Debe generarse para:

- productos;
- categorías;
- marcas;
- futuras listas escolares;
- guías relevantes.

Debe coincidir con la navegación visible.

### Organization / LocalBusiness

Debe representar a InkToy como negocio.

Puede incluir:

- nombre;
- URL;
- logo;
- datos de contacto públicos;
- ubicación si corresponde;
- redes sociales si se definen;
- información coherente con páginas públicas.

### FAQPage

Solo debe usarse cuando exista contenido FAQ real visible en la página.

No debe generarse FAQ schema para contenido oculto, falso, duplicado o generado sin revisión.

### Riesgos de schema inconsistente

- rich results inválidos;
- pérdida de confianza;
- errores en Search Console;
- datos contradictorios con feed;
- mala experiencia del usuario.

## Index/noindex

### Indexar

Se puede indexar:

- productos publicados con datos completos;
- categorías con contenido mínimo;
- marcas con contenido mínimo;
- guías útiles y revisadas;
- listas escolares futuras con valor real;
- páginas institucionales relevantes.

### Noindex

Debe aplicarse a:

- staging;
- filtros/facetas por defecto;
- resultados de búsqueda interna;
- carrito;
- checkout;
- cuenta;
- pedidos;
- tracking;
- comprobantes;
- páginas pobres;
- marcas sin contenido suficiente;
- categorías vacías;
- productos no publicados;
- productos internos;
- variantes sin valor SEO propio.

### Productos agotados

Un producto agotado puede permanecer indexable si:

- tiene valor SEO;
- puede volver a stock;
- mantiene información útil;
- muestra claramente que no está disponible;
- ofrece alternativas.

Debe usarse noindex o 410 solo cuando se trate de contenido sin valor, descontinuado definitivamente o con política aprobada.

### Productos descontinuados

Opciones:

- mantener página con alternativas si tiene tráfico/valor;
- redirigir a sustituto si existe equivalencia clara;
- usar 410 si no volverá y no tiene valor SEO;
- evitar redirecciones masivas irrelevantes.

## Filtros, facetas y paginación

### Filtros permitidos para UX

Pueden existir filtros por:

- marca;
- precio;
- color;
- tamaño;
- presentación;
- disponibilidad;
- categoría;
- atributos públicos.

### No indexar por defecto

Las URLs generadas por filtros/facetas no deben indexarse por defecto.

Ejemplos:

```text
/categorias/lapiceros?color=azul
/categorias/cuadernos?marca=stanford
/categorias/utiles-escolares?precio=10-20
```

### Canonical

Por defecto, las páginas filtradas deben canonicalizar hacia la categoría principal o hacia una landing aprobada.

### Excepciones futuras

Se podrán crear páginas facetadas indexables solo si:

- tienen búsqueda real;
- tienen contenido único;
- tienen productos suficientes;
- tienen metadata propia;
- tienen canonical propio;
- no duplican categorías existentes;
- fueron aprobadas por SEO/Content Manager o Ecommerce Manager.

Ejemplo futuro posible:

```text
/guias/utiles-escolares-para-primaria
/categorias/cuadernos-a4
/marcas/faber-castell
```

### Paginación

La paginación deberá:

- mantener URLs limpias;
- evitar indexación innecesaria de páginas sin valor;
- mantener consistencia de canonical;
- no bloquear rastreo de productos importantes;
- evitar duplicidad de metadata.

## Relación con productos agotados

Reglas para productos agotados:

1. No permitir compra.
2. Mostrar disponibilidad real.
3. Mantener precio visible si se decide conservar la página.
4. Mostrar alternativas o productos relacionados cuando sea posible.
5. Mantener indexable si tiene valor SEO.
6. No eliminar automáticamente URLs con tráfico.
7. No ocultar el producto del sitemap sin política definida.
8. Reflejar disponibilidad correcta en structured data.
9. Reflejar disponibilidad correcta en feed si se incluye.
10. Revalidar Next.js cuando cambie disponibilidad.

Para la primera versión, no se permitirán compras bajo pedido ni backorder.

## Relación con imágenes y Core Web Vitals

### Imagen principal

Todo producto elegible para publicación, sitemap o feed debe tener imagen principal.

### Alt text

Cada imagen pública debe tener alt text descriptivo y revisado.

### Formatos optimizados

La estrategia futura debe preparar:

- WebP;
- AVIF si aplica;
- tamaños responsivos;
- compresión;
- CDN;
- caché;
- lazy loading.

### Responsive images

Next.js debe entregar imágenes adecuadas para dispositivos móviles y escritorio.

### Lazy loading

Debe aplicarse a imágenes fuera del viewport inicial.

### CDN futuro

El uso de CDN debe prepararse para mejorar rendimiento, seguridad y Core Web Vitals.

### Consistencia feed/landing

La imagen principal enviada al feed debe coincidir con la imagen principal visible o una imagen válida equivalente de la landing page.

No usar:

- placeholder;
- miniaturas de baja calidad;
- imágenes rotas;
- imágenes sin permiso;
- imágenes con texto promocional excesivo;
- imágenes que no representen el producto.

## Relación con Storefront API

Storefront API deberá exponer datos necesarios para SEO técnico y Merchant Center, sin exponer datos internos.

### Datos para SEO técnico

- slug;
- canonical;
- robots policy;
- seoTitle;
- seoDescription;
- Open Graph;
- structured data data source;
- breadcrumbs;
- imágenes;
- precio público;
- disponibilidad pública;
- marca;
- categoría;
- atributos públicos.

### Datos para Merchant Center

- identificador público;
- title;
- description;
- link;
- image_link;
- additional images;
- availability;
- price;
- brand;
- GTIN si existe;
- SKU/MPN si aplica;
- product_type;
- item_group_id para variantes si aplica.

### Datos que no debe exponer

- costo interno;
- margen;
- proveedor interno si no es público;
- stock exacto operativo si no es necesario;
- reglas internas completas;
- productos no publicados;
- productos internos;
- datos administrativos;
- errores técnicos;
- credenciales.

### Consistencia

Storefront API debe ser fuente de datos coherente para:

- páginas públicas;
- sitemap;
- structured data;
- feed;
- validación de carrito;
- checkout.

## Relación con Next.js

Next.js será responsable de renderizar correctamente:

- SSR/SSG/ISR;
- metadata por página;
- canonical;
- robots meta;
- structured data;
- breadcrumbs;
- sitemap;
- robots.txt;
- páginas 404;
- redirecciones 301 futuras;
- estado 410 futuro si aplica.

### `generateMetadata` o estrategia equivalente

Debe usar datos provenientes de Storefront API o fallback aprobado.

No debe inventar metadata crítica si el backend indica noindex o falta contenido mínimo.

### Sitemap

Puede generarse desde Next.js consumiendo Storefront API o desde backend, pero debe seguir las reglas de este ADR.

### Robots

Next.js podrá servir robots.txt de producción, siempre que respete configuración por entorno.

### Revalidación

Debe revalidar cuando cambie:

- publicación;
- slug;
- metadata;
- imagen;
- precio;
- disponibilidad;
- categoría;
- marca;
- robots policy.

### 404 / 301 / 410

Reglas:

- slug inexistente: 404;
- slug cambiado con historial: 301;
- producto retirado definitivamente sin alternativa: 410 futuro si se aprueba;
- producto no publicado: 404 o noindex según política exacta;
- producto agotado: página puede mantenerse, pero no comprable.

## Relación con Angular interno

Angular interno deberá permitir administrar y revisar:

- elegibilidad para Merchant Center;
- checklist SEO de producto;
- errores de feed;
- estado de publicación;
- estado index/noindex;
- metadata SEO;
- canonical;
- imágenes;
- marca;
- GTIN/barcode;
- SKU;
- precio online efectivo;
- disponibilidad pública;
- categoría online;
- validaciones de sitemap;
- validaciones de structured data conceptuales;
- revisión humana.

### Vista de elegibilidad Merchant Center

Debe mostrar por producto:

- elegible/no elegible;
- motivo;
- campos faltantes;
- errores críticos;
- advertencias;
- fecha de última revisión;
- estado de publicación.

### Errores de feed

Debe mostrar:

- producto sin imagen;
- producto sin precio;
- producto sin marca cuando aplica;
- producto sin URL canónica;
- disponibilidad inconsistente;
- variante sin SKU;
- imagen inválida;
- metadata insuficiente.

### Revisión humana

Toda metadata estratégica, descripción importante o contenido generado con apoyo de IA debe pasar por revisión humana antes de publicarse.

## Reglas obligatorias

1. No incluir productos no publicados en sitemap ni feed.
2. No incluir productos sin precio válido.
3. No incluir productos sin imagen principal.
4. No exponer productos internos.
5. No indexar staging.
6. No indexar filtros/facetas por defecto.
7. No generar feed con precio distinto a la tienda.
8. No generar feed con disponibilidad distinta a la tienda.
9. No publicar metadata generada por IA sin revisión humana.
10. No usar structured data falso o inconsistente.
11. No incluir páginas noindex en sitemap.
12. No enviar al feed URLs no canónicas.
13. No usar imágenes sin derechos confirmados.
14. No usar productos sin landing page válida.
15. No permitir que Next.js invente precio, disponibilidad o metadata crítica.
16. No crear páginas facetadas indexables sin aprobación SEO.
17. No enviar variantes al feed si no tienen SKU propio.
18. No marcar como disponible un producto que no puede comprarse.
19. No ocultar productos agotados con valor SEO sin política definida.
20. No usar robots.txt como mecanismo de seguridad.
21. Validar requisitos vigentes de Merchant Center antes de implementar el feed real.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Generar feed desde Next.js | Descartada como fuente principal. Next.js no debe ser fuente de verdad de precio, disponibilidad ni catálogo. |
| Generar feed desde ERP/POS backend | Aceptada como opción fuerte. Mantiene datos cerca de la fuente de verdad. |
| Generar feed desde Storefront API | Aceptada si reutiliza contratos públicos consistentes con tienda y no expone datos internos. |
| Gestionar Merchant Center manualmente | Descartada para operación profesional. Puede generar inconsistencias, errores y duplicidad. |
| No preparar Merchant Center al inicio | Parcialmente aceptada: no se implementa aún, pero la arquitectura debe quedar preparada desde el diseño. |
| Incluir todos los productos activos del ERP en feed | Descartada. Solo productos publicados y validados deben salir al feed. |
| Indexar filtros/facetas para captar más tráfico | Descartada por defecto. Solo se permitirán landings facetadas estratégicas con contenido único. |

## Justificación

### SEO

Una tienda SEO-first necesita URLs limpias, metadata consistente, structured data válido, sitemap controlado, canonical correcto y páginas indexables con valor real.

### Merchant Center

El feed debe ser confiable, completo y consistente con la landing page para evitar errores, desaprobaciones o problemas de visibilidad.

### Consistencia

Precio, disponibilidad, imagen, URL, marca y descripción deben coincidir entre ERP/POS, Storefront API, Next.js, feed y checkout.

### Seguridad

No deben exponerse productos internos, datos administrativos, costos, márgenes ni staging.

### Mantenibilidad

Centralizar datos en ERP/POS y exponerlos por Storefront API reduce duplicidad y errores.

### Bajo riesgo

Preparar Merchant Center sin implementarlo todavía permite avanzar por fases sin improvisar.

### Operación real

Angular interno debe permitir revisar errores, elegibilidad y validaciones antes de publicar productos en Google.

## Consecuencias positivas

- Mejor preparación para tráfico orgánico.
- Mejor base para Merchant Center.
- Menor riesgo de feed inconsistente.
- Menor riesgo de indexar contenido pobre.
- Mejor control de productos agotados.
- Mejor consistencia entre tienda, schema, feed y checkout.
- Mejor trazabilidad de validaciones SEO.
- Mejor control de imágenes y metadata.
- Mejor preparación para Search Console y Merchant Center.
- Mejor capacidad de auditoría interna.

## Consecuencias negativas o costos

- Requiere más validaciones de catálogo.
- Requiere mantener metadata y contenido de calidad.
- Requiere gestión de elegibilidad Merchant Center.
- Requiere revisar imágenes y derechos de uso.
- Requiere controlar index/noindex.
- Requiere revalidación en Next.js.
- Requiere QA SEO técnico.
- Requiere disciplina para no indexar filtros/facetas sin estrategia.
- Requiere validar periódicamente cambios en requisitos externos de Merchant Center.

Estos costos son aceptables porque la tienda busca posicionarse en Google y operar con catálogo real, precios reales, stock real y futuras campañas de producto.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Precio inconsistente | Precio efectivo server-side desde ERP/POS y validación contra feed. |
| Disponibilidad inconsistente | Disponibilidad pública calculada server-side y revalidación. |
| Feed rechazado | Vista de elegibilidad y checklist antes de generar feed real. |
| Productos no publicados expuestos | Regla de exclusión obligatoria. |
| Sitemap con URLs incorrectas | Generación desde entidades publicadas, canónicas e indexables. |
| Canonical mal configurado | Reglas de ADR-006 y validación SEO. |
| Structured data inválido | Datos provenientes de Storefront API y QA técnico. |
| Filtros indexados | Noindex/canonical por defecto. |
| Staging indexado | Noindex, robots/header y control de entorno. |
| Imágenes inválidas | Validación de imagen principal, alt text y derechos. |
| Páginas pobres indexadas | Reglas de contenido mínimo y revisión humana. |
| Variantes duplicadas | Producto padre canónico y variante indexable solo por excepción. |
| IA generando contenido sin valor | Revisión humana obligatoria. |
| Requisitos externos cambian | Validar documentación vigente de Google durante implementación. |

## Impacto técnico

### Backend Spring Boot

Debe proveer datos confiables para feed, sitemap, metadata, precio, disponibilidad y publicación.

### Storefront API

Debe exponer datos públicos consistentes para Next.js, sitemap y Merchant Center.

### Next.js

Debe renderizar metadata, canonical, structured data, sitemap, robots y estados 404/301/410 según reglas.

### Angular interno

Debe administrar elegibilidad, metadata, imágenes, errores de feed, estado de publicación y revisión humana.

### Catálogo online

Debe incluir validaciones de publicación y elegibilidad SEO/Merchant Center.

### Marcas

Deben ser entidades formales y consistentes con feed.

### Variantes

Deben tener SKU propio y agrupación coherente para feed cuando aplique.

### Imágenes

Deben tener imagen principal, alt text, derechos y optimización futura.

### SEO metadata

Debe controlar title, description, canonical, robots, Open Graph y structured data.

### Precios

El feed y schema deben usar precio online efectivo.

### Stock

El feed y schema deben usar disponibilidad pública calculada.

### Merchant Center

Debe prepararse como integración futura controlada.

### QA SEO

Debe validar sitemap, feed, metadata, canonical, structured data, noindex, disponibilidad, precio e imágenes.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba Merchant Center como integración futura controlada.
2. Se aprueba que el feed debe generarse desde datos confiables del ERP/POS, Storefront API o backend controlado.
3. Se aprueba que no se generará feed desde datos manuales o hardcodeados en Next.js.
4. Se aprueba que el sitemap solo incluirá URLs públicas, canónicas, publicadas e indexables.
5. Se aprueba que staging nunca debe indexarse.
6. Se aprueba que filtros/facetas no serán indexables por defecto.
7. Se aprueba que precio y disponibilidad del feed deben coincidir con tienda, schema y checkout.
8. Se aprueba que productos sin precio válido, imagen principal o publicación online no entran al feed ni sitemap.
9. Se aprueba la estrategia para productos agotados.
10. Se aprueba el uso de structured data consistente con datos reales.
11. Se aprueba que Angular interno deberá mostrar elegibilidad Merchant Center y validaciones SEO.
12. Se aprueba que la implementación real de feed, sitemap, robots y Merchant Center queda para fases posteriores.
13. Se aprueba que los requisitos exactos de Merchant Center deberán validarse al momento de implementación.

## Qué NO hacer todavía

En este ADR no se debe:

- implementar Merchant Center;
- generar feed real todavía;
- implementar sitemap;
- implementar robots.txt;
- modificar Next.js;
- crear endpoints;
- crear migraciones;
- activar indexación real;
- configurar Search Console;
- configurar Merchant Center;
- crear feed en producción;
- crear páginas facetadas indexables;
- cambiar slugs actuales;
- modificar catálogo actual;
- modificar imágenes actuales;
- activar campañas;
- tocar AWS/staging.

Este ADR solo define la estrategia técnica de Merchant Center y SEO técnico avanzado. La implementación debe realizarse en fases posteriores con QA específico y validación contra datos reales.

## Decisión resultante

InkToy preparará Merchant Center y SEO técnico avanzado como una extensión controlada del catálogo online administrado desde el ERP/POS. El feed, sitemap, structured data, canonical, metadata, precio, disponibilidad e imágenes deberán derivar de datos confiables y consistentes.

La tienda pública Next.js renderizará páginas SEO-first con metadata, canonical y structured data coherentes. Storefront API expondrá datos públicos suficientes y seguros. Angular interno administrará elegibilidad, errores, validaciones SEO, metadata e imágenes.

No se indexará staging. No se indexarán filtros/facetas por defecto. No se enviarán al feed productos no publicados, sin precio válido, sin imagen principal o con datos inconsistentes. Merchant Center se implementará más adelante como integración controlada, no como carga manual improvisada.

En la fase de implementación se deberán validar los requisitos vigentes de Google Merchant Center antes de generar el feed real o activar integraciones productivas.

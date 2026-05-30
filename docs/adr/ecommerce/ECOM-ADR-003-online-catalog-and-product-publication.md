# ADR-003 — Catálogo online y publicación de productos para InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS es el sistema fuente de verdad para la operación del negocio: catálogo interno, precios, stock, ventas, facturación y administración. El ERP/POS actual ya maneja productos para operación interna, incluyendo datos como SKU, nombre, descripción, categoría, unidad, precio de venta, estado activo y, cuando existe, código de barras.

Sin embargo, un producto interno del ERP no necesariamente está listo para aparecer en una tienda online SEO-first. Un producto operativo puede estar activo para POS o inventario, pero no tener imagen, slug, marca, descripción comercial, metadata SEO, categoría online, stock disponible online o información suficiente para una página indexable.

Ya fueron aprobados:

- ADR-001: la tienda pública será Next.js SEO-first, el ERP/POS seguirá siendo fuente de verdad y existirá una Storefront API/BFF.
- ADR-002: `inktoy.pe` será tienda pública, `app.inktoy.pe` será ERP interno, `api.inktoy.pe` será API pública/controlada y `staging.inktoy.pe` seguirá como staging interno.

Este ADR define cómo debe controlarse el catálogo online dentro del ERP/POS para evitar publicar productos incompletos, duplicar catálogo o exponer datos internos.

## Problema

Se debe decidir cómo modelar y controlar qué productos del ERP/POS serán visibles en la tienda online.

La decisión debe resolver:

- qué diferencia existe entre producto interno y producto publicado online;
- qué campos mínimos necesita un producto para publicarse;
- cómo se relaciona el catálogo online con SEO, imágenes, marcas, variantes, precios y stock;
- cómo permitir que algunos productos tengan precio online distinto al precio POS;
- qué validaciones bloquean la publicación;
- qué datos puede exponer la Storefront API;
- qué datos internos no deben salir a la tienda pública.

Si se publican automáticamente todos los productos activos del ERP, podrían aparecer en la tienda productos:

- sin imagen;
- sin slug;
- sin descripción comercial;
- sin metadata SEO;
- sin marca;
- sin categoría online;
- sin stock disponible;
- con nombres internos poco claros;
- con datos técnicos no aptos para clientes;
- sin condiciones mínimas para posicionar en Google.

Si se duplica el catálogo fuera del ERP, aparecerían otros riesgos:

- precios inconsistentes;
- stock desincronizado;
- productos duplicados;
- mayor carga operativa;
- errores en Merchant Center;
- problemas al facturar o despachar;
- pérdida del ERP/POS como fuente de verdad.

## Decisión

Se decide que:

1. El ERP/POS seguirá siendo la fuente de verdad del catálogo.
2. No todo producto activo será publicado online.
3. Debe existir una capa de catálogo online o configuración online por producto/variante.
4. Debe existir un campo explícito de publicación online, por ejemplo:
   - `publishedOnline`;
   - `onlineStatus`;
   - o equivalente según diseño final.
5. La tienda online solo podrá consumir productos publicados mediante la Storefront API/BFF.
6. La Storefront API no debe exponer productos internos no publicados.
7. Deben existir validaciones mínimas antes de permitir publicar un producto.
8. Un producto puede estar activo en ERP/POS y seguir oculto en ecommerce.
9. La publicación online debe estar alineada con SEO, imágenes, marca, categoría online, precio y disponibilidad.
10. El precio POS será el precio base por defecto para ecommerce.
11. Algunos productos o variantes podrán tener un precio online distinto mediante `onlinePriceOverride` o configuración equivalente.
12. El precio online efectivo siempre debe calcularse server-side.
13. El frontend nunca debe definir ni manipular el precio final.

La decisión central es:

> Producto activo en ERP/POS no significa producto publicado online.

Y para precios:

> Precio POS es el precio base por defecto, pero el catálogo online puede definir un precio online distinto por producto o variante. El precio efectivo siempre se calcula server-side.

## Modelo conceptual recomendado

El catálogo online debe construirse como una extensión controlada del catálogo interno, no como un catálogo duplicado.

### Producto interno

Representa el producto usado por el ERP/POS para operación interna.

Puede incluir:

- SKU;
- código de barras opcional;
- nombre interno;
- descripción;
- categoría interna;
- unidad;
- precio POS;
- estado activo;
- auditoría;
- datos operativos.

Uso principal:

- POS;
- inventario;
- compras;
- ventas;
- reportes;
- facturación.

### Producto publicado online

Representa la versión comercial y SEO del producto para la tienda pública.

Puede estar asociado al producto interno o a una variante, según el modelo final.

Debe incluir:

- estado de publicación online;
- slug;
- nombre online;
- descripción online;
- metadata SEO;
- imagen principal;
- categoría online;
- marca;
- atributos visibles;
- precio online efectivo;
- disponibilidad online.

Uso principal:

- tienda Next.js;
- Storefront API;
- sitemap;
- Merchant Center;
- páginas de producto;
- páginas de categoría;
- búsqueda pública.

### Producto padre

Cuando existan variantes, el producto padre agrupa opciones comerciales similares.

Ejemplo:

```text
Producto padre:
Lapicero Faber-Castell 032

Variantes:
- Azul
- Negro
- Rojo
```

El producto padre puede ser la página SEO principal.

### Variante

La variante representa una opción vendible concreta.

Ejemplos:

- color;
- tamaño;
- presentación;
- diseño;
- medida;
- tipo de punta;
- largo;
- grosor.

Cada variante debe poder tener:

- SKU propio obligatorio;
- barcode opcional;
- stock propio;
- precio online opcional;
- imagen opcional;
- atributos.

### Marca

La marca debe modelarse como entidad formal en fases posteriores, porque impacta:

- SEO;
- filtros;
- Merchant Center;
- confianza del cliente;
- páginas de marca;
- clasificación del catálogo.

### Categoría online

La categoría online puede diferir de la categoría interna del ERP.

Ejemplo:

- Categoría interna: “Escritura”.
- Categoría online: “Útiles escolares / Lapiceros”.

La categoría online debe estar diseñada para navegación, SEO e interlinking.

### Imágenes

Las imágenes deben ser parte del catálogo online, no solo archivos decorativos.

Deben incluir:

- imagen principal;
- galería;
- alt text;
- fuente: proveedor o propia;
- orden;
- relación con producto o variante.

### Metadata SEO

Cada producto online debe poder tener:

- SEO title;
- SEO description;
- canonical;
- slug;
- descripción comercial;
- contenido útil;
- datos para schema.org Product.

### Precio online

El precio POS será el precio base por defecto. Sin embargo, el catálogo online podrá definir un precio online distinto mediante override por producto o variante.

Regla conceptual:

```text
precioOnlineEfectivo = onlinePriceOverride si existe y está activo
precioOnlineEfectivo = precioPOS si no existe override
```

El precio online efectivo debe ser el único precio expuesto a la tienda pública, checkout, Mercado Pago, facturación, Merchant Center y reportes ecommerce.

El frontend nunca debe enviar ni decidir el precio final. Solo debe mostrar el precio devuelto por Storefront API/BFF.

### Stock disponible online

El producto publicado online puede mostrarse en catálogo aunque no esté disponible para compra, pero no debe permitir compra si no hay stock disponible online.

La disponibilidad online dependerá del ADR posterior de stock online/reservas.

## Campos mínimos recomendados para publicación online

Campos recomendados para la configuración online:

| Campo | Propósito |
|---|---|
| `publishedOnline` | Define si el producto/variante puede aparecer en la tienda |
| `onlineStatus` | Estado editorial: borrador, listo, publicado, oculto |
| `slug` | URL limpia e indexable |
| `seoTitle` | Título SEO |
| `seoDescription` | Meta description |
| `onlineName` | Nombre comercial visible, si difiere del interno |
| `onlineDescription` | Descripción comercial para la tienda |
| `mainImage` | Imagen principal obligatoria para publicación |
| `gallery` | Imágenes adicionales |
| `brandId` | Marca asociada |
| `onlineCategoryId` | Categoría pública |
| `attributes` | Atributos visibles: color, tamaño, presentación |
| `featured` | Destacado opcional |
| `onlinePriceOverride` | Precio online opcional distinto al precio POS |
| `visibility` | Visibilidad pública: visible, oculto, noindex si aplica |
| `canonicalUrl` | Canonical si se requiere |
| `altText` | Texto alternativo de imagen |
| `publishedAt` | Fecha de publicación |
| `updatedOnlineAt` | Fecha de última actualización online |

No todos deben implementarse en la primera migración, pero el diseño debe preverlos.

## Reglas de publicación

Un producto o variante no debe poder publicarse online si no cumple condiciones mínimas.

### Reglas obligatorias

1. No publicar producto inactivo.
2. No publicar sin SKU.
3. No publicar sin slug único.
4. No publicar sin categoría online.
5. No publicar sin imagen principal.
6. No publicar sin precio válido.
7. No publicar sin metadata SEO mínima.
8. No publicar si el nombre visible está vacío.
9. No publicar si la descripción online mínima está vacía.
10. No exponer productos internos no publicados.
11. No permitir compra si no hay stock disponible online.
12. No permitir compra si `publishedOnline = false`.
13. No permitir compra si la variante vendible está inactiva.
14. No exigir barcode para publicación, pero sí SKU obligatorio.
15. Si existe `onlinePriceOverride`, debe ser válido, positivo y calculado server-side.
16. Si no existe `onlinePriceOverride`, el precio online efectivo será el precio POS.

### Barcode

El código de barras puede ser opcional porque algunos productos de papelería o pasamanería pueden no tener barcode. Sin embargo:

- si existe, debe ser único;
- si no existe, el SKU interno debe permitir operación, inventario, despacho y venta;
- en ecommerce, productos sin barcode deben tener imagen, marca/categoría y descripción clara para evitar errores de picking.

## Relación con SEO

El catálogo online debe nacer preparado para posicionamiento.

### URLs limpias

Cada producto publicado debe tener URL limpia:

```text
/productos/lapicero-faber-castell-032
```

No usar IDs internos ni query params como URL principal.

### Slugs únicos

El slug debe ser único por tipo de entidad:

- producto;
- categoría;
- marca;
- futura lista escolar.

Debe evitar duplicados y tener reglas de normalización.

### Metadata única

Cada producto publicado debe tener:

- `seoTitle`;
- `seoDescription`;
- nombre visible;
- descripción útil.

No se deben generar títulos repetidos masivamente.

### Canonical

Debe existir URL canónica para evitar duplicidad, especialmente cuando existan variantes, filtros o parámetros.

### Schema.org Product

El detalle de producto debe poder generar datos estructurados:

- nombre;
- imagen;
- descripción;
- SKU;
- marca;
- precio online efectivo;
- moneda;
- disponibilidad.

### BreadcrumbList

La categoría online debe permitir breadcrumbs correctos.

Ejemplo:

```text
Inicio > Útiles escolares > Lapiceros > Lapicero Faber-Castell 032
```

### Imágenes con alt text

Toda imagen principal debe tener `altText` descriptivo.

### Sitemap

Solo deben entrar al sitemap:

- productos publicados;
- categorías públicas;
- marcas públicas;
- páginas indexables.

No deben entrar:

- productos borrador;
- productos ocultos;
- staging;
- filtros no aprobados;
- productos internos no publicados.

### Productos agotados

Un producto agotado puede seguir publicado para SEO, pero no debe permitir compra.

La política exacta se definirá en ADR de stock online, pero este ADR establece que:

- producto publicado no siempre significa comprable;
- comprable requiere stock disponible online.

### Contenido duplicado

Se debe evitar:

- publicar varias páginas casi idénticas para variantes sin valor propio;
- crear páginas de marca sin contenido;
- crear categorías vacías;
- indexar filtros sin control.

## Relación con Storefront API/BFF

La Storefront API debe exponer únicamente datos públicos y seguros.

### Listado de productos

El listado debe exponer datos mínimos:

```text
StorefrontProductListItem
- slug
- name
- brandName
- categorySlug
- mainImageUrl
- price
- availability
- badges opcionales
```

El campo `price` debe representar el precio online efectivo calculado server-side.

No debe exponer:

- IDs internos innecesarios;
- costos;
- márgenes;
- proveedores;
- stock exacto por almacén;
- auditoría interna;
- flags técnicos;
- datos de compras;
- datos de POS.

### Detalle de producto

El detalle debe exponer:

```text
StorefrontProductDetail
- slug
- name
- brand
- description
- images
- variants
- price
- availability
- breadcrumbs
- seo
- schemaData
```

El precio expuesto debe ser el precio online efectivo. Si existen variantes, cada variante debe poder exponer su precio online efectivo.

### Productos no publicados

Si un producto no está publicado:

- no debe aparecer en listados;
- no debe aparecer en búsqueda pública;
- no debe entrar en sitemap;
- el detalle por slug debe devolver 404 o 410 según política futura.

### Productos sin stock

Si un producto está publicado pero sin stock:

- puede aparecer como “Agotado” si la política SEO lo permite;
- no debe permitir agregarse al carrito;
- puede mostrar productos relacionados o alternativas.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Publicar automáticamente todos los productos activos | Descartada. Producto activo para ERP/POS no garantiza que esté listo para ecommerce o SEO. |
| Duplicar catálogo en la tienda online | Descartada. Genera inconsistencias de precio, stock, productos y operación. |
| Manejar catálogo online fuera del ERP | Descartada como fuente de verdad. Podría existir caché derivada, pero no catálogo maestro externo. |
| Usar solo campos actuales del producto | Descartada. Faltan campos de publicación, SEO, imagen, marca, categoría online y control editorial. |
| Crear capa específica de catálogo online | Aceptada. Permite controlar publicación, SEO, visibilidad, precio online y contratos públicos sin duplicar fuente de verdad. |

## Justificación

### SEO

La tienda necesita páginas indexables con slugs, metadata, imágenes, contenido útil y estructura clara. Publicar productos internos sin control dañaría la calidad SEO.

### Seguridad

La Storefront API debe exponer solo datos públicos. Separar catálogo online evita filtrar datos internos o técnicos del ERP.

### Operación real

El equipo debe poder decidir qué productos se venden online, cuáles se mantienen solo para POS y cuáles están en preparación.

### Precios

El precio POS debe servir como base operativa, pero ecommerce puede requerir precios distintos en algunos productos. El override online permite flexibilidad sin duplicar catálogo ni crear una lista separada completa. El cálculo server-side evita manipulación desde frontend.

### Mantenibilidad

Una capa online evita mezclar reglas comerciales públicas con datos operativos internos.

### Bajo riesgo

Las validaciones de publicación reducen errores visibles al cliente y evitan publicar productos incompletos.

### Evitar duplicidad

El ERP/POS conserva la fuente de verdad. La tienda consume datos publicados, no mantiene su propio catálogo maestro.

## Consecuencias positivas

- Control claro de qué productos aparecen en la tienda.
- Mejor calidad SEO desde el inicio.
- Menos riesgo de productos incompletos publicados.
- Evita duplicar catálogo fuera del ERP.
- Permite mantener productos internos ocultos.
- Prepara Storefront API segura.
- Permite precio online distinto al POS sin duplicar catálogo.
- Facilita consistencia futura con checkout, Mercado Pago, facturación y Merchant Center.
- Facilita futuras marcas, variantes, imágenes y Merchant Center.
- Permite diferenciar producto publicado y producto comprable.
- Prepara futuras reglas de stock online y precios online.

## Consecuencias negativas o costos

- Se agregará complejidad al módulo de catálogo.
- Habrá más campos que administrar por producto.
- El equipo deberá completar datos antes de publicar.
- Se requerirá UI interna para gestionar publicación online.
- Se necesitarán validaciones adicionales.
- Habrá que definir migraciones futuras.
- Se requerirá disciplina para mantener SEO metadata de calidad.
- Se deberá controlar cuidadosamente la consistencia entre precio POS y precio online.

Estos costos son aceptados porque evitan problemas mayores de SEO, stock, precio y operación.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Productos incompletos publicados | Validaciones obligatorias antes de publicar. |
| Slugs duplicados | Restricción de unicidad y normalización. |
| Imágenes faltantes | Imagen principal obligatoria para publicación. |
| Precios inconsistentes | Precio online efectivo calculado server-side desde ERP/POS o Storefront API/BFF. |
| Frontend manipula precio | El frontend nunca define precio final; backend recalcula siempre. |
| Mercado Pago cobra monto distinto | La preferencia futura debe crearse con el total calculado server-side. |
| Facturación emite precio incorrecto | La venta/factura futura debe usar el precio final aprobado del pedido. |
| Merchant Center muestra precio diferente | El feed futuro debe usar el mismo precio online efectivo que la tienda. |
| Stock no confiable | No permitir compra sin stock disponible online. |
| Duplicidad de catálogo | ERP/POS sigue siendo fuente de verdad. |
| Contenido SEO pobre | Metadata mínima y revisión humana. |
| Exposición de datos internos | Storefront API con DTOs públicos separados. |
| Productos internos visibles por error | `publishedOnline` obligatorio y filtros estrictos. |
| Variantes mal modeladas | ADR específico de marcas/variantes antes de implementación completa. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad del catálogo.
2. La tienda solo consume productos publicados.
3. Producto activo no implica producto publicado online.
4. No exponer productos internos no publicados.
5. No duplicar catálogo maestro en Next.js.
6. No confiar en datos enviados desde frontend.
7. No publicar productos sin validaciones mínimas.
8. No publicar sin SKU.
9. No publicar sin slug único.
10. No publicar sin imagen principal.
11. No publicar sin categoría online.
12. No publicar sin precio válido.
13. Barcode puede ser opcional; SKU no.
14. No exponer stock operativo interno.
15. No exponer costos, márgenes, proveedores ni auditoría interna.
16. Storefront API debe usar DTOs públicos separados.
17. Precio POS será el precio base por defecto para ecommerce.
18. `onlinePriceOverride` será opcional por producto o variante.
19. El precio online efectivo siempre debe calcularse server-side.
20. El frontend nunca debe definir ni manipular el precio final.

## Impacto técnico

### Catálogo backend

Se requerirá extender el modelo conceptual de catálogo con campos o entidades relacionadas a publicación online.

### Frontend Angular interno

Se necesitará una interfaz futura para:

- marcar productos como publicables;
- completar slug;
- completar SEO;
- asignar imagen;
- asignar marca;
- asignar categoría online;
- configurar precio online opcional;
- validar publicación.

### Storefront API

Deberá exponer solo productos publicados, DTOs públicos y precio online efectivo.

### Next.js futuro

Consumirá productos publicados y renderizará páginas SEO.

### Inventario

Deberá integrarse con disponibilidad online, stock reservado y stock de seguridad en ADR posterior.

### Precios

Deberá integrarse con precio POS y override online opcional. El precio online efectivo deberá ser consistente con Storefront API, checkout, Mercado Pago, facturación, Merchant Center, promociones futuras y reportes.

### SEO

Este ADR habilita slugs, metadata, sitemap, schema y canonical.

### Merchant Center futuro

El catálogo online debe preparar datos para feed: marca, precio online efectivo, disponibilidad, imagen, SKU/barcode si existe.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que el ERP/POS sigue siendo fuente de verdad del catálogo.
2. Se aprueba que no todo producto activo se publica online.
3. Se aprueba la necesidad de una capa de catálogo online o configuración online.
4. Se aprueba el uso de `publishedOnline` o estado equivalente.
5. Se aprueban validaciones mínimas de publicación.
6. Se aprueba SKU obligatorio y barcode opcional.
7. Se aprueba que la tienda solo consume productos publicados mediante Storefront API.
8. Se aprueba que productos no publicados no aparecen en tienda, búsqueda ni sitemap.
9. Se aprueba que producto publicado no siempre significa comprable.
10. Se aprueba que compra requiere stock disponible online.
11. Se aprueba que Storefront API no expondrá datos internos.
12. Se aprueba que no se duplicará catálogo en Next.js.
13. Se aprueba que precio POS será el precio base por defecto.
14. Se aprueba que podrá existir precio online distinto mediante override o configuración específica.
15. Se aprueba que el precio online efectivo siempre se calculará server-side.
16. Se aprueba que el frontend nunca definirá ni manipulará el precio final.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar código;
- crear migraciones;
- crear endpoints;
- modificar productos actuales;
- cambiar DB/Flyway;
- crear tienda Next.js;
- tocar AWS/staging;
- implementar checkout;
- implementar Mercado Pago;
- implementar Merchant Center;
- crear UI de publicación online;
- modificar POS;
- modificar ventas;
- modificar inventario;
- publicar productos reales;
- cargar imágenes productivas;
- crear sitemap final.

## Decisión resultante

InkToy gestionará el catálogo online desde el ERP/POS, manteniendo el ERP como fuente de verdad. La tienda pública solo consumirá productos explícitamente publicados mediante Storefront API/BFF.

Producto activo en ERP/POS no significa producto publicado online. Producto publicado no significa necesariamente producto comprable. La compra dependerá del stock disponible online.

El precio POS será el precio base por defecto para ecommerce, pero algunos productos o variantes podrán tener precio online distinto mediante override/configuración específica. El precio online efectivo siempre se calculará server-side y será el precio usado por Storefront API, checkout futuro, Mercado Pago, facturación automática, Merchant Center y reportes ecommerce.

# ADR-005 — Variantes de producto para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS es el sistema fuente de verdad para catálogo, precios, stock, ventas, facturación y operación interna. La futura tienda online SEO-first consumirá productos publicados mediante Storefront API/BFF y no deberá duplicar catálogo, precios ni stock fuera del ERP/POS.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.

En papelería, útiles escolares, artículos escolares y pasamanería, muchos productos tienen diferencias vendibles relevantes: color, tamaño, presentación, medida, diseño, grosor, tipo de punta, cantidad por empaque o formato.

Ejemplo:

```text
Producto padre:
Lapicero Faber-Castell 032

Variantes:
- Azul
- Negro
- Rojo
```

Estas diferencias no son solo visuales. Afectan operación real:

- qué se vende en POS;
- qué se descuenta del inventario;
- qué se despacha;
- qué precio se muestra;
- qué barcode se escanea;
- qué variante elige el cliente;
- cómo se reportan ventas;
- cómo se envía información a Merchant Center;
- cómo se estructura la página SEO.

El ADR-004 ya definió que la marca se asociará preferentemente al producto padre cuando existan variantes. Este ADR define cómo deben modelarse las variantes para evitar duplicidad, errores operativos y problemas SEO.

## Problema

Se debe definir cómo representar productos con diferencias vendibles relevantes dentro del ERP/POS y la futura tienda online.

La decisión debe resolver:

- cuándo un producto debe tener variantes;
- si cada variante debe tener SKU propio;
- cómo manejar barcode opcional;
- dónde se controla stock;
- cómo se relaciona una variante con precio POS y precio online;
- cómo se relaciona con marca;
- cómo se muestra en tienda;
- cómo se vende en POS;
- cómo se reporta;
- cómo se expone en Storefront API;
- cuándo una variante puede tener página indexable propia.

Si cada variante se maneja como producto totalmente independiente sin relación padre, aparecerán riesgos como:

- catálogo duplicado y difícil de navegar;
- varias páginas SEO casi iguales;
- filtros inconsistentes;
- reportes difíciles de agrupar;
- productos relacionados manualmente;
- mala experiencia para elegir color/tamaño;
- mayor carga de mantenimiento.

Si no se modelan variantes, aparecerán otros riesgos:

- POS vendiendo un producto genérico sin identificar color/tamaño;
- stock descontado incorrectamente;
- picking/despacho con errores;
- barcode sin relación clara;
- Merchant Center inconsistente;
- imposibilidad de mostrar selector de variantes;
- reportes pobres;
- dificultad para manejar precios o disponibilidad por variante.

## Decisión

Se decide que:

1. Se modelará producto padre + variantes cuando un producto tenga diferencias vendibles relevantes.
2. Cada variante vendible debe tener SKU propio obligatorio.
3. Cada variante puede tener barcode propio cuando exista.
4. El barcode será opcional, pero si existe debe ser único.
5. El stock se controlará a nivel de variante vendible.
6. El POS debe vender la variante concreta, no el producto padre genérico.
7. El inventario debe descontar stock de la variante concreta.
8. El precio puede heredarse del producto padre/POS o definirse a nivel de variante, según el modelo final.
9. El precio online podrá tener override por variante cuando aplique, siempre calculado server-side.
10. La marca normalmente pertenece al producto padre y la variante la hereda.
11. La página SEO principal normalmente será la del producto padre con selector de variantes.
12. Solo se crearán páginas indexables por variante si tienen valor SEO real.
13. Se permitirán productos simples sin variantes cuando corresponda.

Decisión central:

> Una variante es la unidad vendible concreta cuando una diferencia de color, tamaño, presentación, medida o diseño afecta la compra, el stock, el precio, el barcode, el despacho o el reporte.

## Modelo conceptual recomendado

### ProductParent

Representa el producto comercial agrupador.

Ejemplo:

```text
Lapicero Faber-Castell 032
```

Puede contener:

- nombre comercial base;
- marca;
- categoría online;
- descripción general;
- slug principal;
- metadata SEO;
- imágenes generales;
- relación con variantes;
- estado de publicación online.

Uso:

- página SEO principal;
- agrupación comercial;
- navegación ecommerce;
- reportes agregados;
- relación con marca.

### ProductVariant

Representa la unidad vendible concreta.

Ejemplo:

```text
Lapicero Faber-Castell 032 Azul
Lapicero Faber-Castell 032 Negro
Lapicero Faber-Castell 032 Rojo
```

Debe tener:

- SKU propio;
- barcode opcional;
- atributos;
- estado activo;
- stock propio;
- precio propio o heredado;
- disponibilidad;
- imagen opcional;
- orden de visualización.

Uso:

- POS;
- inventario;
- venta;
- picking;
- pedido online;
- Merchant Center;
- reportes por variante.

### Brand

La marca se asocia preferentemente al producto padre.

Ejemplo:

```text
ProductParent: Lapicero Faber-Castell 032
Brand: Faber-Castell
Variants: Azul, Negro, Rojo
```

La variante hereda la marca salvo excepción justificada.

### OnlineCatalogSettings

La publicación online puede definirse a nivel de producto padre y/o variante.

Ejemplo:

- producto padre publicado;
- variante azul publicada;
- variante negra publicada;
- variante roja inactiva u oculta.

Esto permite controlar qué opciones aparecen realmente en tienda.

### VariantAttributes

Atributos que diferencian variantes.

Ejemplos:

| Atributo | Ejemplo |
|---|---|
| Color | Azul, negro, rojo |
| Tamaño | A4, A3, oficio |
| Presentación | Unidad, paquete x12 |
| Medida | 1 cm, 2 cm, 5 m |
| Diseño | Unicornio, fútbol, floral |
| Punta | Fina, media, gruesa |
| Material | Plástico, metal, cartón |

Los atributos deben ser estructurados, no solo texto libre, cuando se usen para filtros o selección de variantes.

### Stock por variante

El stock debe asociarse a la variante vendible.

Ejemplo:

```text
Lapicero Faber-Castell 032 Azul: 40 unidades
Lapicero Faber-Castell 032 Negro: 25 unidades
Lapicero Faber-Castell 032 Rojo: 10 unidades
```

No basta con tener stock del producto padre si el cliente compra una variante específica.

### Precio POS y precio online por variante

Regla conceptual:

```text
precioPOSEfectivo = precio definido para variante si existe
precioPOSEfectivo = precio base del producto padre si no existe precio específico

precioOnlineEfectivo = onlinePriceOverride de variante si existe y está activo
precioOnlineEfectivo = precioPOSEfectivo si no existe override online
```

El cálculo final debe hacerse server-side.

### Imagen principal y galería

Las imágenes pueden existir a nivel de producto padre y variante.

Ejemplo:

- producto padre: imagen general del lapicero;
- variante azul: imagen del color azul;
- variante negro: imagen del color negro;
- variante rojo: imagen del color rojo.

Si el color o diseño cambia visualmente, conviene tener imagen por variante.

## Campos mínimos recomendados para variante

| Campo | Propósito |
|---|---|
| `id` | Identificador interno |
| `parentProductId` | Relación con producto padre |
| `sku` | SKU obligatorio y único |
| `barcode` | Código de barras opcional y único si existe |
| `displayName` | Nombre visible de la variante |
| `attributes` | Color, tamaño, medida, presentación, diseño, etc. |
| `active` | Estado operativo |
| `publishedOnline` | Control de visibilidad online si aplica |
| `onlinePriceOverride` | Precio online opcional |
| `mainImage` | Imagen opcional de variante |
| `sortOrder` | Orden de visualización |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos opcionales futuros:

| Campo | Propósito |
|---|---|
| `seoSlug` | Solo si la variante tendrá página propia |
| `seoTitle` | Solo si la variante será indexable |
| `seoDescription` | Solo si la variante será indexable |
| `merchantTitle` | Título específico para Merchant Center |
| `merchantDescription` | Descripción específica para Merchant Center |
| `gtinType` | EAN/UPC si aplica |
| `variantStatus` | Borrador, activa, oculta, descontinuada |

## Reglas de variantes

### Reglas obligatorias

1. No permitir variante sin SKU.
2. No permitir SKU duplicado.
3. No permitir barcode duplicado si existe.
4. No permitir compra de una variante inactiva.
5. No permitir compra de una variante sin stock disponible online.
6. No duplicar producto padre por cada color si pertenecen al mismo producto comercial.
7. No crear variantes si las diferencias no afectan compra, stock, precio, búsqueda, despacho o presentación.
8. Permitir productos simples sin variantes cuando corresponda.
9. La marca normalmente se define en el producto padre y se hereda por variantes.
10. El POS debe vender variante concreta.
11. El inventario debe descontar variante concreta.
12. La Storefront API debe exponer variantes con datos públicos, no internos.
13. No crear páginas indexables por variante sin valor SEO real.
14. No usar variantes como texto libre si afectarán filtros, stock o compra.

## Relación con POS e inventario

### POS

El POS debe vender la variante concreta.

Ejemplo correcto:

```text
Venta POS:
Lapicero Faber-Castell 032 Azul
SKU: LAP-FC032-AZUL
Cantidad: 2
```

Ejemplo incorrecto:

```text
Venta POS:
Lapicero Faber-Castell 032
Cantidad: 2
Color: escrito como nota
```

El segundo caso es riesgoso porque no identifica correctamente qué stock se descuenta.

### Inventario

El inventario debe controlar stock por variante vendible.

Si existe barcode, el barcode debe identificar la variante.

Si no existe barcode, el SKU debe permitir identificarla.

Ejemplo:

```text
Barcode escaneado:
775XXXXAZUL -> Variante Azul

Sin barcode:
SKU LAP-FC032-AZUL -> Variante Azul
```

### Reportes

Los reportes deben poder ver:

- ventas por producto padre;
- ventas por variante;
- stock por producto padre;
- stock por variante;
- rotación por color/tamaño/presentación;
- rentabilidad por producto padre;
- rentabilidad por variante.

Esto es importante para compras futuras y reposición.

## Relación con SEO

### Página padre con selector de variantes

La estrategia principal será usar una página SEO del producto padre:

```text
/productos/lapicero-faber-castell-032
```

Dentro de esa página, el usuario elige:

- color;
- tamaño;
- presentación;
- diseño;
- medida.

Esta estrategia evita crear muchas páginas casi idénticas.

### Páginas separadas por variante

Solo deben existir páginas indexables por variante cuando tengan valor SEO real.

Ejemplos donde podría justificarse:

```text
/productos/lapicero-faber-castell-032-azul
/productos/cartulina-canson-a4-negra
/productos/cinta-satinada-roja-1cm
```

Debe justificarse si:

- la variante tiene búsquedas propias;
- tiene imagen/contenido propio;
- cambia de forma relevante la intención de búsqueda;
- tiene precio/disponibilidad diferenciada;
- no genera contenido duplicado.

### Canonical

Si una variante tiene URL propia pero su contenido es muy parecido al producto padre, debe usarse canonical hacia la página padre o noindex, según política SEO futura.

Regla base:

- producto padre: indexable;
- variantes: no indexables por defecto;
- variante indexable solo con valor SEO real.

### Prevención de contenido duplicado

No crear páginas de variante si solo cambian una palabra y el resto del contenido es igual.

Ejemplo riesgoso:

```text
Lapicero azul
Lapicero rojo
Lapicero negro
```

con la misma descripción y sin contenido diferenciado.

### Schema.org Product / ProductGroup

La página del producto padre debe poder representar variantes. En una fase SEO posterior se definirá si se usa `Product`, `ProductGroup` u otra estructura compatible.

Datos requeridos:

- marca;
- SKU;
- variante;
- precio;
- disponibilidad;
- imagen;
- atributo diferenciador.

### BreadcrumbList

La variante debe integrarse sin romper navegación.

Ejemplo:

```text
Inicio > Útiles escolares > Lapiceros > Lapicero Faber-Castell 032
```

Si la variante tiene página propia:

```text
Inicio > Útiles escolares > Lapiceros > Lapicero Faber-Castell 032 Azul
```

### Imágenes y alt text por variante

Si la variante cambia visualmente, debe poder tener imagen y alt text propios.

Ejemplo:

```text
Alt text:
Lapicero Faber-Castell 032 color azul
```

## Relación con Storefront API/BFF

La Storefront API debe exponer productos y variantes con DTOs públicos separados de los modelos internos.

### Producto padre

Debe exponer:

```text
StorefrontProductDetail
- slug
- name
- brand
- description
- category
- images
- seo
- variants
- defaultVariant
- availabilitySummary
```

### Variante

Debe exponer:

```text
StorefrontVariant
- publicId o variantCode
- sku si se decide mostrar
- barcode solo si se decide exponer
- displayName
- attributes
- price
- availability
- mainImageUrl
- canPurchase
```

El precio debe ser el precio online efectivo calculado server-side.

### Disponibilidad y precio por variante

Cada variante puede tener:

- precio distinto;
- stock distinto;
- disponibilidad distinta;
- imagen distinta;
- estado distinto.

El frontend no debe calcular disponibilidad ni precio final.

### Variante no publicada, inactiva o sin stock

| Caso | Comportamiento |
|---|---|
| Variante no publicada | No aparece en tienda |
| Variante inactiva | No aparece y no se compra |
| Variante sin stock | Puede mostrarse como agotada si el producto padre está publicado, pero no puede comprarse |
| Variante sin precio válido | No puede comprarse |
| Variante sin SKU | No debe existir como vendible |

### Datos internos que no debe exponer

La Storefront API no debe exponer:

- costos;
- márgenes;
- proveedor;
- stock exacto por almacén si no es necesario;
- auditoría;
- IDs internos innecesarios;
- flags técnicos;
- movimientos de inventario;
- datos de compras.

## Relación con Merchant Center

Merchant Center normalmente necesita representar cada opción vendible relevante como item comercial cuando cambia color, talla, presentación, precio, disponibilidad o barcode.

Para variantes:

- cada variante puede ser item del feed;
- cada variante debe tener SKU;
- si tiene barcode/GTIN, debe enviarse;
- debe incluir marca heredada del producto padre;
- debe incluir precio online efectivo;
- debe incluir disponibilidad;
- debe incluir imagen específica si existe.

Ejemplo:

```text
Item 1:
Lapicero Faber-Castell 032 Azul
SKU: LAP-FC032-AZUL
Brand: Faber-Castell
Availability: in_stock

Item 2:
Lapicero Faber-Castell 032 Negro
SKU: LAP-FC032-NEGRO
Brand: Faber-Castell
Availability: in_stock
```

### Variante sin barcode

Una variante sin barcode puede venderse si tiene SKU, pero en Merchant Center debe manejarse con cuidado:

- no inventar GTIN;
- usar marca real si existe;
- usar SKU interno;
- completar título, descripción e imagen de calidad.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Cada variante como producto independiente | Descartada como modelo principal. Simplifica inventario inicialmente, pero duplica catálogo, complica SEO, filtros, reportes y UX. |
| Producto único sin variantes | Descartada cuando las diferencias afectan compra, stock, precio o despacho. Riesgo alto de errores operativos. |
| Variante solo como texto/atributo visual | Descartada. No permite controlar stock, barcode, precio ni reportes correctamente. |
| Producto padre + variantes | Aceptada. Es el modelo más adecuado para ecommerce, POS, inventario, SEO, Merchant Center y reportes. |

## Justificación

### Operación real

El personal necesita identificar exactamente qué se vende, qué se despacha y qué se repone.

### POS

El POS debe escanear barcode o buscar SKU de la variante concreta.

### Inventario

El stock debe descontarse de la variante vendida.

### SEO

La página padre concentra autoridad y evita duplicar contenido. Las variantes solo tendrán página propia si tienen valor real.

### Merchant Center

Cada variante puede representarse correctamente con precio, disponibilidad, marca, SKU y barcode si existe.

### Reportes

El negocio podrá analizar ventas agregadas por producto padre y detalle por variante.

### Mantenibilidad

Evita duplicar productos para representar colores o tamaños del mismo producto comercial.

### Bajo riesgo

Reduce errores de despacho, sobreventa por variante incorrecta y duplicidad SEO.

## Consecuencias positivas

- Mejor control de stock por variante.
- Mejor operación en POS.
- Mejor experiencia ecommerce con selector de variantes.
- Menos duplicidad de páginas SEO.
- Mejor Merchant Center.
- Mejor reportabilidad.
- Mejor relación con marcas.
- Mejor preparación para precios online por variante.
- Mejor preparación para imágenes por variante.
- Menor riesgo de errores de despacho.
- Menor riesgo de catálogo desordenado.

## Consecuencias negativas o costos

- Aumenta complejidad del modelo de catálogo.
- Requiere migraciones futuras.
- Requiere adaptar POS para vender variante concreta si hoy vende producto plano.
- Requiere adaptar inventario para stock por variante.
- Requiere UI de administración de variantes.
- Requiere carga y limpieza de datos.
- Requiere reglas claras para decidir cuándo usar variantes.
- Puede requerir migración gradual de productos existentes.

Estos costos son aceptables porque evitan problemas mayores en ecommerce, inventario, POS, SEO y reportes.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Variantes duplicadas | Validar unicidad por producto padre + atributos relevantes. |
| SKU duplicado | Restricción única global para SKU. |
| Barcode duplicado | Restricción única para barcode cuando exista. |
| Stock mal descontado | POS, ventas e inventario deben operar sobre variante vendible. |
| Producto padre sin variantes bien configuradas | Validaciones antes de publicar online o vender variantes. |
| Páginas SEO duplicadas | Variante no indexable por defecto; página propia solo con valor SEO real. |
| Merchant Center inconsistente | Feed debe usar variante, marca heredada, SKU, precio y disponibilidad correctos. |
| POS vendiendo producto padre en vez de variante | Regla obligatoria: producto padre no debe ser unidad vendible si tiene variantes. |
| Variantes innecesarias | Crear variantes solo si afectan compra, stock, precio, búsqueda, despacho o presentación. |
| Variantes sin barcode mal identificadas | SKU obligatorio y visualización clara en POS/picking. |
| Migración desde producto plano actual genera inconsistencias | Planificar migración gradual y mantener compatibilidad para productos simples. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad de variantes.
2. Variante vendible requiere SKU.
3. Barcode es opcional, pero único si existe.
4. Stock se controla a nivel de variante vendible.
5. POS vende variante concreta.
6. Inventario descuenta variante concreta.
7. Storefront API expone DTOs públicos.
8. No duplicar productos padre para representar colores o tamaños del mismo producto.
9. No crear páginas indexables por variante sin valor SEO real.
10. La marca se asocia normalmente al producto padre.
11. La variante hereda marca del producto padre salvo excepción justificada.
12. Producto padre con variantes no debe venderse directamente como unidad genérica.
13. Variante inactiva no puede venderse.
14. Variante sin stock disponible online no puede comprarse online.
15. El frontend no calcula precio ni disponibilidad final.
16. Merchant Center debe representar variantes vendibles de forma consistente.
17. Los productos simples sin variantes siguen permitidos.
18. La migración desde productos planos existentes debe ser gradual y controlada.

## Impacto técnico

### Catálogo backend

Se requerirá modelar producto padre y variante, o adaptar el modelo actual para soportar esa distinción.

### Inventario

El stock debe asociarse a la variante vendible.

### POS

Debe buscar y vender variantes por SKU, barcode o nombre.

### Ventas

Los ítems de venta deben referenciar la variante vendida cuando aplique.

### Frontend Angular interno

Se necesitará futura UI para:

- crear producto padre;
- crear variantes;
- definir atributos;
- asignar SKU;
- asignar barcode;
- gestionar estado;
- configurar publicación online;
- ordenar variantes.

### Storefront API

Debe exponer producto padre con lista de variantes públicas.

### Next.js futuro

Debe renderizar página de producto padre con selector de variantes.

### SEO

Debe manejar canonical, variantes no indexables por defecto y páginas de variante solo cuando aplique.

### Merchant Center

Debe generar items por variante vendible cuando corresponda.

### Reportes

Deben permitir análisis por producto padre y variante.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba modelar producto padre + variantes cuando existan diferencias vendibles relevantes.
2. Se aprueba que cada variante vendible requiere SKU obligatorio.
3. Se aprueba que barcode es opcional, pero único si existe.
4. Se aprueba que stock se controla a nivel de variante vendible.
5. Se aprueba que POS debe vender variante concreta.
6. Se aprueba que inventario debe descontar variante concreta.
7. Se aprueba que la marca se asocia preferentemente al producto padre.
8. Se aprueba que variante hereda marca del producto padre salvo excepción.
9. Se aprueba que la página SEO principal normalmente será el producto padre.
10. Se aprueba que páginas indexables por variante solo se crearán si tienen valor SEO real.
11. Se aprueba que productos simples sin variantes siguen permitidos.
12. Se aprueba que la Storefront API expondrá variantes mediante DTOs públicos.
13. Se aprueba que Merchant Center futuro podrá tratar variantes como items comerciales.
14. Se aprueba que producto padre con variantes no debe venderse como unidad genérica.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar código;
- crear migraciones;
- crear endpoints;
- crear UI de variantes;
- modificar productos actuales;
- tocar DB/Flyway;
- tocar AWS/staging;
- implementar Merchant Center;
- crear tienda Next.js;
- modificar POS;
- modificar ventas;
- modificar inventario;
- cargar variantes reales masivamente;
- crear páginas públicas por variante;
- cambiar estructura de reportes.

## Decisión resultante

InkToy modelará productos con diferencias vendibles relevantes usando producto padre + variantes.

La variante será la unidad vendible concreta para POS, inventario, ventas, pedidos online, Storefront API y Merchant Center futuro. Cada variante tendrá SKU obligatorio y barcode opcional. El stock se controlará a nivel de variante vendible. La marca se asociará normalmente al producto padre y será heredada por sus variantes.

La página SEO principal será normalmente la del producto padre con selector de variantes. Las páginas indexables por variante solo se crearán cuando exista valor SEO real. Los productos simples sin variantes seguirán siendo válidos cuando no existan diferencias relevantes de compra, stock, precio, despacho o presentación.

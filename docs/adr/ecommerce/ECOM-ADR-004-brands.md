# ADR-004 — Marcas para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS es el sistema fuente de verdad para la operación del negocio: catálogo interno, precios, stock, ventas, facturación y administración. La futura tienda online será SEO-first, estará en `inktoy.pe`, consumirá datos mediante Storefront API/BFF y no deberá duplicar catálogo, precios ni stock fuera del ERP/POS.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.

El ADR-003 estableció que no todo producto activo del ERP/POS será publicado online, que la tienda solo consumirá productos publicados mediante Storefront API/BFF y que el catálogo online debe tener reglas claras de publicación, SEO, precio online efectivo y validación server-side.

En el rubro de papelería, útiles escolares, artículos escolares y pasamanería, las marcas son relevantes para:

- búsqueda del cliente;
- filtros de tienda;
- confianza en el producto;
- SEO;
- Merchant Center;
- organización del catálogo;
- reportes comerciales;
- futuras promociones;
- futuras listas escolares.

Ejemplos de marcas relevantes podrían ser Faber-Castell, Artesco, Standford, Pilot, Vinifan, Layconsa u otras marcas propias del rubro. La marca no debe manejarse como texto libre disperso dentro del nombre del producto, porque eso genera duplicados, errores de escritura, filtros inconsistentes y problemas para SEO/feed.

## Problema

Se debe definir cómo se modelarán y administrarán las marcas dentro del ERP/POS para que puedan usarse correctamente en ecommerce.

La decisión debe resolver:

- si marca será una entidad formal o solo texto libre;
- cómo se asociará una marca a productos o productos padre;
- qué hacer con productos sin marca;
- cómo se expondrán marcas en Storefront API/BFF;
- cómo se usarán en SEO;
- cómo se usarán en Merchant Center;
- cómo evitar duplicados;
- cómo evitar páginas públicas pobres;
- cómo mantener consistencia entre ERP, tienda, feed, filtros y reportes.

Si la marca se maneja como texto libre, pueden aparecer problemas como:

- “Faber Castell”, “Faber-Castell”, “FABER CASTELL” como marcas distintas;
- filtros duplicados en tienda;
- páginas SEO inconsistentes;
- errores en Merchant Center;
- mala calidad de reportes;
- dificultad para promociones futuras por marca;
- problemas al agrupar productos relacionados.

Si se ignoran las marcas en ecommerce, se pierde valor en:

- búsqueda orgánica;
- navegación;
- filtros;
- confianza del cliente;
- rich data;
- feed de productos;
- campañas comerciales.

## Decisión

Se decide que:

1. La marca debe modelarse como entidad formal dentro del ERP/POS.
2. El ERP/POS será la fuente de verdad de marcas.
3. Los productos o productos padre deberán asociarse a una marca cuando aplique.
4. Se permitirán productos sin marca solo bajo una regla explícita.
5. Si el producto tiene marca reconocible, debe registrarse formalmente.
6. Las marcas podrán usarse para:
   - filtros;
   - SEO;
   - Merchant Center;
   - navegación;
   - reportes;
   - promociones futuras;
   - páginas públicas de marca.
7. La Storefront API/BFF solo debe exponer marcas activas y publicables cuando corresponda.
8. No se usará texto libre como mecanismo principal de marca en productos publicados online.
9. Las páginas públicas de marca solo deberán indexarse si tienen contenido mínimo y productos publicados asociados.

Decisión central:

> Las marcas serán entidades formales administradas desde el ERP/POS. No se manejarán como texto libre en productos publicados online.

## Modelo conceptual recomendado

### Brand

Entidad formal que representa una marca comercial.

Debe permitir:

- normalización;
- activación/desactivación;
- publicación online;
- slug;
- metadata SEO;
- logo opcional;
- descripción;
- relación con productos.

Uso principal:

- catálogo interno;
- catálogo online;
- filtros;
- páginas de marca;
- Merchant Center;
- reportes;
- promociones futuras.

### Producto interno

El producto interno puede asociarse a una marca cuando aplique.

Ejemplo:

```text
Producto interno:
Lapicero Faber-Castell 032 Azul

Marca:
Faber-Castell
```

La marca no debe depender únicamente de que el nombre del producto la contenga.

### Producto publicado online

El producto publicado online debe exponer la marca de forma controlada si existe.

Ejemplo:

```text
Producto publicado:
Lapicero Faber-Castell 032

Marca pública:
Faber-Castell
```

La marca puede aparecer en:

- ficha de producto;
- breadcrumbs;
- filtros;
- páginas relacionadas;
- schema.org Product;
- Merchant Center.

### Producto padre

Cuando existan variantes, la marca normalmente debe estar asociada al producto padre.

Ejemplo:

```text
Producto padre:
Lapicero Faber-Castell 032

Marca:
Faber-Castell

Variantes:
- Azul
- Negro
- Rojo
```

La variante hereda la marca del producto padre salvo caso excepcional.

### Variante

La variante no debería redefinir la marca salvo una necesidad muy específica. En la mayoría de casos:

```text
Variante = color/tamaño/presentación
Marca = propiedad del producto padre
```

Esto evita inconsistencias entre variantes del mismo producto.

### Categoría online

Las marcas se relacionan con categorías online para:

- filtros por marca dentro de categoría;
- páginas como “Lapiceros Faber-Castell”;
- interlinking SEO;
- campañas.

Ejemplo:

```text
/categorias/lapiceros?marca=faber-castell
```

Los filtros indexables se definirán en ADR SEO posterior. Por defecto, no todos los filtros deben ser indexados.

### Metadata SEO de marca

Una marca publicable puede tener:

- slug;
- título SEO;
- descripción SEO;
- descripción pública;
- logo;
- canonical;
- estado de indexación.

### Página pública de marca

Ejemplo:

```text
/marcas/faber-castell
```

La página pública de marca debe mostrar:

- nombre de marca;
- descripción útil;
- productos publicados de esa marca;
- categorías principales asociadas;
- enlaces internos;
- metadata SEO;
- canonical.

No se debe publicar o indexar una página de marca sin contenido útil.

## Campos mínimos recomendados para marca

| Campo | Propósito |
|---|---|
| `id` | Identificador interno |
| `name` | Nombre oficial de la marca |
| `normalizedName` | Nombre normalizado para evitar duplicados |
| `slug` | URL pública limpia |
| `description` | Descripción pública o interna |
| `seoTitle` | Título SEO |
| `seoDescription` | Meta description |
| `logoUrl` | Logo opcional |
| `active` | Indica si la marca está activa en el ERP |
| `publishedOnline` o `visibility` | Controla si la marca puede tener exposición pública |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos opcionales futuros:

| Campo | Propósito |
|---|---|
| `canonicalUrl` | Control SEO avanzado |
| `noindex` | Evitar indexación de marcas pobres o internas |
| `sortOrder` | Orden de visualización |
| `createdBy` / `updatedBy` | Auditoría de usuario |
| `logoAltText` | SEO/accesibilidad de logo |

## Reglas de marca

### Reglas obligatorias

1. No permitir marcas duplicadas por nombre normalizado.
2. No permitir slug duplicado en marcas publicables.
3. No publicar página de marca sin contenido mínimo.
4. No asociar productos online a marcas inactivas.
5. Permitir productos sin marca solo si el rubro/producto lo justifica.
6. Si el producto tiene marca reconocible, debe registrarse formalmente.
7. No usar texto libre como fuente principal de marca en productos publicados online.
8. No exponer marcas internas inactivas en Storefront API.
9. Una marca inactiva no debe usarse para nuevos productos publicados online.
10. Si una marca se desactiva, debe definirse qué pasa con sus productos publicados antes de ocultar páginas públicas.

### Productos sin marca

Se permitirán productos sin marca cuando aplique, por ejemplo:

- productos genéricos;
- productos artesanales;
- insumos sin marca comercial;
- pasamanería sin fabricante identificable;
- productos vendidos por medida;
- productos propios sin marca formal todavía.

Pero deben cumplir:

- SKU obligatorio;
- categoría online;
- imagen;
- descripción clara;
- metadata SEO;
- precio válido;
- reglas de publicación online.

Para Merchant Center y SEO, los productos sin marca deben manejarse con cuidado para no generar datos pobres o inconsistentes.

## Relación con SEO

Las marcas tienen valor SEO si se gestionan con contenido real y estructura limpia.

### Páginas de marca

URL recomendada:

```text
/marcas/faber-castell
```

La página debe existir solo si la marca está activa y tiene productos publicados o contenido suficiente.

Debe incluir:

- nombre de marca;
- descripción útil;
- productos publicados;
- categorías asociadas;
- enlaces internos;
- metadata única;
- canonical.

### Metadata única

Cada marca publicable debe tener:

- `seoTitle`;
- `seoDescription`;
- descripción pública;
- slug único.

No se deben generar páginas de marca vacías o con descripciones genéricas.

### Canonical

La página de marca debe tener canonical propio.

Ejemplo:

```text
https://inktoy.pe/marcas/faber-castell
```

### BreadcrumbList

La página de marca y los productos asociados deben poder integrarse en breadcrumbs.

Ejemplo para producto:

```text
Inicio > Marcas > Faber-Castell > Lapicero Faber-Castell 032
```

O bien:

```text
Inicio > Útiles escolares > Lapiceros > Lapicero Faber-Castell 032
```

La estrategia exacta puede definirse en ADR SEO, pero la marca debe estar disponible para construir interlinking.

### Interlinking

La marca debe permitir enlaces entre:

- página de marca;
- productos;
- categorías;
- futuras guías escolares;
- futuras listas escolares;
- promociones por marca.

### Prevención de páginas pobres

No se debe indexar una página de marca si:

- no tiene productos publicados;
- no tiene descripción útil;
- no tiene metadata;
- contiene solo una lista vacía;
- se creó solo por tener una entidad interna.

Se podrá usar `noindex` o no exponerla públicamente hasta que cumpla condiciones.

## Relación con Merchant Center

Merchant Center requiere datos consistentes de producto, y la marca es importante para clasificar productos, especialmente cuando existe código de barras/GTIN.

La marca debe ser consistente entre:

- ERP/POS;
- Storefront API;
- tienda pública;
- feed Merchant Center;
- facturación/reportes cuando aplique.

### Relación con barcode/GTIN

Si el producto o variante tiene barcode/GTIN, la marca debe coincidir con la marca comercial real del producto.

Ejemplo:

```text
Marca: Faber-Castell
Barcode/GTIN: código asociado al producto real
```

### Productos sin marca

Para productos sin marca:

- no inventar marca;
- no usar texto falso como marca;
- definir política de feed futuro;
- usar datos descriptivos de calidad;
- mantener SKU interno.

### Riesgo principal

Si la marca en Merchant Center no coincide con la tienda o el ERP, pueden aparecer errores de feed, baja calidad de datos o rechazos futuros.

## Relación con Storefront API/BFF

La Storefront API debe exponer solo información pública de marcas.

### Listado de marcas públicas

Ejemplo conceptual:

```text
GET /api/v1/storefront/brands
```

Debe exponer:

```text
StorefrontBrandListItem
- slug
- name
- logoUrl opcional
- description breve opcional
```

No debe exponer:

- IDs internos innecesarios;
- auditoría;
- flags internos;
- marcas inactivas;
- marcas no publicables.

### Detalle de marca por slug

Ejemplo conceptual:

```text
GET /api/v1/storefront/brands/{slug}
```

Debe exponer:

```text
StorefrontBrandDetail
- slug
- name
- description
- seoTitle
- seoDescription
- logoUrl
- products publicados asociados
- canonicalUrl
```

### Productos publicados asociados a una marca

La API podrá permitir:

```text
GET /api/v1/storefront/products?brand=faber-castell
```

o resolverlo desde el detalle de marca.

Debe devolver solo productos:

- publicados online;
- activos;
- con datos mínimos;
- permitidos por reglas de catálogo online;
- filtrados por disponibilidad según política futura.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Marca como texto libre en producto | Descartada. Genera duplicados, errores de escritura, filtros inconsistentes y mala calidad de feed. |
| Marca dentro del nombre del producto | Descartada como fuente principal. Puede aparecer en el nombre comercial, pero no reemplaza una entidad formal. |
| No modelar marcas al inicio | Descartada. En papelería y útiles escolares, marca es clave para búsqueda, filtros, SEO y Merchant Center. |
| Modelar marca como entidad formal | Aceptada. Permite consistencia, SEO, filtros, reportes, feed y promociones futuras. |

## Justificación

### SEO

Las marcas permiten páginas indexables, navegación temática, interlinking y búsquedas específicas como “lapiceros Faber-Castell” o “útiles escolares Artesco”.

### Operación real

El equipo necesita administrar marcas de forma consistente para productos, reportes y futuras promociones.

### Filtros

Los filtros por marca son fundamentales en ecommerce de papelería, porque los clientes reconocen y comparan productos por marca.

### Merchant Center

La marca mejora la calidad del feed y se relaciona con barcode/GTIN cuando exista.

### Mantenibilidad

Una entidad formal evita duplicados y errores de escritura.

### Calidad de catálogo

Permite limpiar y normalizar productos, evitando nombres sobrecargados o inconsistentes.

## Consecuencias positivas

- Marcas consistentes en ERP, tienda y feed futuro.
- Mejor SEO por páginas de marca.
- Mejores filtros en tienda.
- Mejor calidad de catálogo.
- Menos duplicados.
- Mejor soporte para Merchant Center.
- Mejor base para promociones futuras por marca.
- Mejor reportabilidad comercial.
- Mejor navegación del cliente.
- Preparación para interlinking entre marcas, categorías y productos.

## Consecuencias negativas o costos

- Se agrega una entidad nueva al catálogo.
- Se requiere limpieza inicial de marcas.
- Se necesitará UI interna para administrar marcas.
- Se deberán definir validaciones de duplicados.
- Algunas marcas requerirán contenido SEO mínimo.
- Habrá que decidir qué hacer con productos genéricos o sin marca.
- Se requerirá disciplina para evitar crear marcas duplicadas o pobres.

Estos costos son aceptables porque reducen problemas mayores de SEO, feed, filtros y operación.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Marcas duplicadas | Normalización de nombre y restricción de unicidad. |
| Slugs duplicados | Slug único para marcas publicables. |
| Páginas de marca pobres | No publicar o usar noindex hasta tener contenido mínimo. |
| Productos mal asociados | Validaciones y revisión antes de publicar online. |
| Productos sin marca mal clasificados | Política explícita para productos genéricos o sin marca. |
| Inconsistencia entre feed, tienda y ERP | ERP/POS como fuente de verdad y Storefront API con DTOs públicos. |
| Contenido SEO genérico | Revisión humana de descripciones y metadata. |
| Marca inactiva expuesta | Storefront API solo expone marcas activas/publicables. |
| Uso de marca dentro del nombre como sustituto | Prohibir texto libre como fuente principal de marca. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad de marcas.
2. No usar texto libre para marcas en productos publicados online.
3. No duplicar marcas por nombre normalizado.
4. No publicar páginas de marca sin contenido mínimo.
5. No exponer marcas internas inactivas en Storefront API.
6. No asociar productos publicados online a marcas inactivas.
7. Si un producto tiene marca reconocible, debe registrarse formalmente.
8. Se permiten productos sin marca solo bajo política explícita.
9. La marca debe poder usarse en Storefront API, SEO, filtros y Merchant Center futuro.
10. Storefront API debe usar DTOs públicos y no exponer auditoría o datos internos.
11. La marca dentro del nombre del producto no reemplaza la relación formal con Brand.
12. Las páginas de marca deben tener slug único y canonical.

## Impacto técnico

### Catálogo backend

Se requerirá una entidad o agregado relacionado a `Brand`, con reglas de unicidad y estado.

### Frontend Angular interno

Se necesitará una futura pantalla o sección para:

- crear marcas;
- editar marcas;
- activar/desactivar;
- definir slug;
- definir descripción;
- definir metadata SEO;
- asignar logo opcional;
- controlar publicación online.

### Storefront API

Deberá exponer:

- listado de marcas públicas;
- detalle de marca por slug;
- productos publicados asociados a una marca.

### Next.js futuro

Usará marcas para:

- páginas `/marcas/{slug}`;
- filtros;
- metadata;
- breadcrumbs;
- interlinking;
- productos relacionados.

### SEO

Las marcas habilitan:

- páginas de marca;
- titles y meta descriptions específicos;
- canonical;
- breadcrumbs;
- enlazado interno;
- futuras guías por marca.

### Merchant Center

La marca será relevante para feed, especialmente junto con barcode/GTIN.

### Reportes

A futuro permitirá reportes por marca:

- ventas por marca;
- productos más vendidos por marca;
- rentabilidad por marca;
- stock por marca;
- campañas por marca.

### Variantes futuras

La marca normalmente se asociará al producto padre y será heredada por variantes.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba modelar marca como entidad formal.
2. Se aprueba que ERP/POS será fuente de verdad de marcas.
3. Se aprueba que no se usará texto libre como fuente principal de marca.
4. Se aprueba que productos o productos padre podrán asociarse a una marca cuando aplique.
5. Se aprueba que productos sin marca solo se permitirán bajo regla explícita.
6. Se aprueba que marcas tendrán slug único para uso público.
7. Se aprueba que marcas publicables tendrán metadata SEO mínima.
8. Se aprueba que no se publicarán páginas de marca sin contenido mínimo.
9. Se aprueba que Storefront API solo expondrá marcas activas/publicables.
10. Se aprueba que las marcas serán usadas para filtros, SEO, Merchant Center y navegación.
11. Se aprueba que una marca inactiva no podrá asociarse a nuevos productos publicados online.
12. Se aprueba que la marca se relacionará preferentemente con producto padre cuando existan variantes.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar código;
- crear migraciones;
- crear endpoints;
- crear UI de marcas;
- modificar productos actuales;
- tocar DB/Flyway;
- tocar AWS/staging;
- implementar Merchant Center;
- crear tienda Next.js;
- crear páginas públicas de marca;
- cargar marcas reales masivamente;
- modificar POS;
- modificar inventario;
- modificar ventas;
- modificar facturación.

## Decisión resultante

InkToy modelará las marcas como entidades formales administradas desde el ERP/POS. Las marcas no se manejarán como texto libre en productos publicados online.

Los productos o productos padre se asociarán a una marca cuando aplique. Los productos sin marca estarán permitidos solo bajo una política explícita para productos genéricos, artesanales, pasamanería sin fabricante identificable o productos similares.

Las marcas podrán usarse para filtros, navegación, SEO, Merchant Center futuro, reportes, promociones y páginas públicas como `/marcas/faber-castell`, siempre que tengan contenido mínimo y estén activas/publicables.

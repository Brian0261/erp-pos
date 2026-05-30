# ADR-007 — Imágenes y assets de producto para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, ventas, pedidos, facturación y operación interna. La futura tienda pública vivirá en `inktoy.pe`, será desarrollada con Next.js y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.

Los ADRs previos establecieron que:

- el catálogo online se gestiona desde el ERP/POS;
- la tienda solo consume productos publicados mediante Storefront API/BFF;
- no se debe duplicar catálogo, precios ni stock;
- las marcas serán entidades formales;
- los productos con diferencias vendibles relevantes usarán producto padre + variantes;
- las variantes podrán tener imagen propia cuando cambien visualmente;
- las URLs públicas usarán slugs limpios y estables;
- las variantes no serán indexables por defecto, salvo que tengan valor SEO real.

Las imágenes son críticas en ecommerce porque afectan conversión, SEO, confianza, experiencia de usuario, Merchant Center, Core Web Vitals y operación de despacho. En InkToy, las fotos iniciales serán del proveedor y cuentan con permiso formal de uso, pero aun así deben administrarse de forma controlada para evitar problemas de calidad, rendimiento, derechos, duplicidad o falta de contexto.

## Problema

Se debe definir cómo modelar, administrar, optimizar y exponer las imágenes y assets de producto dentro del ERP/POS para la futura tienda online.

La decisión debe resolver:

- si las imágenes serán simples URLs o entidades formales;
- cómo asociar imágenes a producto padre, variante o marca;
- qué imagen será principal;
- cómo manejar galería;
- cómo registrar fuente y derechos de uso;
- cómo definir alt text;
- cómo preparar optimización WebP/AVIF, responsive images y CDN;
- qué debe exponer Storefront API/BFF;
- qué debe consumir Next.js;
- cómo evitar imágenes rotas, pesadas o sin contexto;
- cómo mantener consistencia con Merchant Center.

Si se manejan imágenes como simples URLs dentro del producto, aparecen riesgos como:

- no saber si la imagen tiene permiso de uso;
- no diferenciar imagen principal, galería o imagen de variante;
- no tener alt text;
- no conocer tamaño, formato o peso;
- no poder optimizar correctamente;
- no poder ordenar imágenes;
- exponer imágenes internas o inactivas;
- romper Core Web Vitals;
- generar mala experiencia en tienda y Merchant Center.

## Decisión

Se decide que las imágenes y assets de producto deben modelarse como una entidad o configuración formal dentro del ERP/POS, asociada a producto padre, variante o marca según corresponda.

Decisiones principales:

1. ERP/POS será la fuente de verdad de assets de producto.
2. Todo producto publicado online debe tener imagen principal.
3. Se permitirá galería de imágenes por producto.
4. Se permitirá imagen específica por variante cuando cambie visualmente por color, diseño, tamaño, presentación o empaque.
5. Se permitirá logo de marca como asset separado cuando aplique.
6. Cada asset debe registrar fuente: proveedor, propia, generada u otra.
7. Cada asset público debe tener derechos de uso confirmados.
8. Cada asset público debe tener alt text descriptivo.
9. La Storefront API debe exponer solo assets públicos, activos y aptos para la tienda.
10. Next.js no administrará el catálogo maestro de imágenes.
11. La optimización con WebP/AVIF, tamaños responsivos, caché y CDN debe quedar preparada para fases futuras.

Decisión central:

> Las imágenes de productos no serán simples URLs decorativas. Serán assets administrados desde el ERP/POS, con fuente, derechos, alt text, visibilidad, relación con producto/variante/marca y preparación para optimización SEO y rendimiento.

## Modelo conceptual recomendado

### ProductAsset / ProductImage

Entidad formal que representa un asset visual asociado al catálogo.

Puede asociarse a:

- producto padre;
- variante;
- marca;
- categoría online en fases futuras;
- guías/listas escolares en fases futuras.

Uso principal:

- imagen principal de producto;
- galería de producto;
- imagen específica de variante;
- logo de marca;
- imagen para Open Graph;
- imagen para Merchant Center;
- futuras imágenes editoriales.

### Imagen principal

Es la imagen primaria del producto publicado online.

Debe usarse en:

- listados de producto;
- detalle de producto;
- sitemap/feed futuro;
- Merchant Center;
- schema.org Product;
- Open Graph cuando aplique.

Un producto publicado online no debe quedar sin imagen principal.

### Galería

Conjunto de imágenes adicionales para el detalle de producto.

Puede incluir:

- diferentes ángulos;
- empaque;
- presentación;
- uso referencial;
- comparativas de tamaño;
- variantes visibles.

### Imagen de variante

Imagen asociada a una variante específica.

Ejemplo:

```text
Producto padre:
Lapicero Faber-Castell 032

Variantes:
- Azul -> imagen del lapicero azul
- Negro -> imagen del lapicero negro
- Rojo -> imagen del lapicero rojo
```

Si una variante cambia visualmente, debe poder tener imagen propia. Si no existe, puede usar fallback de imagen del producto padre.

### Logo de marca

Asset opcional asociado a una marca formal.

Uso:

- página pública de marca;
- filtros visuales si se decide;
- navegación;
- futuras campañas;
- contenido editorial.

El logo también debe tener derechos confirmados y alt text.

### Fuente del asset

Debe registrarse el origen:

```text
SUPPLIER
OWN
GENERATED
OTHER
```

Para InkToy, las imágenes iniciales serán de proveedor con permiso formal de uso. Esa autorización debe quedar registrada como `rightsConfirmed = true` o equivalente.

### Derechos/permiso de uso

Un asset público debe registrar si se tiene permiso para usarlo en la tienda.

No debe exponerse públicamente si los derechos no están confirmados.

### Alt text

El alt text debe describir el producto de forma útil, no ser una repetición genérica.

Ejemplo correcto:

```text
Lapicero Faber-Castell 032 color azul
```

Ejemplo pobre:

```text
imagen producto
```

### Orden de visualización

Debe existir `sortOrder` para controlar el orden de la galería y de imágenes por variante.

### Estado/visibilidad

Un asset puede estar activo, inactivo, interno o público.

Solo assets activos y públicos deben exponerse por Storefront API.

## Campos mínimos recomendados

| Campo | Propósito |
|---|---|
| `id` | Identificador interno |
| `productId` o `parentProductId` | Asociación con producto padre |
| `variantId` | Asociación opcional con variante |
| `brandId` | Asociación opcional con marca/logo |
| `assetType` | Tipo: `main`, `gallery`, `variant`, `brandLogo`, `ogImage`, etc. |
| `url` o `storageKey` | Ubicación del asset |
| `altText` | Texto alternativo |
| `source` | `supplier`, `own`, `generated`, `other` |
| `rightsConfirmed` | Confirmación de permiso de uso |
| `mimeType` | Tipo de archivo |
| `width` | Ancho en píxeles |
| `height` | Alto en píxeles |
| `sizeBytes` | Peso del archivo |
| `sortOrder` | Orden de visualización |
| `active` | Estado operativo |
| `publicVisible` | Si puede exponerse en Storefront API |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos opcionales futuros:

| Campo | Propósito |
|---|---|
| `optimizedUrl` | URL optimizada |
| `webpUrl` | Versión WebP |
| `avifUrl` | Versión AVIF |
| `thumbnailUrl` | Miniatura |
| `cdnUrl` | URL final en CDN |
| `dominantColor` | UX de carga o placeholders |
| `checksum` | Detección de duplicados |
| `uploadedBy` | Auditoría |
| `rightsNotes` | Detalle del permiso |
| `expiresAt` | Vencimiento si el permiso fuera temporal |

## Reglas de imágenes y assets

### Reglas obligatorias

1. No publicar producto online sin imagen principal.
2. No exponer asset público sin derechos confirmados.
3. No publicar imagen sin alt text mínimo.
4. No exponer imágenes internas o inactivas.
5. No usar imágenes demasiado pesadas sin plan de optimización.
6. Si una variante cambia visualmente, debe poder tener imagen propia.
7. Si una variante no tiene imagen, puede usar fallback del producto padre.
8. No duplicar assets innecesariamente.
9. No usar imágenes rotas o inaccesibles.
10. No exponer rutas internas de almacenamiento si no son públicas.
11. No depender de Next.js como fuente de verdad de assets.
12. No publicar imágenes de proveedor sin permiso formal registrado.

## Relación con SEO

Las imágenes deben apoyar el posicionamiento y la comprensión del producto.

### Alt text descriptivo

Debe incluir información útil:

- tipo de producto;
- marca;
- modelo;
- variante visual si aplica;
- color, tamaño o presentación si corresponde.

Ejemplos:

```text
Cuaderno cuadriculado Justus A4 de 100 hojas
Lapicero Faber-Castell 032 color negro
Cinta satinada roja de 1 cm para manualidades
```

### Nombres de archivo o storage keys

Cuando sea posible, conviene usar nombres legibles o storage keys organizadas.

Ejemplo:

```text
products/lapicero-faber-castell-032/azul/main.webp
brands/faber-castell/logo.webp
```

No es obligatorio que la URL final contenga todos los keywords, pero debe evitar nombres completamente opacos si la infraestructura lo permite.

### Open Graph

Cada producto o marca importante debe poder definir imagen para compartir en redes o mensajería.

Puede usarse la imagen principal como fallback.

### Schema.org Product image

El detalle de producto debe poder generar `image` en schema.org Product usando la imagen principal pública.

### Sitemap de imágenes

No es obligatorio al inicio, pero el modelo debe permitir un futuro sitemap de imágenes si aporta valor.

### Prevención de imágenes rotas

La Storefront API no debe exponer assets inválidos, inactivos o sin URL pública funcional.

## Relación con Core Web Vitals y rendimiento

Las imágenes impactan directamente en rendimiento, LCP, CLS y experiencia mobile.

Reglas de rendimiento:

1. Preparar transformación a WebP/AVIF.
2. Preparar tamaños responsivos.
3. Usar lazy loading para imágenes no críticas.
4. Priorizar imagen principal del producto cuando sea LCP.
5. Definir dimensiones `width` y `height` para evitar layout shift.
6. Evitar subir imágenes gigantes del proveedor sin procesamiento.
7. Preparar caché y CDN en fases futuras.
8. Evitar cargar galería completa en tamaños originales.
9. Usar miniaturas en listados.
10. Usar imagen optimizada en detalle.

La implementación exacta de CDN/procesamiento se definirá después, pero el modelo debe guardar metadata suficiente para soportarla.

## Relación con variantes

Una variante debe poder tener imagen propia cuando el cliente necesita ver la diferencia.

Casos típicos:

- color diferente;
- diseño diferente;
- tamaño visible distinto;
- presentación distinta;
- empaque diferente;
- material diferente.

Ejemplo:

```text
Variante Azul -> imagen azul
Variante Negro -> imagen negro
Variante Rojo -> imagen rojo
```

Si no existe imagen específica de variante:

- usar imagen principal del producto padre;
- indicar claramente la variante por texto/atributo;
- evitar engañar al cliente si la diferencia visual es importante.

En selector de variantes, se podrá usar:

- color swatch;
- miniatura;
- nombre textual;
- combinación según tipo de producto.

## Relación con marcas

El logo de marca es opcional, no obligatorio para iniciar ecommerce.

Si se usa logo:

- debe tener derechos confirmados;
- debe tener alt text;
- debe estar activo;
- debe exponerse solo si la marca está activa/publicable;
- debe poder mostrarse en página pública de marca.

Ejemplo de alt text:

```text
Logo de Faber-Castell
```

No se deben publicar logos sin permiso o de mala calidad.

## Relación con Storefront API/BFF

La Storefront API debe exponer DTOs públicos de assets.

### En listado de productos

Debe exponer imagen principal optimizada o apta para tienda:

```text
StorefrontProductListItem
- slug
- name
- mainImage {
    url
    altText
    width
    height
  }
```

No debe exponer:

- storage interno sensible;
- rutas privadas;
- datos de auditoría;
- flags internos;
- assets inactivos;
- assets sin derechos confirmados.

### En detalle de producto

Debe exponer:

```text
StorefrontProductDetail
- images [
    {
      url
      altText
      width
      height
      type
      sortOrder
    }
  ]
- variants [
    {
      variantCode
      displayName
      image {
        url
        altText
        width
        height
      }
    }
  ]
```

### Imágenes por variante

Debe permitir que cada variante tenga imagen propia o fallback.

La API puede exponer explícitamente:

```text
variant.image = imagen propia si existe
variant.imageFallback = imagen principal del producto si no existe
```

o resolverlo internamente y exponer una sola imagen efectiva.

### URLs públicas y CDN

La API debe exponer URLs públicas aptas para consumo por Next.js. En fases futuras, esas URLs podrán apuntar a CDN.

## Relación con Next.js

Next.js debe consumir las imágenes desde Storefront API/BFF, no administrar el catálogo maestro.

Debe soportar:

- imagen optimizada en listados;
- galería en detalle;
- imagen por variante;
- imagen Open Graph;
- SSR/SSG/ISR;
- revalidación cuando cambian imágenes;
- metadata social;
- dimensiones para evitar layout shift.

El uso de `next/image` o estrategia equivalente se definirá en implementación, pero este ADR exige que el modelo entregue la metadata necesaria:

- URL;
- alt text;
- width;
- height;
- tipo;
- orden.

Cuando cambie una imagen principal o galería:

- se debe revalidar la página correspondiente;
- se debe actualizar metadata social si aplica;
- se debe actualizar Merchant Center en fase futura.

## Relación con Merchant Center

Merchant Center requiere imágenes claras y consistentes con la tienda.

Reglas futuras:

1. Producto publicado debe tener imagen principal.
2. Variante con diferencia visual debe poder enviar imagen específica.
3. La imagen del feed debe coincidir con la imagen visible en tienda.
4. No enviar imágenes rotas.
5. No enviar imágenes sin permiso.
6. No enviar imágenes de baja calidad si afectan aprobación o rendimiento.
7. No inventar imágenes para variantes.
8. Mantener consistencia entre ERP, Storefront API, Next.js y feed.

Ejemplo:

```text
Lapicero Faber-Castell 032 Azul
Imagen feed: imagen de variante azul
Marca: Faber-Castell
SKU: LAP-FC032-AZUL
```

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Guardar solo una URL simple en producto | Descartada. No permite fuente, derechos, alt text, variantes, galería, estado, dimensiones ni optimización. |
| Manejar imágenes directamente en Next.js | Descartada como fuente de verdad. Next.js debe consumir imágenes, no administrar catálogo maestro. |
| Manejar imágenes en un CMS externo desde el inicio | Descartada para la primera fase. Añade complejidad operativa; podría evaluarse después para contenido editorial, no para catálogo maestro. |
| Modelar assets formalmente en ERP/POS | Aceptada. Permite control operativo, derechos, SEO, variantes, Storefront API, Merchant Center y mantenimiento. |

## Justificación

### SEO

Imágenes con alt text, contexto, schema y estabilidad mejoran calidad de páginas y visibilidad.

### UX

El cliente necesita ver claramente producto, color, tamaño, presentación y empaque.

### Core Web Vitals

Imágenes optimizadas reducen peso, mejoran LCP y evitan layout shift.

### Operación real

Imágenes ayudan a despacho, atención al cliente y reducción de errores.

### Merchant Center

Feed futuro requiere imágenes claras, consistentes y públicas.

### Mantenibilidad

Un modelo formal permite ordenar, reemplazar, desactivar, auditar y optimizar assets.

### Seguridad y derechos de uso

Registrar fuente y permiso reduce riesgo legal o reputacional.

## Consecuencias positivas

- Control formal de imágenes.
- Menor riesgo de publicar imágenes sin permiso.
- Mejor SEO y alt text.
- Mejor Core Web Vitals futuro.
- Mejor experiencia de usuario.
- Mejor soporte para variantes visuales.
- Mejor preparación para Merchant Center.
- Mejor trazabilidad de fuente de imagen.
- Mejor soporte para CDN futuro.
- Menor riesgo de imágenes rotas o internas expuestas.

## Consecuencias negativas o costos

- Se agrega complejidad al catálogo.
- Se necesitará UI futura para gestionar assets.
- Se requerirá definir almacenamiento/CDN después.
- Se necesitará procesar/optimizar imágenes.
- Se necesitarán validaciones adicionales.
- Se requerirá mantener alt text de calidad.
- Se deberá administrar permisos y fuente de imagen.

Estos costos son aceptables porque las imágenes son críticas para ecommerce, SEO, rendimiento y confianza del cliente.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Imágenes sin permiso | `rightsConfirmed` obligatorio para assets públicos. |
| Imágenes pesadas | Registrar tamaño y preparar optimización WebP/AVIF. |
| Imágenes rotas | Validar URL/storageKey y no exponer assets inválidos. |
| Alt text pobre | Validación mínima y revisión humana. |
| Variante sin imagen correcta | Permitir imagen por variante y fallback controlado. |
| Duplicidad de assets | Usar checksum o revisión futura; no duplicar innecesariamente. |
| Inconsistencia entre tienda y Merchant Center | Feed futuro debe usar assets del ERP/POS. |
| Dependencia excesiva de fotos de proveedor | Permitir fuente propia futura y reemplazo controlado. |
| Exposición de rutas internas | Storefront API expone solo URLs públicas seguras. |
| Layout shift por dimensiones desconocidas | Guardar width/height y usarlos en Next.js. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad de assets de producto.
2. Producto online requiere imagen principal.
3. Asset público requiere derechos confirmados.
4. Asset público requiere alt text.
5. Storefront API expone DTOs públicos, no datos internos.
6. Next.js no debe administrar el catálogo maestro de imágenes.
7. CDN y optimización deben quedar preparados para fases futuras.
8. No exponer assets inactivos o internos.
9. No publicar imágenes rotas.
10. No usar imágenes de proveedor sin permiso registrado.
11. Variante visualmente distinta debe poder tener imagen propia.
12. Si no hay imagen de variante, debe existir fallback controlado.
13. Las imágenes deben registrar dimensiones cuando sea posible.
14. Las imágenes deben estar preparadas para Merchant Center futuro.

## Impacto técnico

### Catálogo backend

Se requerirá entidad o estructura para assets de producto, variante y marca.

### Frontend Angular interno

Se necesitará futura UI para:

- cargar o registrar imágenes;
- definir imagen principal;
- ordenar galería;
- asociar imagen a variante;
- registrar fuente;
- confirmar derechos;
- editar alt text;
- activar/desactivar assets.

### Storefront API

Deberá exponer imágenes públicas con DTOs seguros:

- imagen principal;
- galería;
- imagen por variante;
- logo de marca si aplica.

### Next.js futuro

Consumirá imágenes desde Storefront API y aplicará optimización/renderizado.

### SEO

Impacta:

- alt text;
- Open Graph;
- schema.org Product;
- Core Web Vitals;
- sitemap de imágenes futuro.

### Merchant Center

La imagen principal y las imágenes de variante serán base para feed.

### Variantes

Las variantes visualmente diferentes podrán tener imagen específica.

### Marcas

Las marcas podrán tener logo público opcional.

### Infraestructura/CDN futuro

Se deberá definir almacenamiento, procesamiento, CDN, caché y estrategia de URLs públicas en una fase posterior.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba modelar imágenes/assets como entidad o configuración formal.
2. Se aprueba que ERP/POS será fuente de verdad de assets.
3. Se aprueba que producto online requiere imagen principal.
4. Se aprueba que asset público requiere derechos confirmados.
5. Se aprueba que asset público requiere alt text.
6. Se aprueba permitir galería de imágenes.
7. Se aprueba imagen específica por variante cuando cambie visualmente.
8. Se aprueba fallback desde variante hacia producto padre cuando corresponda.
9. Se aprueba logo de marca como asset opcional.
10. Se aprueba preparar optimización WebP/AVIF, responsive images y CDN futuro.
11. Se aprueba que Storefront API solo expone assets públicos y seguros.
12. Se aprueba que Next.js no administra el catálogo maestro de imágenes.
13. Se aprueba que las fotos de proveedor pueden usarse si tienen permiso formal registrado.
14. Se aprueba que Merchant Center futuro usará assets consistentes con tienda y ERP.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar código;
- crear migraciones;
- crear endpoints;
- implementar carga de imágenes;
- elegir proveedor definitivo de almacenamiento/CDN;
- modificar imágenes actuales;
- crear tienda Next.js;
- implementar Merchant Center;
- cambiar AWS/staging;
- instalar dependencias;
- crear procesamiento WebP/AVIF;
- crear sitemap de imágenes;
- cargar imágenes productivas masivamente.

## Decisión resultante

InkToy modelará las imágenes y assets de producto como entidades o configuraciones formales administradas desde el ERP/POS.

Todo producto publicado online requerirá imagen principal. Los assets públicos deberán tener derechos de uso confirmados y alt text descriptivo. Las variantes visualmente distintas podrán tener imagen propia y, si no la tienen, usarán un fallback controlado desde el producto padre.

La Storefront API expondrá solo assets públicos, activos y seguros. Next.js consumirá esos assets y no administrará el catálogo maestro de imágenes. El modelo quedará preparado para optimización futura con WebP/AVIF, responsive images, CDN, Core Web Vitals, Merchant Center y SEO técnico.

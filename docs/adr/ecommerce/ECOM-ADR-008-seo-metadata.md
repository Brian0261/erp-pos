# ADR-008 — SEO metadata para la futura tienda online SEO-first de InkToy

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
- ADR-007: Imágenes y assets de producto.

Los ADRs previos establecieron que:

- la tienda pública debe ser SEO-first;
- las URLs públicas usarán slugs limpios y estables;
- los cambios de slug requieren historial y redirección 301;
- productos, marcas y categorías sin contenido mínimo no deben indexarse;
- los filtros/facetas no serán indexables por defecto;
- las variantes no serán indexables por defecto, salvo que tengan valor SEO real;
- las imágenes/assets se gestionarán desde ERP/POS;
- todo producto online requiere imagen principal, alt text y derechos confirmados.

La metadata SEO es crítica porque define cómo Google, redes sociales y otros consumidores interpretan cada página pública. Afecta títulos, descripciones, canonical, indexación, Open Graph, structured data, sitemap, CTR, prevención de contenido duplicado y calidad del sitio.

## Problema

Se debe definir cómo modelar, administrar, validar y exponer la metadata SEO de productos, categorías online, marcas, futuras listas escolares, futuras guías/blog y páginas públicas de InkToy.

La decisión debe resolver:

- dónde vive la metadata SEO;
- cómo se edita y revisa;
- qué campos mínimos requiere una página indexable;
- cómo manejar title, meta description, canonical, robots y Open Graph;
- cómo evitar titles y descriptions duplicados;
- cómo evitar páginas pobres indexadas;
- cómo manejar variantes, filtros, productos agotados y páginas futuras;
- cómo entregar metadata a Next.js mediante Storefront API/BFF;
- cómo mantener consistencia con sitemap, canonical, structured data y Merchant Center futuro.

Riesgos si no se administra metadata SEO desde ERP/POS:

- Next.js podría inventar metadata sin contexto operativo real;
- productos publicados podrían tener titles duplicados;
- categorías o marcas podrían indexarse sin contenido mínimo;
- variantes o filtros podrían generar contenido duplicado;
- sitemap podría incluir URLs no aptas;
- canonical podría apuntar incorrectamente;
- Merchant Center futuro podría quedar desalineado;
- contenido generado automáticamente o por IA podría publicarse sin valor real.

## Decisión

Se decide que la metadata SEO debe modelarse como configuración formal asociada a entidades públicas del ERP/POS.

Decisiones principales:

1. ERP/POS será la fuente de verdad de la metadata SEO.
2. Next.js consumirá metadata desde Storefront API/BFF.
3. Cada página indexable debe tener:
   - `seoTitle`;
   - `seoDescription`;
   - `canonicalUrl`;
   - política de indexación;
   - metadata Open Graph cuando aplique.
4. Debe permitirse metadata manual y fallback automático controlado.
5. El fallback automático solo podrá usarse si cumple reglas mínimas de calidad.
6. Las páginas estratégicas requieren revisión humana antes de indexarse.
7. No se deben indexar páginas sin contenido mínimo.
8. No se deben indexar filtros/facetas por defecto.
9. No se deben indexar variantes por defecto.
10. No se debe publicar metadata generada por IA sin revisión humana.
11. Storefront API debe exponer DTOs públicos de metadata.
12. Next.js no debe inventar metadata crítica si no viene del backend o de fallback aprobado.

Decisión central:

> La metadata SEO será una configuración formal administrada desde ERP/POS y consumida por Next.js mediante Storefront API/BFF. Toda página indexable debe tener metadata mínima, canonical correcto y política de indexación explícita.

## Modelo conceptual recomendado

### SeoMetadata

Entidad o configuración asociada a una entidad pública.

Puede asociarse a:

- producto publicado online;
- categoría online;
- marca;
- variante indexable, solo si aplica;
- futura lista escolar;
- futura guía/blog;
- página pública especial.

Uso principal:

- title;
- meta description;
- canonical;
- robots policy;
- Open Graph;
- structured data;
- sitemap;
- validación de indexación.

### Producto publicado online

Debe tener metadata propia o fallback aprobado.

Ejemplo:

```text
Producto:
Lapicero Faber-Castell 032

seoTitle:
Lapicero Faber-Castell 032 | InkToy

seoDescription:
Compra lapicero Faber-Castell 032 para útiles escolares y oficina. Disponible en colores seleccionados en InkToy.
```

### Categoría online

Debe tener metadata y contenido mínimo si será indexable.

Ejemplo:

```text
Categoría:
Lapiceros

seoTitle:
Lapiceros escolares y de oficina | InkToy

seoDescription:
Encuentra lapiceros para colegio, oficina y manualidades. Compra online útiles escolares en InkToy.
```

### Marca

Debe tener metadata si tendrá página pública indexable.

Ejemplo:

```text
Marca:
Faber-Castell

seoTitle:
Productos Faber-Castell en Perú | InkToy

seoDescription:
Compra útiles escolares y artículos Faber-Castell en InkToy. Encuentra lapiceros, colores y más productos de la marca.
```

### Variante indexable

Las variantes no serán indexables por defecto.

Solo tendrán metadata propia si existe valor SEO real.

Ejemplo válido:

```text
Variante:
Cartulina Canson A4 negra

seoTitle:
Cartulina Canson A4 negra | InkToy
```

Ejemplo no recomendado:

```text
Lapicero azul
Lapicero rojo
Lapicero negro
```

si las páginas son prácticamente iguales y no aportan contenido diferencial.

### Futuras listas escolares

Las listas escolares podrán tener metadata propia cuando se implementen.

Ejemplo:

```text
/listas-escolares/primaria-2027
```

Deberán tener contenido real y revisión humana antes de indexarse.

### Futuras guías/blog

Las guías deberán tener metadata editorial propia.

Ejemplo:

```text
/guias/como-elegir-utiles-escolares
```

No se permitirá contenido IA genérico sin revisión humana.

### Open Graph metadata

Debe permitir definir cómo se comparte una página en redes sociales y mensajería.

Puede usar fallback desde:

- `seoTitle`;
- `seoDescription`;
- imagen principal del producto;
- imagen de marca;
- imagen editorial.

### Structured data metadata

Debe permitir activar o desactivar structured data según tipo de página:

- `Product`;
- `BreadcrumbList`;
- `Organization`;
- `LocalBusiness`;
- `FAQPage`;
- `ProductGroup` si aplica a variantes.

### Indexing policy

Debe indicar si una página puede indexarse.

Ejemplos:

```text
INDEX_FOLLOW
NOINDEX_FOLLOW
NOINDEX_NOFOLLOW
```

## Campos mínimos recomendados

| Campo | Propósito |
|---|---|
| `id` | Identificador interno |
| `entityType` | Producto, categoría, marca, variante, guía, lista escolar |
| `entityId` | Entidad asociada |
| `seoTitle` | Title SEO |
| `seoDescription` | Meta description |
| `canonicalUrl` | URL canónica pública |
| `robotsPolicy` | index/noindex/follow/nofollow |
| `ogTitle` | Título Open Graph |
| `ogDescription` | Descripción Open Graph |
| `ogImage` | Imagen social |
| `schemaType` | Product, BreadcrumbList, FAQPage, etc. |
| `structuredDataEnabled` | Activa/desactiva datos estructurados |
| `lastReviewedAt` | Última revisión humana |
| `reviewedBy` | Usuario revisor, opcional |
| `active` | Estado de la metadata |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos opcionales futuros:

| Campo | Propósito |
|---|---|
| `focusKeyword` | Palabra o intención principal |
| `noindexReason` | Motivo de noindex |
| `metadataSource` | Manual, fallback, IA asistida, importada |
| `qualityStatus` | Pendiente, revisado, aprobado |
| `canonicalOverride` | Canonical manual cuando aplique |
| `schemaOverrideJson` | Ajuste avanzado controlado |
| `ogImageOverride` | Imagen social distinta a la principal |

## Reglas de metadata SEO

### Reglas obligatorias

1. No indexar página sin title único.
2. No indexar página sin meta description útil.
3. No indexar página sin canonical.
4. No indexar producto publicado sin imagen principal.
5. No indexar producto sin slug público válido.
6. No indexar marca sin contenido mínimo.
7. No indexar categoría sin contenido mínimo.
8. No indexar variante por defecto.
9. No indexar filtros/facetas por defecto.
10. No indexar staging.
11. Permitir fallback automático solo si cumple calidad mínima.
12. Requerir revisión humana para páginas estratégicas.
13. No publicar metadata generada por IA sin revisión humana.
14. No permitir titles/descriptions duplicados en páginas indexables del mismo tipo.
15. No usar canonical hacia una entidad distinta salvo decisión explícita.

## Reglas de generación de title y meta description

### Longitud recomendada

| Campo | Recomendación |
|---|---|
| `seoTitle` | Aproximadamente 45-60 caracteres cuando sea posible |
| `seoDescription` | Aproximadamente 120-160 caracteres cuando sea posible |

Estas longitudes no deben ser una regla rígida, pero sí una guía para evitar textos demasiado cortos, genéricos o excesivos.

### Reglas de title

Debe:

- describir claramente la página;
- incluir producto/categoría/marca cuando aporte valor;
- incluir atributos relevantes si aportan intención;
- evitar keyword stuffing;
- evitar duplicados;
- evitar títulos genéricos como “Producto” o “Categoría”.

Ejemplos:

```text
Lapicero Faber-Castell 032 | InkToy
Cuadernos escolares A4 | InkToy
Productos Faber-Castell en Perú | InkToy
Lista escolar primaria 2027 | InkToy
```

### Reglas de meta description

Debe:

- resumir el contenido de la página;
- aportar valor al usuario;
- evitar repetición masiva;
- incluir intención comercial cuando aplique;
- evitar frases genéricas sin utilidad.

Ejemplos:

```text
Compra lapiceros Faber-Castell para colegio, oficina y manualidades. Encuentra colores disponibles y stock online en InkToy.

Encuentra cuadernos escolares A4 para primaria y secundaria. Compra online útiles escolares en InkToy.
```

### Metadata para productos

Debe considerar:

- tipo de producto;
- marca;
- modelo;
- atributo relevante;
- intención de compra;
- disponibilidad si se usa de forma controlada.

### Metadata para categorías

Debe considerar:

- tipo de categoría;
- uso escolar/oficina/manualidades;
- variedad de productos;
- intención de compra.

### Metadata para marcas

Debe considerar:

- nombre de marca;
- tipos de productos disponibles;
- contexto local si aporta valor.

### Metadata para listas escolares futuras

Debe considerar:

- colegio, grado o campaña;
- año escolar;
- intención de compra rápida;
- evitar datos no confirmados.

### Metadata para guías/blog

Debe considerar:

- pregunta o intención informativa;
- utilidad real;
- contenido revisado por humano;
- evitar contenido IA genérico.

## Relación con canonical

Canonical debe indicar la URL principal de una página.

### Producto padre

El producto padre tendrá canonical hacia su URL principal:

```text
https://inktoy.pe/productos/lapicero-faber-castell-032
```

### Variante

La variante no indexable debe usar canonical hacia el producto padre cuando se renderice como vista accesible.

Si la variante tiene valor SEO real y página propia aprobada, puede tener canonical propio.

### Filtros/facetas

Los filtros por defecto deben canonicalizar hacia la categoría principal.

Ejemplo:

```text
/categorias/lapiceros?marca=faber-castell
```

Canonical por defecto:

```text
https://inktoy.pe/categorias/lapiceros
```

Solo páginas facetadas estratégicas podrán tener canonical propio si se aprueban como landing SEO.

### Marcas y categorías

Cada marca/categoría indexable debe tener canonical propio.

### Regla crítica

No usar canonical incorrecto entre entidades distintas.

Ejemplo incorrecto:

```text
Categoría cuadernos -> canonical a categoría lapiceros
```

## Relación con index/noindex

### Cuándo indexar

Se puede indexar una página cuando:

- tiene slug público válido;
- está publicada;
- tiene metadata mínima;
- tiene canonical correcto;
- tiene contenido útil;
- no es staging;
- no es filtro/faceta no aprobado;
- no es variante sin valor SEO;
- no está marcada como noindex.

### Cuándo usar noindex

Usar `noindex` cuando:

- la página es pobre o incompleta;
- la marca/categoría no tiene contenido mínimo;
- la variante no tiene valor SEO propio;
- la página es filtro/faceta;
- la página está en staging;
- el contenido es temporal;
- existe riesgo de duplicidad;
- el producto está oculto o no publicado.

### Productos agotados

Un producto agotado puede seguir indexado si:

- tiene valor SEO;
- sigue siendo parte del catálogo;
- puede volver a stock;
- ofrece alternativas relacionadas.

No debe permitir compra si no hay stock disponible online.

### Productos descontinuados

Si un producto está descontinuado:

- puede mantenerse indexado si tiene tráfico y alternativas;
- puede redirigirse si existe reemplazo claro;
- puede devolver 410 si fue retirado permanentemente y no tiene valor.

La regla final se detallará en ADR posterior de stock/catálogo avanzado.

## Relación con Open Graph y redes sociales

Cada página pública importante debe poder exponer:

- `og:title`;
- `og:description`;
- `og:image`;
- `og:url`;
- `og:type`.

Fallback recomendado:

```text
og:title = seoTitle
og:description = seoDescription
og:image = imagen principal pública
```

Para productos, `og:image` debe venir de la imagen principal aprobada.

Para marcas, puede venir del logo o imagen de marca.

Para categorías, puede venir de imagen editorial o fallback controlado.

## Relación con Schema.org

La metadata SEO debe permitir generar structured data desde datos confiables del ERP/POS.

### Product

Debe usar datos como:

- nombre;
- descripción;
- imagen;
- marca;
- SKU;
- precio online efectivo;
- moneda;
- disponibilidad;
- URL canónica.

### BreadcrumbList

Debe usar jerarquía de categorías, marca o rutas públicas aprobadas.

### Organization / LocalBusiness

Debe representar la marca InkToy y datos públicos del negocio en páginas globales.

### FAQPage

Solo se debe usar si existe contenido real de preguntas y respuestas.

No se debe generar FAQPage falso o repetitivo.

### ProductGroup

Puede evaluarse para productos con variantes, si aporta compatibilidad SEO y estructura correcta.

## Relación con sitemap

El sitemap debe incluir solo URLs:

- publicadas;
- indexables;
- canónicas;
- con contenido mínimo;
- no pertenecientes a staging.

Debe excluir:

- productos no publicados;
- variantes no indexables;
- filtros/facetas por defecto;
- marcas/categorías pobres;
- páginas con `noindex`;
- URLs antiguas redirigidas;
- staging.

Debe actualizarse cuando cambien:

- publicación;
- slug;
- canonical;
- robots policy;
- metadata relevante;
- estado activo;
- contenido mínimo.

## Relación con Storefront API/BFF

La Storefront API debe exponer metadata pública de forma controlada.

Ejemplo conceptual:

```text
StorefrontSeoMetadata
- title
- description
- canonicalUrl
- robots
- openGraph
- structuredData
```

Debe exponer:

- title aprobado;
- description aprobada;
- canonical;
- robots;
- Open Graph;
- schema habilitado;
- datos públicos necesarios para Next.js.

No debe exponer:

- IDs internos innecesarios;
- usuarios revisores si no es necesario;
- historial editorial;
- notas internas;
- flags internos;
- prompts IA;
- datos no públicos.

### Fallback

Si una página usa fallback automático, la API debe exponer metadata final ya resuelta o indicar internamente que proviene de fallback.

Next.js debe recibir la metadata lista para renderizar, no construir reglas críticas por su cuenta.

## Relación con Next.js

Next.js deberá usar la metadata entregada por Storefront API/BFF.

Debe soportar:

- `generateMetadata` o estrategia equivalente;
- SSR/SSG/ISR;
- metadata por página;
- canonical;
- robots;
- Open Graph;
- structured data;
- revalidación cuando cambia metadata;
- 404/noindex según estado de publicación;
- sitemap futuro.

Cuando cambie metadata, publicación, slug o robots policy:

- la página debe revalidarse;
- sitemap debe actualizarse;
- canonical debe mantenerse coherente.

## Relación con administración SEO

La metadata debe poder administrarse desde ERP/POS o una interfaz interna futura.

Roles futuros posibles:

- SEO/Content Manager;
- Ecommerce Manager;
- ADMIN/SUPERVISOR temporalmente.

Flujo recomendado:

1. Se crea o edita producto/categoría/marca.
2. Se completa metadata mínima.
3. Se valida que no haya duplicados.
4. Se revisa contenido estratégico.
5. Se aprueba publicación/indexación.
6. Storefront API expone metadata pública.
7. Next.js renderiza metadata.

### Uso de IA

La IA puede usarse como apoyo para redactar borradores, pero no debe publicar metadata automáticamente.

Reglas:

- IA puede sugerir titles/descriptions;
- humano debe revisar;
- no aceptar contenido genérico;
- no publicar contenido inventado;
- no repetir metadata masivamente;
- no usar IA para crear páginas pobres a escala.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Metadata hardcodeada en Next.js | Descartada. Dificulta operación, requiere despliegues para cambios y separa SEO del catálogo fuente. |
| Metadata generada solo automáticamente | Descartada. Riesgo de duplicados, baja calidad, keyword stuffing y contenido genérico. |
| Metadata administrada en CMS externo desde el inicio | Descartada para primera fase. Agrega complejidad y puede duplicar catálogo. Puede evaluarse después para contenido editorial. |
| Metadata formal administrada desde ERP/POS | Aceptada. Mantiene fuente de verdad, control editorial, validaciones y consistencia con Storefront API. |

## Justificación

### SEO

Permite páginas únicas, indexables y con señales claras para buscadores.

### Mantenibilidad

La metadata queda asociada a entidades del catálogo y no dispersa en el frontend.

### Operación real

El equipo puede editar, revisar y aprobar metadata sin depender de cambios de código.

### Storefront API

Permite entregar metadata pública ya resuelta y segura.

### Next.js

Facilita SSR/SSG/ISR, `generateMetadata`, canonical, Open Graph y structured data.

### Prevención de contenido duplicado

Permite controlar index/noindex, canonical y calidad mínima por entidad.

### Control editorial

Evita publicar contenido automático, pobre o no revisado.

## Consecuencias positivas

- Mejor control SEO desde ERP/POS.
- Titles y descriptions más consistentes.
- Menor riesgo de contenido duplicado.
- Mejor integración con Next.js.
- Mejor sitemap futuro.
- Mejor manejo de canonical.
- Mejor preparación para Open Graph.
- Mejor preparación para Schema.org.
- Mejor flujo editorial.
- Menor dependencia de cambios de código para SEO.
- Mejor preparación para Merchant Center futuro.

## Consecuencias negativas o costos

- Se agrega complejidad al catálogo online.
- Se necesitará UI futura para editar metadata.
- Se requerirán validaciones de duplicados y calidad mínima.
- Se requerirá revisión humana en páginas estratégicas.
- Se deberá mantener metadata actualizada.
- Se deberá diseñar fallback automático con cuidado.
- Se requerirá coordinación entre ERP/POS, Storefront API y Next.js.

Estos costos son aceptables porque la metadata SEO es fundamental para una tienda SEO-first.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Titles duplicados | Validación por tipo de entidad y revisión SEO. |
| Meta descriptions genéricas | Reglas mínimas y revisión humana. |
| Canonical incorrecto | Validaciones por entidad y QA SEO. |
| Indexación de filtros | Noindex/canonical por defecto para facetas. |
| Indexación de staging | Robots restrictivo, noindex y protección adicional. |
| Páginas pobres indexadas | Política de contenido mínimo. |
| Metadata desactualizada | Revisión periódica y auditoría. |
| IA generando contenido sin valor | IA solo como borrador; revisión humana obligatoria. |
| Inconsistencia entre tienda, sitemap y Merchant Center futuro | Storefront API debe ser fuente pública consistente. |
| Next.js inventa metadata crítica | Next.js debe consumir metadata aprobada o fallback controlado. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad de metadata SEO.
2. Toda página indexable requiere metadata mínima.
3. Toda página indexable requiere canonical.
4. No indexar filtros/facetas por defecto.
5. No indexar staging.
6. No indexar páginas pobres.
7. No indexar variantes por defecto.
8. No publicar metadata generada por IA sin revisión humana.
9. Next.js no debe inventar metadata crítica si no viene del backend o de fallback aprobado.
10. Storefront API debe exponer DTOs públicos de metadata.
11. No usar metadata duplicada en páginas indexables.
12. No usar keyword stuffing.
13. No generar páginas SEO a escala sin contenido real.
14. Sitemap solo debe incluir páginas indexables, publicadas y canónicas.

## Impacto técnico

### Catálogo backend

Deberá soportar metadata SEO asociada a entidades públicas.

### Frontend Angular interno

Se necesitará futura UI para:

- editar SEO title;
- editar meta description;
- definir canonical;
- definir robots policy;
- definir Open Graph;
- revisar calidad;
- aprobar indexación.

### Storefront API

Deberá exponer metadata pública resuelta.

### Next.js futuro

Usará metadata para renderizar páginas SEO-first.

### Sitemap

Usará robots policy, canonical y estado de publicación.

### Canonical

Debe generarse desde slugs y configuración aprobada.

### Structured data

Se generará desde entidades públicas y metadata aprobada.

### Merchant Center futuro

Debe mantener consistencia con title, description, imagen, precio y disponibilidad.

### QA SEO

Se deberá validar:

- title único;
- description útil;
- canonical correcto;
- noindex en páginas no aptas;
- sitemap limpio;
- ausencia de filtros indexados;
- staging no indexable;
- structured data válido.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba modelar SEO metadata como configuración formal.
2. Se aprueba que ERP/POS será fuente de verdad de metadata SEO.
3. Se aprueba que Next.js consumirá metadata desde Storefront API/BFF.
4. Se aprueba que toda página indexable requiere title, description y canonical.
5. Se aprueba que toda página indexable requiere política de indexación.
6. Se aprueba permitir metadata manual y fallback automático controlado.
7. Se aprueba que el fallback automático debe cumplir calidad mínima.
8. Se aprueba que páginas estratégicas requieren revisión humana.
9. Se aprueba no indexar páginas sin contenido mínimo.
10. Se aprueba no indexar filtros/facetas por defecto.
11. Se aprueba no indexar variantes por defecto.
12. Se aprueba no publicar metadata IA sin revisión humana.
13. Se aprueba que Storefront API expondrá DTOs públicos de metadata.
14. Se aprueba que sitemap solo incluirá páginas indexables, publicadas y canónicas.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar metadata;
- crear migraciones;
- crear endpoints;
- crear UI SEO;
- implementar sitemap;
- crear tienda Next.js;
- integrar Merchant Center;
- usar IA para publicar contenido automáticamente;
- cambiar slugs actuales;
- modificar productos actuales;
- modificar categorías actuales;
- modificar marcas actuales;
- tocar AWS/staging;
- cambiar DNS;
- activar páginas SEO públicas.

## Decisión resultante

InkToy gestionará la metadata SEO como configuración formal administrada desde el ERP/POS. La Storefront API/BFF expondrá metadata pública, segura y resuelta para que Next.js renderice páginas SEO-first con title, description, canonical, robots, Open Graph y structured data.

Toda página indexable requerirá metadata mínima, canonical correcto, política de indexación explícita y contenido útil. Los filtros/facetas, staging, variantes sin valor SEO y páginas pobres no serán indexables por defecto.

La IA podrá apoyar la redacción de borradores, pero ninguna metadata generada por IA se publicará sin revisión humana. El sitemap futuro solo incluirá URLs publicadas, indexables y canónicas.

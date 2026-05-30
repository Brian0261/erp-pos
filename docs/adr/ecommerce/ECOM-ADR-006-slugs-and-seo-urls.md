# ADR-006 — Slugs y URLs SEO para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, ventas, pedidos y facturación. La futura tienda pública vivirá en `inktoy.pe`, será desarrollada con Next.js y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.

Los ADRs previos establecieron que:

- la tienda pública debe ser SEO-first;
- la tienda solo consumirá productos publicados;
- no se deben exponer endpoints internos;
- las marcas serán entidades formales;
- los productos con diferencias vendibles relevantes usarán producto padre + variantes;
- la página SEO principal normalmente será la del producto padre;
- las variantes solo tendrán páginas indexables si existe valor SEO real.

En una tienda SEO-first, los slugs y las URLs públicas son parte crítica del diseño. Afectan indexación, experiencia de usuario, sitemap, canonical, redirecciones, Storefront API, Next.js, Merchant Center y prevención de contenido duplicado.

---

## Problema

Se debe definir una estrategia formal de slugs y URLs públicas antes de implementar catálogo online, Storefront API o tienda Next.js.

La decisión debe resolver:

- cómo serán las URLs públicas de productos, categorías, marcas y futuras páginas;
- si se usarán IDs internos o slugs;
- cómo evitar duplicidad;
- cómo manejar cambios de slug;
- cómo resolver rutas desde Storefront API;
- cómo manejar productos, marcas o categorías inactivas;
- cómo tratar variantes;
- cómo controlar filtros, facetas y paginación;
- cómo evitar que staging sea indexado.

Riesgos si no se define esta estrategia:

- URLs poco amigables o difíciles de posicionar;
- uso de IDs internos en URLs públicas;
- pérdida de tráfico si se cambian URLs sin redirección;
- contenido duplicado entre productos, variantes, marcas y categorías;
- filtros indexados sin control;
- sitemap incorrecto;
- problemas con canonical;
- páginas pobres indexadas;
- exposición accidental de rutas internas;
- dificultad para migrar o reestructurar URLs más adelante.

---

## Decisión

Se decide que la tienda pública de InkToy usará URLs limpias basadas en slugs, gestionadas desde el ERP/POS y expuestas mediante Storefront API/BFF.

Decisiones principales:

1. No usar IDs internos en URLs públicas.
2. Usar slugs legibles, estables y normalizados.
3. Definir slugs únicos por tipo de entidad o namespace.
4. Mantener slugs estables y no cambiarlos sin motivo.
5. Registrar historial de slugs cuando una URL pública cambie.
6. Aplicar redirección 301 desde slug anterior hacia slug nuevo.
7. Evitar cadenas de redirecciones.
8. Usar canonical para prevenir duplicidad.
9. No indexar filtros/facetas por defecto.
10. No indexar staging.
11. Storefront API debe resolver entidades públicas por slug.
12. Next.js debe usar rutas dinámicas basadas en slugs.

Decisión central:

> Las URLs públicas de InkToy deben ser limpias, semánticas y estables. El identificador público principal para productos, categorías, marcas y futuras páginas será el slug, no el ID interno.

---

## Estructura recomendada de URLs

La estructura base será:

| Tipo de página | URL recomendada |
|---|---|
| Home | `/` |
| Producto | `/productos/{product-slug}` |
| Categoría online | `/categorias/{category-slug}` |
| Marca | `/marcas/{brand-slug}` |
| Variante indexable, solo si aplica | `/productos/{variant-slug}` |
| Lista escolar futura | `/listas-escolares/{school-list-slug}` |
| Guía/blog futuro | `/guias/{guide-slug}` |
| Búsqueda | `/buscar?q=termino` |
| Filtros | `/categorias/{category-slug}?marca=faber-castell&color=azul` |

Ejemplos:

```text
/productos/lapicero-faber-castell-032
/categorias/utiles-escolares
/marcas/faber-castell
/listas-escolares/primaria-2027
/guias/como-elegir-utiles-escolares
```

Los query params podrán usarse para UX de búsqueda, filtros, ordenamiento y paginación, pero no serán URL canónica por defecto.

---

## Reglas de generación de slugs

Los slugs deben generarse con reglas consistentes:

1. Usar minúsculas.
2. Eliminar tildes.
3. Eliminar caracteres especiales.
4. Reemplazar espacios por guiones.
5. Evitar guiones duplicados.
6. Evitar slugs demasiado largos.
7. Incluir marca/modelo cuando aporte claridad.
8. Evitar palabras irrelevantes cuando no aporten.
9. No usar IDs internos.
10. No usar caracteres dependientes de codificación especial.
11. No generar slugs vacíos.
12. Resolver colisiones de forma controlada.

Ejemplo:

```text
Nombre: Lapicero Faber-Castell 032 Azul
Slug recomendado: lapicero-faber-castell-032-azul
```

Ejemplo de normalización:

```text
"Cartulina Cansón A4 Negra" -> cartulina-canson-a4-negra
"Cuaderno Triple Línea 100 Hojas" -> cuaderno-triple-linea-100-hojas
```

---

## Reglas de unicidad

La unicidad debe definirse por tipo de entidad o namespace.

| Entidad | Regla recomendada |
|---|---|
| Producto padre | Slug único dentro de productos |
| Variante indexable | Debe compartir namespace de productos |
| Marca | Slug único dentro de marcas |
| Categoría online | Slug único dentro de categorías |
| Lista escolar futura | Slug único dentro de listas escolares |
| Guía/blog | Slug único dentro de guías |

Para productos y variantes, se recomienda que compartan el mismo namespace `/productos/{slug}`. Por lo tanto:

- un producto padre no puede tener el mismo slug que una variante indexable;
- una variante indexable no puede usar slug de otro producto;
- si la variante no es indexable, no necesita URL pública propia.

Para categorías, se puede empezar con slug único simple:

```text
/categorias/lapiceros
/categorias/cuadernos
```

La jerarquía de categorías podrá resolverse en breadcrumbs y estructura interna. Si en el futuro se requiere jerarquía en URL, se evaluará con cuidado:

```text
/categorias/utiles-escolares/lapiceros
```

No se adopta jerarquía obligatoria en URL en este ADR para evitar complejidad prematura.

---

## Estrategia de resolución de colisiones

Si se intenta crear un slug ya existente, el sistema debe:

1. bloquear publicación hasta que se corrija manualmente; o
2. proponer slug alternativo controlado.

Ejemplo:

```text
lapicero-faber-castell-032
lapicero-faber-castell-032-azul
lapicero-faber-castell-032-negro
```

No se recomienda generar sufijos automáticos opacos como:

```text
lapicero-faber-castell-032-12345
```

salvo casos internos excepcionales, porque perjudican calidad SEO y legibilidad.

---

## Reglas para cambios de slug

Los slugs públicos no deben cambiarse sin motivo.

Se permitirá cambiar un slug cuando:

- el nombre anterior era incorrecto;
- el slug tenía error ortográfico;
- se normaliza una marca/modelo;
- se mejora claridad SEO;
- se fusionan o reorganizan productos;
- se corrige una estructura mal definida.

Cuando se cambie un slug público:

1. registrar slug anterior;
2. mantener historial de slugs;
3. crear redirección 301 desde el slug antiguo hacia el nuevo;
4. actualizar canonical;
5. actualizar sitemap;
6. evitar cadenas de redirecciones;
7. no reutilizar inmediatamente un slug histórico para otra entidad distinta.

Ejemplo:

```text
Antiguo:
/productos/lapicero-faber-032

Nuevo:
/productos/lapicero-faber-castell-032

Redirección:
301 /productos/lapicero-faber-032 -> /productos/lapicero-faber-castell-032
```

---

## Relación con productos y variantes

### Producto padre

La URL principal de producto será normalmente la del producto padre.

Ejemplo:

```text
/productos/lapicero-faber-castell-032
```

Esta página mostrará:

- información general del producto;
- marca;
- descripción;
- imágenes;
- selector de variantes;
- precio por variante o precio desde;
- disponibilidad por variante;
- metadata SEO;
- schema.

### Variante

Por defecto, la variante no tendrá página indexable propia.

La variante podrá tener página propia solo si existe valor SEO real.

Ejemplo donde podría aplicar:

```text
/productos/cartulina-canson-a4-negra
/productos/cinta-satinada-roja-1cm
```

Criterios para permitir URL indexable de variante:

- tiene búsquedas propias;
- tiene imagen propia;
- tiene descripción diferenciada;
- cambia la intención de búsqueda;
- no genera contenido duplicado;
- tiene valor comercial suficiente.

Si una variante tiene URL propia pero contenido muy similar al producto padre, se usará canonical hacia el producto padre o `noindex`, según política SEO futura.

---

## Relación con categorías online

Las categorías online tendrán URLs limpias:

```text
/categorias/utiles-escolares
/categorias/lapiceros
/categorias/cuadernos
```

Reglas:

1. No indexar categorías vacías.
2. Evaluar categorías con muy poco contenido antes de indexarlas.
3. Cada categoría pública debe tener slug único.
4. Cada categoría indexable debe tener metadata mínima.
5. Las categorías deben alimentar breadcrumbs.
6. Las categorías deben permitir interlinking hacia marcas y productos.

La jerarquía de categorías puede existir internamente aunque la URL inicial use slug simple.

Ejemplo de breadcrumb:

```text
Inicio > Útiles escolares > Lapiceros
```

---

## Relación con marcas

Las marcas tendrán URLs limpias:

```text
/marcas/faber-castell
/marcas/artesco
/marcas/standford
```

Reglas:

1. No publicar página de marca sin contenido mínimo.
2. No indexar marca sin productos publicados o sin descripción útil.
3. La marca debe tener slug único.
4. La página de marca debe tener canonical.
5. La marca debe permitir interlinking con categorías y productos.

Ejemplo de interlinking:

```text
/marcas/faber-castell
/categorias/lapiceros?marca=faber-castell
/productos/lapicero-faber-castell-032
```

Los filtros por marca dentro de categorías no serán indexables por defecto, salvo decisión SEO estratégica posterior.

---

## Relación con filtros, facetas y paginación

Los filtros y facetas son útiles para UX, pero peligrosos para SEO si se indexan sin control.

Filtros posibles:

- marca;
- precio;
- color;
- tamaño;
- disponibilidad;
- categoría;
- presentación;
- ordenamiento.

Uso permitido para UX:

```text
/categorias/lapiceros?marca=faber-castell&color=azul
/categorias/cuadernos?precioMin=5&precioMax=20
```

Reglas SEO:

1. No indexar filtros/facetas por defecto.
2. Usar canonical hacia la categoría principal cuando corresponda.
3. No incluir URLs filtradas en sitemap por defecto.
4. No crear páginas indexables de filtros sin estrategia.
5. Evitar combinaciones infinitas de parámetros.
6. Controlar paginación para no generar contenido duplicado.

Solo podrían existir páginas facetadas indexables si se aprueban explícitamente, por ejemplo:

```text
/categorias/lapiceros-faber-castell
```

Pero esto debe evaluarse como landing SEO específica, no como filtro automático indexado.

---

## Relación con Storefront API/BFF

La Storefront API debe resolver entidades públicas por slug.

Endpoints conceptuales:

```text
GET /api/v1/storefront/products/{slug}
GET /api/v1/storefront/categories/{slug}
GET /api/v1/storefront/brands/{slug}
GET /api/v1/storefront/guides/{slug}
```

Reglas:

1. No usar ID interno como identificador público principal.
2. Resolver producto/categoría/marca por slug público.
3. Verificar que la entidad esté activa y publicada.
4. Si el slug no existe, responder 404.
5. Si el slug cambió y existe historial, responder con información para redirección 301 o manejarla en capa Next.js/BFF.
6. Si la entidad fue retirada permanentemente, evaluar 410.
7. Si está inactiva/no publicada, no exponerla como producto público.
8. La API no debe filtrar datos internos.

Comportamientos recomendados:

| Caso | Respuesta recomendada |
|---|---|
| Slug válido y publicado | 200 |
| Slug inexistente | 404 |
| Slug antiguo con historial | 301 hacia nuevo slug |
| Producto retirado permanentemente | 410 si aplica |
| Producto no publicado | 404 |
| Staging | `noindex` / no exposición pública |

---

## Relación con Next.js

Next.js usará rutas dinámicas basadas en slugs.

Ejemplos:

```text
/productos/[slug]
/categorias/[slug]
/marcas/[slug]
/guias/[slug]
```

La estrategia Next.js deberá soportar:

- SSR para páginas dinámicas o críticas;
- SSG/ISR para productos, categorías y marcas;
- revalidación cuando cambie publicación, slug o metadata;
- generación de sitemap;
- metadata única por página;
- canonical;
- robots;
- manejo de 404/301/410;
- control de páginas no indexables.

Cuando cambie un slug:

- Next.js debe invalidar o regenerar la página antigua y la nueva;
- sitemap debe actualizarse;
- canonical debe apuntar a la URL actual;
- la redirección debe evitar cadenas.

---

## Relación con SEO técnico

La estrategia de slugs y URLs debe soportar:

- metadata única;
- canonical;
- sitemap dinámico;
- robots.txt;
- BreadcrumbList;
- Product schema;
- páginas de categoría;
- páginas de marca;
- páginas de producto;
- control de variantes;
- control de productos agotados;
- prevención de contenido duplicado;
- noindex en staging.

### Productos agotados

Un producto agotado puede seguir teniendo URL pública si tiene valor SEO, pero no debe poder comprarse.

Regla base:

- producto publicado y agotado: puede mostrarse como agotado;
- producto descontinuado sin reemplazo: evaluar 410 o mantener con alternativas;
- producto oculto/no publicado: no exponer en tienda.

La política final de agotados se detallará en ADR de stock/SEO avanzado.

---

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Usar IDs internos en URL | Descartada. Expone detalles técnicos, reduce legibilidad SEO y acopla URLs a la base interna. |
| Usar query params para productos/categorías | Descartada como URL principal. Puede usarse para filtros, búsqueda y ordenamiento, pero no como canonical principal. |
| Generar slugs solo en frontend | Descartada. El slug debe ser parte del catálogo online y fuente de verdad del ERP/POS. |
| Permitir cambios de slug sin historial | Descartada. Provoca pérdida de tráfico, errores 404 y mala experiencia. |
| Slugs controlados desde ERP/POS | Aceptada. Mantiene fuente de verdad, permite validaciones, historial y Storefront API consistente. |

---

## Justificación

### SEO

URLs limpias y estables mejoran indexación, CTR, estructura del sitio y entendimiento semántico.

### Seguridad

No exponer IDs internos reduce acoplamiento y evita revelar estructura interna innecesaria.

### Mantenibilidad

Slugs gestionados desde ERP/POS permiten controlar cambios, historial y redirecciones.

### Operación real

El equipo podrá corregir slugs, revisar metadata y evitar publicar URLs pobres.

### Storefront API

Resolver por slug crea contratos públicos más estables y adecuados para ecommerce.

### Prevención de duplicados

Canonical, noindex y reglas de filtros evitan indexación descontrolada.

---

## Consecuencias positivas

- URLs limpias y coherentes.
- Mejor base SEO.
- Menor exposición de datos internos.
- Mejor compatibilidad con Next.js.
- Mejor sitemap.
- Mejor control de canonical.
- Mejor experiencia de usuario.
- Menos riesgo de contenido duplicado.
- Mejor preparación para marcas, categorías, productos y listas escolares.
- Mejor control de cambios de URL.

---

## Consecuencias negativas o costos

- Se requiere gestionar slugs en ERP/POS.
- Se requiere validar unicidad.
- Se requiere historial de slugs.
- Se requiere lógica de redirecciones.
- Se requiere coordinación entre Storefront API y Next.js.
- Cambios de slug deben controlarse cuidadosamente.
- El equipo debe evitar editar slugs sin criterio.

Estos costos son aceptables porque evitan pérdida de tráfico, duplicidad SEO y desorden en URLs públicas.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Slugs duplicados | Restricciones de unicidad por entidad y namespace. |
| Slug cambiado sin redirección | Historial de slugs y redirección 301 obligatoria. |
| URLs con contenido duplicado | Canonical y noindex según tipo de página. |
| Categorías o marcas pobres indexadas | No publicar o noindex hasta tener contenido mínimo. |
| Filtros indexados sin control | Noindex/canonical por defecto para filtros. |
| Pérdida de tráfico por cambios de URL | Cambiar slugs solo con justificación y redirección 301. |
| Staging indexado | robots restrictivo, noindex y protección adicional si aplica. |
| Uso de IDs internos | Prohibir IDs internos como identificador público principal. |
| Cadenas de redirecciones | Redirigir siempre desde cualquier slug antiguo hacia slug actual. |
| Reutilización incorrecta de slugs históricos | No reutilizar slugs históricos para otra entidad sin revisión. |

---

## Reglas obligatorias

1. No usar IDs internos en URLs públicas.
2. No usar query params como URL canónica de productos, categorías o marcas.
3. Usar slugs limpios, normalizados y legibles.
4. Mantener slugs estables.
5. No cambiar slugs sin registrar historial.
6. No cambiar slugs sin redirección 301.
7. No permitir slugs duplicados.
8. No indexar staging.
9. No indexar filtros/facetas por defecto.
10. No crear páginas indexables sin contenido mínimo.
11. Storefront API debe resolver entidades públicas por slug.
12. Next.js debe manejar metadata y canonical por slug.
13. Variantes no serán indexables por defecto.
14. Marcas y categorías pobres no deben indexarse.
15. Sitemap solo debe incluir URLs públicas, canónicas e indexables.
16. Los slugs históricos no deben reutilizarse para otra entidad sin revisión.

---

## Impacto técnico

### Catálogo backend

Debe almacenar y validar slugs para entidades públicas.

### Marcas

Cada marca publicable debe tener slug único.

### Categorías online

Cada categoría online publicable debe tener slug único.

### Variantes

Las variantes solo tendrán slug público si se decide que son indexables.

### Storefront API

Debe resolver entidades por slug y manejar 404/301/410 según corresponda.

### Next.js

Debe implementar rutas dinámicas, ISR, metadata y canonical.

### Sitemap

Debe generarse desde entidades publicadas e indexables.

### SEO metadata

Debe asociarse a cada URL pública.

### Redirecciones

Se requerirá historial de slugs y manejo de redirecciones 301.

### QA SEO

Se deberá validar:

- URLs limpias;
- canonical;
- sitemap;
- noindex;
- 404/301/410;
- ausencia de duplicados;
- staging no indexable.

---

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba usar URLs limpias basadas en slugs.
2. Se aprueba no usar IDs internos en URLs públicas.
3. Se aprueba la estructura base de URLs.
4. Se aprueba la unicidad de slugs por entidad o namespace.
5. Se aprueba que productos y variantes indexables comparten namespace `/productos/{slug}`.
6. Se aprueba mantener slugs estables.
7. Se aprueba registrar historial de slugs.
8. Se aprueba redirección 301 cuando una URL pública cambie.
9. Se aprueba canonical para prevenir duplicidad.
10. Se aprueba no indexar filtros/facetas por defecto.
11. Se aprueba no indexar staging.
12. Se aprueba que Storefront API resolverá entidades públicas por slug.
13. Se aprueba que Next.js usará rutas dinámicas por slug.
14. Se aprueba que variantes no serán indexables por defecto.
15. Se aprueba que marcas/categorías sin contenido mínimo no se indexarán.

---

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar código;
- crear migraciones;
- crear endpoints;
- implementar sitemap;
- crear tienda Next.js;
- cambiar DNS;
- tocar AWS/staging;
- modificar CORS;
- crear redirecciones reales;
- cambiar slugs actuales;
- crear páginas públicas;
- indexar productos, marcas o categorías;
- definir todas las rutas finales de listas escolares;
- implementar Merchant Center;
- modificar catálogo existente.

---

## Decisión resultante

InkToy usará URLs públicas limpias, estables y basadas en slugs para productos, categorías, marcas y futuras páginas SEO.

El ERP/POS será la fuente de verdad de los slugs. La Storefront API resolverá entidades públicas por slug y Next.js usará rutas dinámicas basadas en esos slugs.

No se usarán IDs internos en URLs públicas. Los productos y variantes indexables compartirán el namespace `/productos/{slug}`. Las variantes no serán indexables por defecto y solo tendrán página propia si existe valor SEO real.

Los cambios de slug deberán registrar historial y generar redirección 301. Los filtros, facetas y staging no serán indexables por defecto.

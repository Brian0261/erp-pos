# Storefront Visual Approval - Fase 2F.1

## Estado

Documento de aprobación visual para Fase 2F.1. Registra las decisiones de diseño aprobadas para el sistema "Catálogo Creativo Profesional" de la Storefront pública de InkToy. No implementa código.

## Dirección visual aprobada

**Nombre del sistema:** Catálogo Creativo Profesional.

**Principios:**
- Mobile-first.
- SEO-first.
- Limpio, profesional, comercial y accesible.
- Sin efectos pesados ni animaciones innecesarias.
- Compatibilidad con Next.js 16 + Tailwind CSS.

## Pantallas aprobadas

| Pantalla | Estado | Descripción |
|----------|--------|-------------|
| Home Mobile | Aprobada | Landing pública con navegación, búsqueda y acceso a categorías/productos destacados. |
| Listado de Categorías | Aprobada | Grid/listado de categorías con cards visuales y CTA "Ver categoría". |
| Estado vacío de listado/categoría | Aprobada | Mensaje claro cuando no hay productos o categoría sin contenido. |
| Listado de Productos con resultados | Aprobada | Grid de product cards con imagen, nombre, precio, badge y CTA "Ver detalle". |
| Detalle de Producto | Aprobada | Imagen principal, nombre, descripción, precio, disponibilidad, badges, chips, breadcrumbs, sticky CTA "Consultar en tienda". |

## Decisiones de branding

- **Logo:** usar siempre el logo real de InkToy. No usar texto generado ni versión deformada.
- **Tono:** comercial, profesional, cercano. Papelería, útiles escolares y pasamanería.
- **Sin branding genérico:** evitar estética de ecommerce genérico o plantillas sin identidad.

## Paleta

| Token | Valor | Uso |
|-------|-------|-----|
| Azul principal | `#0A2540` | Header, footer, textos principales, CTAs secundarios. |
| Amarillo acento | `#FFD166` | Highlights, badges informativos, acentos visuales. |
| Rojo alerta/agotado | `#EF476F` | Badges de agotado, ofertas, alertas. |
| Blanco | `#FFFFFF` | Fondos de cards, contenido principal. |
| Gris suave | `#F5F5F5` | Fondos de sección, estados vacíos. |
| Gris medio | `#9CA3AF` | Textos secundarios, bordes sutiles. |
| Gris oscuro | `#374151` | Textos de cuerpo, labels. |

## Tipografía

| Rol | Fuente | Uso |
|-----|--------|-----|
| Títulos (H1, H2, H3) | **Fraunces** | Encabezados de página, nombres de producto/categoría, section headings. |
| Cuerpo/UI | **DM Sans** | Descripciones, precios, badges, navegación, formularios, breadcrumbs. |

## Componentes visuales aprobados

| Componente | Descripción |
|------------|-------------|
| StorefrontHeader | Logo real, navegación (Inicio, Categorías, Buscar, Tiendas), fondo azul principal. |
| StorefrontFooter | Info de tienda, enlaces básicos, copyright. |
| BottomNavigation | Navegación mobile inferior: Inicio, Categorías, Buscar, Tiendas. |
| Button | Variantes: primario (azul), secundario (borde), texto. Bordes 8px. |
| Badge | Disponible (verde/amarillo), Agotado (rojo), Disponible en tienda (azul). |
| Chip | Filtros horizontales con scroll natural. Bordes redondeados. |
| ProductCard | Imagen, nombre, precio, badge, CTA "Ver detalle". Bordes 8px, sombra suave. |
| CategoryCard | Imagen/icono, nombre, CTA "Ver categoría". |
| EmptyState | Ilustración simple, mensaje claro, CTA de retorno. |
| ProductImageFrame | Contenedor de imagen con proporción estable, fallback sin imagen. |
| Accordion | Secciones colapsables en detalle (descripción, disponibilidad). |
| StickyProductCTA | CTA fijo inferior en detalle de producto con padding/safe area para no tapar contenido. |
| Breadcrumbs | Navegación jerárquica semántica (Inicio > Categoría > Producto). |
| SectionHeading | Títulos de sección con Fraunces, espaciado consistente. |

## Ajustes menores pendientes para implementación

| Ajuste | Detalle |
|--------|---------|
| Sticky CTA safe area | El sticky CTA del detalle de producto no debe tapar contenido; la implementación debe agregar padding inferior/safe area. |
| Chips scroll horizontal | Los chips horizontales deben indicar scroll de forma natural y no cortarse de manera confusa. |
| Productos relacionados | Opcionales para el MVP si no hay lógica backend directa. |
| Noindex/robots | Mantener protección durante desarrollo hasta aprobación explícita de indexación. |
| next/image | Usar next/image con tamaños fijos y proporciones estables para evitar CLS. |
| Jerarquía H1 | Mantener H1 único por página. |
| Breadcrumbs semánticos | Implementar con markup semántico (nav, ol, li, aria-label). |

## Restricciones explícitas

- Sin checkout.
- Sin carrito.
- Sin pagos.
- Sin pedidos online.
- Sin delivery.
- Sin login.
- Sin perfil de cliente.
- Sin panel administrativo.
- Sin funciones internas del ERP.
- Sin Merchant Center.
- Sin marcas públicas como páginas independientes (diferidas).
- Sin filtros avanzados ni sort por precio en MVP.
- Sin sitemap.xml real (diferido).

## Criterios de aceptación para pasar a 2F.2

1. Este documento está aprobado y firmado por el responsable de diseño/negocio.
2. Todos los componentes visuales están definidos con tokens claros.
3. La paleta, tipografía y estilo están documentados.
4. Las restricciones están explícitas y aceptadas.
5. Los ajustes menores están registrados como deuda de implementación.
6. No hay ambigüedad sobre qué se debe construir en 2F.2.

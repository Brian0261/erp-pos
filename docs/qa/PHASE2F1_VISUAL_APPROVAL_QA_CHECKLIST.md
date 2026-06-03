# QA Checklist - Fase 2F.1 Visual Approval

## Estado

Checklist de QA visual para Fase 2F.1. Valida que las decisiones de diseño aprobadas sean consistentes con los principios SEO-first, mobile-first y las restricciones del MVP.

## Branding

- [ ] Logo real de InkToy usado en todas las pantallas.
- [ ] Sin texto generado como logo.
- [ ] Sin versión deformada del logo.
- [ ] Tono visual coherente con papelería, útiles escolares y pasamanería.

## Paleta

- [ ] Azul principal `#0A2540` aplicado en header, footer, CTAs secundarios.
- [ ] Amarillo acento `#FFD166` usado en highlights y badges informativos.
- [ ] Rojo alerta `#EF476F` usado solo en agotado, ofertas y alertas.
- [ ] Blanco y grises suaves como base de fondos y contenido.
- [ ] Contraste suficiente entre texto y fondo (WCAG AA mínimo).

## Tipografía

- [ ] Fraunces usada para títulos (H1, H2, H3, section headings).
- [ ] DM Sans usada para cuerpo, UI, navegación, badges, breadcrumbs.
- [ ] Jerarquía tipográfica clara y consistente.
- [ ] Tamaños legibles en mobile (mínimo 14px cuerpo, 16px+ títulos).

## Componentes

- [ ] StorefrontHeader con logo real y navegación MVP.
- [ ] StorefrontFooter con info básica.
- [ ] BottomNavigation mobile con 4 items: Inicio, Categorías, Buscar, Tiendas.
- [ ] Button con variantes primario, secundario, texto. Bordes 8px.
- [ ] Badge: Disponible, Agotado, Disponible en tienda.
- [ ] Chip con scroll horizontal natural.
- [ ] ProductCard con imagen, nombre, precio, badge, CTA "Ver detalle".
- [ ] CategoryCard con imagen/icono, nombre, CTA "Ver categoría".
- [ ] EmptyState con mensaje claro y CTA de retorno.
- [ ] ProductImageFrame con proporción estable y fallback.
- [ ] Accordion para secciones colapsables.
- [ ] StickyProductCTA con safe area/padding inferior.
- [ ] Breadcrumbs semánticos.
- [ ] SectionHeading con Fraunces.

## Accesibilidad

- [ ] Contraste WCAG AA mínimo en todos los pares texto/fondo.
- [ ] Foco visible en elementos interactivos.
- [ ] Labels en formularios y campos de búsqueda.
- [ ] Landmarks ARIA (header, nav, main, footer).
- [ ] Navegación por teclado funcional.
- [ ] Alt text en imágenes y logos.

## SEO-first

- [ ] H1 único por página.
- [ ] Jerarquía H1 > H2 > H3 coherente.
- [ ] Breadcrumbs semánticos con markup estructurado.
- [ ] Metadata title y description definidas por pantalla.
- [ ] Canonical URLs documentadas.
- [ ] Open Graph básico documentado.

## Mobile-first

- [ ] Diseño aprobado en mobile primero.
- [ ] Versiones tablet y desktop derivadas del mobile.
- [ ] Touch targets mínimo 44x44px.
- [ ] Navegación mobile con BottomNavigation.
- [ ] Scroll horizontal en chips indica contenido adicional.

## Core Web Vitals

- [ ] next/image usado con tamaños fijos.
- [ ] Proporciones estables para evitar CLS.
- [ ] Sin animaciones pesadas ni efectos innecesarios.
- [ ] CSS optimizado con Tailwind.
- [ ] Sin JavaScript innecesario en componentes estáticos.

## Restricciones MVP

- [ ] Sin checkout.
- [ ] Sin carrito.
- [ ] Sin pagos.
- [ ] Sin pedidos online.
- [ ] Sin delivery.
- [ ] Sin login.
- [ ] Sin perfil de cliente.
- [ ] Sin panel administrativo.
- [ ] Sin funciones internas del ERP.
- [ ] Sin Merchant Center.

## Compatibilidad técnica

- [ ] Diseño compatible con Next.js 16 + App Router.
- [ ] Componentes implementables con Tailwind CSS.
- [ ] Tipografías cargables via next/font/google.
- [ ] Paleta mapeable a CSS variables/Tailwind config.
- [ ] Sin dependencia de librerías visuales externas.

## Ajustes menores registrados

- [ ] Sticky CTA safe area documentado.
- [ ] Chips scroll horizontal documentado.
- [ ] Productos relacionados como opcionales documentado.
- [ ] Noindex/robots durante desarrollo documentado.
- [ ] next/image con proporciones estables documentado.
- [ ] H1 único por página documentado.
- [ ] Breadcrumbs semánticos documentados.

## Criterio de salida QA 2F.1

Fase 2F.1 queda lista para pasar a 2F.2 si:

1. Todos los checks de branding, paleta y tipografía están marcados.
2. Todos los componentes visuales están definidos.
3. Accesibilidad, SEO-first y mobile-first están validados.
4. Restricciones MVP están confirmadas.
5. Compatibilidad técnica está asegurada.
6. Ajustes menores están documentados como deuda de implementación.

## Recomendación QA

No avanzar a 2F.2 (Componentes base Next.js + Tailwind) sin aprobación explícita de este documento por el responsable de diseño/negocio.

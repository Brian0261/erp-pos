# ADR-001 — Arquitectura ecommerce SEO-first para InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS es un sistema empresarial para una tienda real de papelería, útiles escolares, artículos escolares y pasamanería. El sistema actual usa Java Spring Boot 3.x, PostgreSQL, frontend interno Angular, Docker local y arquitectura hexagonal estricta.

El ERP/POS debe seguir siendo la fuente de verdad para catálogo, precios, stock, pedidos, ventas y facturación.

La futura tienda online será un canal público de ventas online y debe priorizar SEO, seguridad, escalabilidad, mantenibilidad, bajo riesgo y operación real.

El frontend Angular actual no debe convertirse en la tienda pública porque fue diseñado como sistema interno administrativo para usuarios autenticados, operación diaria, POS, caja, inventario, ventas y facturación. Una tienda pública necesita otra arquitectura: HTML indexable, URLs limpias, SSR/SSG/ISR, Core Web Vitals, metadatos SEO, sitemap, schema.org, seguridad pública y separación clara entre tráfico público y operación interna.

## Problema

Se debe definir la arquitectura base de la futura tienda online antes de implementar código funcional.

La decisión principal es cómo conectar una tienda pública SEO-first con el ERP/POS sin duplicar catálogo, precios o stock; sin exponer endpoints internos; sin construir una tienda difícil de posicionar; y sin acoplar el ecommerce directamente al modelo interno del ERP.

Si se implementa sin una arquitectura clara, los riesgos serían:

- Construir una tienda pública como SPA sin SEO real.
- Exponer endpoints internos del ERP a internet.
- Duplicar catálogo, precios o inventario.
- Generar inconsistencias entre POS, tienda online, Mercado Pago y facturación.
- Crear sobreventa por no separar stock físico, stock reservado y stock disponible online.
- Implementar checkout sin pedidos online ni trazabilidad.
- Tener que reescribir la tienda cuando se agreguen variantes, marcas, slugs, metadata SEO, stock reservado o delivery.

## Decisión

La arquitectura objetivo será:

1. Tienda pública en Next.js, usando SSR, SSG o ISR según el tipo de página.
2. ERP/POS Spring Boot como fuente de verdad para catálogo, precios, stock, pedidos, ventas y facturación.
3. Storefront API/BFF como capa pública/controlada entre la tienda y el ERP/POS.
4. Frontend Angular actual solo para ERP/POS interno.
5. PostgreSQL como base principal del ERP/POS.
6. REST primero para las primeras fases.
7. Eventos con RabbitMQ o AWS SQS en fases futuras.
8. Trabajo inicial en entorno local.
9. AWS/staging se actualizará más adelante cuando exista una fase local estable.

La tienda pública no debe consumir directamente los endpoints internos actuales del ERP/POS. Debe consumir contratos específicos de storefront diseñados para ecommerce, SEO, seguridad, caché y operación pública.

## Arquitectura objetivo

Flujo principal:

```text
Cliente
  ↓
inktoy.pe
  ↓
Next.js ecommerce SEO-first
  ↓
Storefront API / BFF
  ↓
ERP/POS Spring Boot
  ↓
PostgreSQL
```

Flujo futuro con eventos:

```text
ERP/POS Spring Boot
  ↓
Outbox / eventos de dominio
  ↓
RabbitMQ o AWS SQS
  ↓
Procesos futuros: cache, indexación, notificaciones, sincronización ecommerce
```

Separación recomendada de dominios:

| Dominio | Propósito |
|---|---|
| `inktoy.pe` | Tienda pública SEO-first |
| `www.inktoy.pe` | Redirección 301 hacia dominio principal |
| `app.inktoy.pe` o `erp.inktoy.pe` | ERP/POS interno Angular |
| `api.inktoy.pe` | Storefront API / API pública controlada |
| `staging.inktoy.pe` | Staging interno |

La tienda pública debe concentrar autoridad SEO en `inktoy.pe`. El ERP interno debe estar separado para reducir exposición y aplicar políticas de seguridad diferentes.

## Alternativas consideradas

| Alternativa | Motivo por el que no se elige como opción principal |
|---|---|
| Angular SSR | Es posible, pero mezclaría la tienda pública con el frontend interno Angular y aumentaría el acoplamiento. |
| React SPA | No es adecuada para una tienda SEO-first si el catálogo depende del renderizado cliente. |
| Shopify | Puede acelerar ventas, pero introduce riesgo de duplicar catálogo, stock, precios y pedidos fuera del ERP. |
| WooCommerce | Similar a Shopify: rápido para salir, pero con riesgo de duplicidad y mayor superficie de mantenimiento. |
| APIs directas del ERP | No recomendado porque los endpoints internos no están diseñados para exposición pública, caché, SEO ni rate limiting. |
| Astro | Buena opción para contenido y páginas estáticas, pero Next.js ofrece mejor equilibrio para ecommerce, ISR, APIs, carrito y experiencia interactiva. |

## Justificación

Esta arquitectura es la más adecuada para InkToy porque equilibra SEO, seguridad, operación real, escalabilidad y mantenibilidad.

Next.js permite crear páginas indexables para productos, categorías, marcas y futuras listas escolares mediante SSR/SSG/ISR. Esto permite controlar URLs limpias, metadata única, canonical, sitemap, schema.org y Core Web Vitals.

La Storefront API/BFF desacopla la tienda pública del modelo interno del ERP/POS. También permite controlar qué datos se exponen, aplicar caché, rate limiting, validaciones públicas y evitar que el ecommerce dependa directamente de endpoints internos.

El ERP/POS conserva la lógica de negocio y la fuente de verdad: catálogo, precios, stock, pedidos, ventas y facturación. Esto evita duplicidad y reduce inconsistencias.

REST permite avanzar con bajo riesgo en las primeras fases. Los eventos con RabbitMQ o AWS SQS se incorporarán después cuando existan necesidades reales de asincronía, sincronización, invalidación de caché o notificaciones.

## Consecuencias positivas

- La tienda pública nace con arquitectura SEO-first.
- El ERP/POS sigue siendo la fuente de verdad.
- Se evita duplicar catálogo, precios y stock.
- No se exponen endpoints internos del ERP.
- Se separa tráfico público de operación interna.
- Se facilita construir páginas indexables de productos, categorías, marcas y listas escolares.
- Se prepara el camino para Mercado Pago, pedidos online, facturación automática y delivery.
- Se permite trabajar primero en local sin depender de AWS/staging.
- Se deja abierta una evolución futura hacia eventos RabbitMQ/AWS SQS.

## Consecuencias negativas o costos

- Se agrega una nueva aplicación pública Next.js.
- Se debe diseñar y mantener una Storefront API/BFF.
- Habrá más configuración de dominios, CORS, seguridad y despliegues.
- Se deberán definir contratos públicos adicionales.
- El equipo deberá cuidar la sincronización entre ERP, Storefront API y tienda.
- No se podrá avanzar correctamente con checkout hasta tener catálogo online, stock reservado y pedidos online.

Estas complejidades se aceptan porque reducen riesgos mayores: mala indexación, exposición del ERP, duplicidad de datos, sobreventa y retrabajo arquitectónico.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La Storefront API duplica lógica del ERP | Mantener reglas críticas en ERP/POS y usar Storefront API como capa pública/orquestadora. |
| Se duplican productos o precios en la tienda | La tienda solo consume datos derivados del ERP/POS. |
| Se expone inventario interno | La API pública expone disponibilidad comercial, no stock operativo completo. |
| Next.js se implementa antes de contratos claros | Definir contratos Storefront API antes de crear la tienda visual. |
| AWS/staging desactualizado genera confusión | Trabajar inicialmente en local y documentar variables, Docker y feature flags. |
| Se implementan eventos demasiado temprano | Usar REST primero y eventos después. |
| El frontend confía en precios o stock enviados por cliente | Toda validación crítica debe ocurrir server-side. |

## Reglas obligatorias

1. No duplicar catálogo, precios ni stock entre tienda y ERP/POS.
2. No exponer endpoints internos del ERP/POS a la tienda pública.
3. No confiar en precios, stock, descuentos, envío ni totales enviados desde frontend.
4. No implementar checkout ni Mercado Pago antes de tener catálogo online, stock reservado y pedidos online.
5. No usar la tienda antigua como base definitiva.
6. No crear ventas POS directamente desde ecommerce.
7. No actualizar AWS/staging como requisito inmediato.
8. No mezclar Angular ERP interno con tienda pública.
9. No publicar productos online sin datos mínimos SEO y comerciales.
10. No implementar integraciones externas productivas sin feature flags y sandbox previo.

## Impacto técnico

Esta decisión impacta los siguientes módulos futuros:

| Módulo | Impacto |
|---|---|
| Catálogo online | Requiere publicación online, slugs, metadata, imágenes y categorías públicas. |
| Marcas | Se recomienda entidad formal para SEO, filtros y Merchant Center. |
| Variantes | Se recomienda producto padre + variantes con SKU propio y barcode opcional. |
| Stock reservado | Necesario antes de checkout real para evitar sobreventa. |
| Almacén online | Debe ser configurable desde ERP/POS. |
| Precios online | POS por defecto, override opcional para ecommerce. |
| Pedidos online | Nuevo flujo separado de venta POS. |
| Mercado Pago | Integración server-side con webhook e idempotencia. |
| Facturación automática | Pedido pagado debe convertirse en venta y emitir boleta/factura. |
| Delivery nacional | Requiere direcciones, zonas, costos, courier y tracking. |
| SEO | Requiere sitemap, schema, canonical, metadata y control de páginas indexables. |
| Seguridad | Requiere separación de dominios, CORS, rate limiting, WAF/CDN y protección de webhooks. |
| Infraestructura | Futura separación entre tienda, API, ERP interno y staging. |

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba Next.js como tecnología para la tienda pública.
2. Se aprueba que Angular actual queda solo para ERP interno.
3. Se aprueba que el ERP/POS sigue siendo fuente de verdad.
4. Se aprueba Storefront API/BFF como capa pública/controlada.
5. Se aprueba que la tienda no consumirá endpoints internos directamente.
6. Se aprueba trabajar primero en local.
7. Se aprueba postergar AWS/staging hasta tener una fase local estable.
8. Se aprueba REST primero y eventos después.
9. Se documenta la separación de dominios.
10. Se documentan las reglas obligatorias.
11. No quedan alternativas abiertas que bloqueen la Fase 1 de catálogo online.

## Qué NO hacer todavía

En esta etapa no se debe:

- Implementar código.
- Crear tienda Next.js.
- Crear checkout.
- Integrar Mercado Pago.
- Crear pedidos online.
- Crear endpoints nuevos.
- Crear migraciones Flyway.
- Tocar DB.
- Modificar POS.
- Modificar ventas.
- Modificar facturación.
- Tocar AWS/staging.
- Instalar dependencias.
- Usar la tienda antigua como base.
- Construir páginas SEO finales.
- Activar integraciones externas.

## Decisión resultante

InkToy adoptará una arquitectura ecommerce SEO-first basada en Next.js para la tienda pública, Storefront API/BFF como capa pública/controlada y ERP/POS Spring Boot como fuente de verdad. La implementación comenzará localmente por catálogo online y contratos storefront. AWS/staging se actualizará más adelante, cuando exista una fase local estable.

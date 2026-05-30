# ADR Index

## Propósito

Este índice organiza los ADRs de InkToy ERP/POS por serie documental para evitar colisiones de numeración entre decisiones base del ERP/POS y decisiones específicas del ecommerce SEO-first.

## Series documentales

| Serie | Propósito |
|---|---|
| `CORE-ADR-*` | Decisiones fundacionales del ERP/POS base. |
| `ECOM-ADR-*` | Decisiones de la futura tienda online SEO-first y su integración controlada con el ERP/POS. |

Nota de relación:

Los `ECOM-ADR-*` se apoyan sobre las decisiones `CORE-ADR-*`. El ecommerce no redefine la base arquitectónica del ERP/POS; la extiende para el canal online público/controlado.

## ADR Core

| ID | Título | Archivo |
|---|---|---|
| CORE-ADR-001 | Monolito modular con arquitectura hexagonal | `core/CORE-ADR-001-monolito-modular-hexagonal.md` |
| CORE-ADR-002 | Facturación electrónica MVP con adapter mock/sandbox | `core/CORE-ADR-002-facturacion-electronica-mvp.md` |
| CORE-ADR-003 | Outbox de eventos para integración futura con e-commerce | `core/CORE-ADR-003-outbox-eventos-ecommerce-futuro.md` |

## ADR Ecommerce

| ID | Título | Archivo |
|---|---|---|
| ECOM-ADR-001 | Arquitectura ecommerce SEO-first para InkToy | `ecommerce/ECOM-ADR-001-ecommerce-seo-first-architecture.md` |
| ECOM-ADR-002 | Dominios, entornos y estrategia local/staging/producción | `ecommerce/ECOM-ADR-002-domains-environments-local-staging-production.md` |
| ECOM-ADR-003 | Catálogo online y publicación de productos | `ecommerce/ECOM-ADR-003-online-catalog-and-product-publication.md` |
| ECOM-ADR-004 | Marcas | `ecommerce/ECOM-ADR-004-brands.md` |
| ECOM-ADR-005 | Variantes de producto | `ecommerce/ECOM-ADR-005-product-variants.md` |
| ECOM-ADR-006 | Slugs y URLs SEO | `ecommerce/ECOM-ADR-006-slugs-and-seo-urls.md` |
| ECOM-ADR-007 | Imágenes y assets de producto | `ecommerce/ECOM-ADR-007-product-images-and-assets.md` |
| ECOM-ADR-008 | SEO metadata | `ecommerce/ECOM-ADR-008-seo-metadata.md` |
| ECOM-ADR-009 | Almacén online configurable, stock disponible online y stock reservado | `ecommerce/ECOM-ADR-009-online-warehouse-and-stock-reservations.md` |
| ECOM-ADR-010 | Stock reservado, concurrencia y estrategia anti-sobreventa | `ecommerce/ECOM-ADR-010-stock-reservations-concurrency-anti-overselling.md` |
| ECOM-ADR-011 | Precios online, promociones futuras y reglas de cálculo | `ecommerce/ECOM-ADR-011-online-pricing-promotions-and-calculation-rules.md` |
| ECOM-ADR-012 | Pedidos online y lifecycle ecommerce | `ecommerce/ECOM-ADR-012-online-orders-and-ecommerce-lifecycle.md` |
| ECOM-ADR-013 | Mercado Pago, webhook e idempotencia | `ecommerce/ECOM-ADR-013-mercado-pago-webhook-and-idempotency.md` |
| ECOM-ADR-014 | Facturación automática ecommerce | `ecommerce/ECOM-ADR-014-ecommerce-automatic-billing.md` |
| ECOM-ADR-015 | Delivery nacional y couriers | `ecommerce/ECOM-ADR-015-national-delivery-and-couriers.md` |
| ECOM-ADR-016 | Seguridad ecommerce y protección de APIs públicas | `ecommerce/ECOM-ADR-016-ecommerce-security-and-public-api-protection.md` |
| ECOM-ADR-017 | Storefront API pública/controlada | `ecommerce/ECOM-ADR-017-storefront-api-public-controlled.md` |
| ECOM-ADR-018 | Administración ecommerce en Angular interno | `ecommerce/ECOM-ADR-018-angular-internal-ecommerce-administration.md` |
| ECOM-ADR-019 | Merchant Center y SEO técnico avanzado | `ecommerce/ECOM-ADR-019-merchant-center-and-advanced-technical-seo.md` |

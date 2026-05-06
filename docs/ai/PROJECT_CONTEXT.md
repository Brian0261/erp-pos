# Project Context - InkToy ERP/POS

## Descripcion general

InkToy ERP/POS es un sistema para una tienda fisica de articulos escolares y papeleria. El enfoque actual es MVP full-stack estable, listo para piloto interno controlado.

## Tipo de negocio

- Retail fisico (tienda de articulos escolares y papeleria).
- Operacion con venta en caja/POS.
- Control de inventario multi-almacen.
- Compras a proveedores.
- Facturacion electronica MVP (flujo mock/sandbox).

## Stack tecnologico (segun documentacion actual)

- Backend: Java 17 + Spring Boot 3.x (parent 3.5.14).
- Frontend: Angular standalone (Angular 18.2.x).
- Base de datos: PostgreSQL.
- Migraciones: Flyway.
- Seguridad: JWT + control por roles.
- Infra local: Docker Compose.
- CI: GitHub Actions.

## Arquitectura

- Monolito modular con arquitectura hexagonal (puertos y adaptadores).
- Modulos por dominio dentro de un backend unico.
- ADR de referencia:
  - docs/adr/ADR-0001-monolito-modular-hexagonal.md
  - docs/adr/ADR-0002-facturacion-electronica-mvp.md
  - docs/adr/ADR-0003-outbox-eventos-ecommerce-futuro.md

## Modulos implementados

- Seguridad y autenticacion.
- Catalogo.
- Inventario.
- Compras.
- Caja.
- POS y ventas.
- Cotizaciones.
- Facturacion electronica MVP.
- Reportes.
- Integraciones/outbox (publisher mock).

## Roles del sistema

- ADMIN.
- CAJERO.
- ALMACENERO.
- SUPERVISOR.

Nota: permisos por rol se validan en backend y tambien en experiencia de rutas/pantallas frontend segun documentacion QA actual.

## Infraestructura local

Servicios Docker Compose:

- postgres (5432).
- backend (8080).
- frontend Nginx (4200).

Detalles relevantes:

- Frontend dockerizado con Nginx y proxy /api.
- CORS configurable por variable de entorno.
- Flyway activo en arranque backend.

## Estado general del MVP

- MVP funcional y estabilizado para etapa pre-piloto.
- Build backend/frontend y runtime Docker validados en documentacion QA.
- Sin bloqueantes CRITICAL/HIGH abiertos en reportes de estabilizacion recientes.

## Restricciones de negocio y operacion (resumen)

- Seguridad por roles obligatoria.
- Caja: una sola sesion OPEN por usuario.
- Cotizaciones: evitar doble conversion a venta.
- Inventario: stock inicial unico por producto/almacen.
- Facturacion productiva externa aun fuera del alcance actual.

## Limites de alcance actuales

- Integracion real e-commerce: fuera de alcance actual.
- Integracion productiva SUNAT/OSE/PSE: fuera de alcance actual.
- Publicacion real de eventos con broker: diferida.

## Politica de datos

No se debe cargar data real (clientes, ventas o datos sensibles) sin autorizacion explicita del responsable del proyecto.

# MVP Acceptance Checklist

## Plataforma

- [x] Backend compila con `mvn clean verify`
- [x] Frontend compila
- [x] Docker Compose levanta servicios
- [x] Migraciones Flyway aplican correctamente

## Seguridad

- [x] Login JWT operativo
- [x] 401 sin token
- [x] 403 por rol en endpoints protegidos

## Modulos MVP

- [x] Catalogo
- [x] Inventario multialmacen
- [x] Compras y recepcion
- [x] POS, caja, ventas
- [x] Cotizaciones y conversion
- [x] Facturacion electronica MVP (mock)

## Sprint 8

- [x] Reportes backend operativos
- [x] Outbox events operativo (mock publish)
- [x] Healthcheck API y DB
- [x] Documentacion ADR y deployment local

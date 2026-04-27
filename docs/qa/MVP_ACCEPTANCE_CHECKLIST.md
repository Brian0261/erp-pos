# MVP Acceptance Checklist

## Plataforma

- [ ] Backend compila con `mvn clean verify`
- [ ] Frontend compila
- [ ] Docker Compose levanta servicios
- [ ] Migraciones Flyway aplican correctamente

## Seguridad

- [ ] Login JWT operativo
- [ ] 401 sin token
- [ ] 403 por rol en endpoints protegidos

## Modulos MVP

- [ ] Catalogo
- [ ] Inventario multialmacen
- [ ] Compras y recepcion
- [ ] POS, caja, ventas
- [ ] Cotizaciones y conversion
- [ ] Facturacion electronica MVP (mock)

## Sprint 8

- [ ] Reportes backend operativos
- [ ] Outbox events operativo (mock publish)
- [ ] Healthcheck API y DB
- [ ] Documentacion ADR y deployment local


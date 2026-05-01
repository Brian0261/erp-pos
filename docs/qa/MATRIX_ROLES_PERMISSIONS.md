# Matrix Roles & Permissions - Backend MVP

Fecha de auditoria: 2026-04-28
Convencion: SI = permitido, NO = denegado (403), AUTH = requiere token (sin token 401)

| Modulo    | Accion                                                  | ADMIN | CAJERO | ALMACENERO | SUPERVISOR   | Resultado esperado                                      |
| --------- | ------------------------------------------------------- | ----- | ------ | ---------- | ------------ | ------------------------------------------------------- |
| auth      | Login `/auth/login`                                     | SI    | SI     | SI         | SI           | Publico, credenciales validas.                          |
| auth      | Perfil `/auth/me`                                       | SI    | SI     | SI         | SI           | AUTH, sin token 401.                                    |
| catalog   | Crear/editar/desactivar categorias/unidades/productos   | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| catalog   | Consultar categorias/unidades/productos                 | SI    | SI     | SI         | SI           | Lectura operativa general.                              |
| inventory | Crear/desactivar almacenes                              | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| inventory | Consultar almacenes (`GET /warehouses`, `?active=true`) | SI    | SI     | SI         | SI           | Lectura para flujo comercial de conversion.             |
| inventory | Registrar stock inicial/ajuste/transferencia            | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| inventory | Consultar stock                                         | SI    | SI     | SI         | SI           | Todos operativos.                                       |
| inventory | Consultar kardex                                        | SI    | NO     | NO         | SI           | ADMIN/SUPERVISOR.                                       |
| purchases | CRUD proveedores                                        | SI    | NO     | SI         | SI (lectura) | Operacion en ADMIN/ALMACENERO; lectura para SUPERVISOR. |
| purchases | Crear/aprobar/recibir/cancelar OC                       | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| purchases | Consultar OC                                            | SI    | NO     | SI         | SI           | Lectura de control.                                     |
| cash      | Abrir/cerrar caja                                       | SI    | SI     | NO         | SI           | CAJERO/ADMIN/SUPERVISOR.                                |
| cash      | Consultar caja actual                                   | SI    | SI     | NO         | SI           | ALMACENERO sin acceso.                                  |
| sales/POS | Buscar productos POS                                    | SI    | SI     | NO         | SI           | CAJERO/ADMIN/SUPERVISOR.                                |
| sales     | Crear venta                                             | SI    | SI     | NO         | SI           | Requiere caja abierta.                                  |
| sales     | Listar/obtener venta                                    | SI    | SI     | NO         | SI           | Seguridad por endpoint + filtros.                       |
| sales     | Anular venta                                            | SI    | NO     | NO         | SI           | Solo ADMIN/SUPERVISOR.                                  |
| quotes    | Crear/editar/enviar/cancelar/convertir                  | SI    | SI     | NO         | SI           | Operacion comercial.                                    |
| quotes    | Consultar e historial                                   | SI    | SI     | NO         | SI           | -                                                       |
| billing   | Configurar perfil tributario                            | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| billing   | Configurar series                                       | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| billing   | Emitir desde venta (`from-sale`, `generate-xml`)        | SI    | SI     | NO         | SI           | CAJERO autorizado para emision basica.                  |
| billing   | Firmar y enviar                                         | SI    | NO     | NO         | SI           | Solo ADMIN/SUPERVISOR.                                  |
| billing   | Consultar comprobantes/xml/historial                    | SI    | SI     | NO         | SI           | ALMACENERO sin acceso.                                  |
| reports   | Ver reportes ventas/caja/compras/quotes/e-docs          | SI    | NO     | NO         | SI           | ADMIN/SUPERVISOR.                                       |
| reports   | Ver reportes stock bajo/movimientos                     | SI    | NO     | SI         | SI           | Incluye ALMACENERO.                                     |
| outbox    | Listar/ver/mark-published/retry                         | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| health    | `/health` y `/health/db`                                | SI    | SI     | SI         | SI           | Publico (sin token).                                    |

## Evidencia runtime

- Validado con tokens reales en Docker local:
  - Sin token en `/api/v1/auth/me` => 401
  - CAJERO en `/api/v1/integrations/outbox-events` => 403
  - ALMACENERO en `/api/v1/cash-registers/current` => 403
  - ADMIN en `/api/v1/reports/sales` => 200
  - CAJERO en `GET /api/v1/warehouses?active=true` => 200 (11 almacenes activos)
  - CAJERO en `POST /api/v1/warehouses` => 403
  - CAJERO en `DELETE /api/v1/warehouses/{id}` => 403
  - ADMIN en `/api/v1/integrations/outbox-events` => 200
  - SUPERVISOR en `/api/v1/billing/company-profile` => 403
  - SUPERVISOR en `POST /api/v1/sales/{id}/void` => 200
  - CAJERO en `POST /api/v1/quotes/{id}/convert-to-sale` (primer intento) => 200
  - Segundo `POST /api/v1/quotes/{id}/convert-to-sale` => 409 (`Quote already converted`)
  - SUPERVISOR en `POST /api/v1/billing/documents/{id}/sign` => 200
  - SUPERVISOR en `POST /api/v1/billing/documents/{id}/send` => 200

## Frontend Route Hardening (Angular RBAC)

Fecha de aplicacion: 2026-04-29
Convencion frontend: ruta no permitida por rol => redireccion a `/dashboard`.

| Grupo de rutas Angular                                                                                                                            | ADMIN | CAJERO | ALMACENERO | SUPERVISOR | Regla frontend aplicada |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ---------- | ---------- | ----------------------- |
| `/dashboard`                                                                                                                                      | SI    | SI     | SI         | SI         | Ruta base autenticada.  |
| `/pos`, `/caja`, `/ventas`, `/ventas/:id`, `/cotizaciones/**`, `/facturacion/comprobantes/**`, `/facturacion/emitir/:saleId`                      | SI    | SI     | NO         | SI         | Comercial/caja.         |
| `/ventas/:id/anular`                                                                                                                              | SI    | NO     | NO         | SI         | Anulacion restringida.  |
| `/catalogo/**`                                                                                                                                    | SI    | NO     | SI         | SI         | Consistente con menu.   |
| `/inventario/stock`                                                                                                                               | SI    | SI     | SI         | SI         | Stock operativo.        |
| `/inventario/almacenes`                                                                                                                           | SI    | NO     | SI         | SI         | Segun menu actual.      |
| `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`                                                                  | SI    | NO     | SI         | NO         | Operacion inventario.   |
| `/inventario/kardex`                                                                                                                              | SI    | NO     | NO         | SI         | Seguimiento supervisor. |
| `/compras/proveedores`, `/compras/ordenes`, `/compras/ordenes/:id`                                                                                | SI    | NO     | SI         | SI         | Consulta/gestion base.  |
| `/compras/ordenes/nueva`, `/compras/ordenes/:id/editar`, `/compras/ordenes/:id/recibir`                                                           | SI    | NO     | SI         | NO         | Acciones de gestion OC. |
| `/facturacion/configuracion`, `/facturacion/series`                                                                                               | SI    | NO     | NO         | NO         | Configuracion critica.  |
| `/reportes`                                                                                                                                       | SI    | NO     | SI         | SI         | Dashboard reportes.     |
| `/reportes/stock-bajo`, `/reportes/movimientos-inventario`                                                                                        | SI    | NO     | SI         | SI         | Reportes inventario.    |
| `/reportes/ventas`, `/reportes/caja`, `/reportes/compras`, `/reportes/productos-mas-vendidos`, `/reportes/cotizaciones`, `/reportes/comprobantes` | SI    | NO     | NO         | SI         | Reportes comerciales.   |
| `/integraciones/eventos`, `/integraciones/eventos/:id`                                                                                            | SI    | NO     | NO         | NO         | Outbox solo ADMIN.      |

### Ambiguedades resueltas

- Las subrutas de compras de accion (`nueva`, `editar`, `recibir`) se restringen a `ADMIN` y `ALMACENERO` por coherencia con la matriz backend, aunque la vista de listado de compras siga visible para `SUPERVISOR`.
- La ruta `/ventas/:id/anular` se restringe a `ADMIN` y `SUPERVISOR` por seguridad de negocio.
- En rutas sin sesion valida, se mantiene prioridad de autenticacion: redireccion a `/login`.

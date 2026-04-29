# Matrix Roles & Permissions - Backend MVP

Fecha de auditoria: 2026-04-28
Convencion: SI = permitido, NO = denegado (403), AUTH = requiere token (sin token 401)

| Modulo    | Accion                                                | ADMIN | CAJERO | ALMACENERO | SUPERVISOR   | Resultado esperado                                      |
| --------- | ----------------------------------------------------- | ----- | ------ | ---------- | ------------ | ------------------------------------------------------- |
| auth      | Login `/auth/login`                                   | SI    | SI     | SI         | SI           | Publico, credenciales validas.                          |
| auth      | Perfil `/auth/me`                                     | SI    | SI     | SI         | SI           | AUTH, sin token 401.                                    |
| catalog   | Crear/editar/desactivar categorias/unidades/productos | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| catalog   | Consultar categorias/unidades/productos               | SI    | SI     | SI         | SI           | Lectura operativa general.                              |
| inventory | Crear/desactivar almacenes                            | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| inventory | Registrar stock inicial/ajuste/transferencia          | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| inventory | Consultar stock                                       | SI    | SI     | SI         | SI           | Todos operativos.                                       |
| inventory | Consultar kardex                                      | SI    | NO     | NO         | SI           | ADMIN/SUPERVISOR.                                       |
| purchases | CRUD proveedores                                      | SI    | NO     | SI         | SI (lectura) | Operacion en ADMIN/ALMACENERO; lectura para SUPERVISOR. |
| purchases | Crear/aprobar/recibir/cancelar OC                     | SI    | NO     | SI         | NO           | ADMIN/ALMACENERO.                                       |
| purchases | Consultar OC                                          | SI    | NO     | SI         | SI           | Lectura de control.                                     |
| cash      | Abrir/cerrar caja                                     | SI    | SI     | NO         | SI           | CAJERO/ADMIN/SUPERVISOR.                                |
| cash      | Consultar caja actual                                 | SI    | SI     | NO         | SI           | ALMACENERO sin acceso.                                  |
| sales/POS | Buscar productos POS                                  | SI    | SI     | NO         | SI           | CAJERO/ADMIN/SUPERVISOR.                                |
| sales     | Crear venta                                           | SI    | SI     | NO         | SI           | Requiere caja abierta.                                  |
| sales     | Listar/obtener venta                                  | SI    | SI     | NO         | SI           | Seguridad por endpoint + filtros.                       |
| sales     | Anular venta                                          | SI    | NO     | NO         | SI           | Solo ADMIN/SUPERVISOR.                                  |
| quotes    | Crear/editar/enviar/cancelar/convertir                | SI    | SI     | NO         | SI           | Operacion comercial.                                    |
| quotes    | Consultar e historial                                 | SI    | SI     | NO         | SI           | -                                                       |
| billing   | Configurar perfil tributario                          | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| billing   | Configurar series                                     | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| billing   | Emitir desde venta (`from-sale`, `generate-xml`)      | SI    | SI     | NO         | SI           | CAJERO autorizado para emision basica.                  |
| billing   | Firmar y enviar                                       | SI    | NO     | NO         | SI           | Solo ADMIN/SUPERVISOR.                                  |
| billing   | Consultar comprobantes/xml/historial                  | SI    | SI     | NO         | SI           | ALMACENERO sin acceso.                                  |
| reports   | Ver reportes ventas/caja/compras/quotes/e-docs        | SI    | NO     | NO         | SI           | ADMIN/SUPERVISOR.                                       |
| reports   | Ver reportes stock bajo/movimientos                   | SI    | NO     | SI         | SI           | Incluye ALMACENERO.                                     |
| outbox    | Listar/ver/mark-published/retry                       | SI    | NO     | NO         | NO           | Solo ADMIN.                                             |
| health    | `/health` y `/health/db`                              | SI    | SI     | SI         | SI           | Publico (sin token).                                    |

## Evidencia runtime

- Validado con tokens reales en Docker local:
  - Sin token en `/api/v1/auth/me` => 401
  - CAJERO en `/api/v1/integrations/outbox-events` => 403
  - ALMACENERO en `/api/v1/cash-registers/current` => 403
  - ADMIN en `/api/v1/reports/sales` => 200
  - CAJERO en `/api/v1/billing/series` => 403
  - ADMIN en `/api/v1/integrations/outbox-events` => 200
  - SUPERVISOR en `/api/v1/billing/company-profile` => 403
  - SUPERVISOR en `POST /api/v1/sales/{id}/void` => 200
  - ADMIN en `POST /api/v1/quotes/{id}/convert-to-sale` => 200
  - Segundo `POST /api/v1/quotes/{id}/convert-to-sale` => 409 (bloqueo de doble conversion)
  - SUPERVISOR en `POST /api/v1/billing/documents/{id}/sign` => 200
  - SUPERVISOR en `POST /api/v1/billing/documents/{id}/send` => 200

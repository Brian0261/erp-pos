# Frontend QA Findings

Fecha de auditoria: 2026-04-28
Alcance: Angular frontend, integracion REST real, Docker/Nginx, rutas SPA y permisos visuales

| ID     | Pantalla                   | Severidad | Problema                                                                                                     | Causa                                                                    | Archivo                                                                                                                            | Accion tomada                                                                                                          | Estado                    |
| ------ | -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| FE-001 | Global (todos los modulos) | HIGH      | Base URL hardcodeada a localhost:8080, no alineada al proxy /api de Nginx                                    | Configuracion de environment orientada a dev local directo al backend    | frontend/src/environments/environment.ts                                                                                           | Se cambio apiUrl a /api/v1 para consumir backend via proxy en Docker/Nginx                                             | Cerrado                   |
| FE-002 | Dev server (npm start)     | HIGH      | Al usar apiUrl relativo, ng serve quedaria sin proxy y romperia llamadas API en desarrollo                   | Faltaba proxyConfig en angular serve                                     | frontend/angular.json, frontend/proxy.conf.json                                                                                    | Se agrego proxy.conf.json y angular serve options.proxyConfig para mantener compatibilidad con npm start               | Cerrado                   |
| FE-003 | Docker/Nginx runtime       | LOW       | Navegar por 127.0.0.1 puede provocar `Invalid CORS request` en `/api/v1/auth/login` en pruebas browser       | Politica CORS del backend acepta `localhost` y no siempre `127.0.0.1`    | N/A (entorno local)                                                                                                                | Estandar de QA actualizado: validar navegador en `http://localhost:4200` y detener `ng serve` si hay choque de puertos | Abierto (deuda operativa) |
| FE-004 | UX login                   | LOW       | Mensaje de error de login es generico y no distingue 401/500                                                 | Manejo simplificado en componente                                        | frontend/src/app/features/login/login.component.ts                                                                                 | No se modifica por no ser bloqueante; se recomienda homogeneizar con helper de errores                                 | Abierto (deuda tecnica)   |
| FE-005 | Errores HTTP helper        | LOW       | Existe helper duplicado por modulo en vez de uno compartido                                                  | Decision previa de estructura por feature                                | frontend/src/app/features/\*/data/http-error-message.ts                                                                            | No se modifica para evitar refactor no solicitado; se documenta para deuda tecnica                                     | Abierto (deuda tecnica)   |
| FE-006 | Seguridad rutas Angular    | HIGH      | Rutas protegidas solo por autenticacion; usuario autenticado podia forzar URL a modulos no visibles en menu  | Faltaba guard por rol en routing frontend                                | frontend/src/app/app.routes.ts, frontend/src/app/core/guards/role.guard.ts                                                         | Se implemento roleGuard con `allowedRoles` por ruta y redireccion a `/dashboard` en accesos no permitidos              | Cerrado                   |
| FE-007 | Inventario (operaciones)   | LOW       | Ajustes/transferencias permiten seleccionar productos inactivos y backend responde `422 Product is inactive` | El listado de productos en formularios operativos no filtra solo activos | frontend/src/app/features/inventory/adjustments-page.component.ts, frontend/src/app/features/inventory/transfers-page.component.ts | Validado manejo controlado (422 + mensaje visible); se recomienda filtrar activos en backlog UX                        | Abierto (deuda UX)        |

## Resumen de severidades

- CRITICAL: 0
- HIGH: 3 (corregidos)
- MEDIUM: 0
- LOW: 4 (documentados)

## Notas

- No se tocaron endpoints backend ni reglas de negocio.
- No se crearon nuevos modulos funcionales.
- La correccion aplicada mejora integracion full-stack y evita desalineacion frontend/backend en Docker.
- Endurecimiento RBAC frontend aplicado sin cambios en backend ni servicios Angular.
- Bloque E2 Inventario (visual-only) validado por roles sin nuevos hallazgos funcionales en frontend.
- Smoke funcional E2 inventario ejecutado con operaciones reales (ajuste IN/OUT, ajuste invalido controlado, transferencia y kardex) sin errores 500.
- Bloque E3 POS/Caja/Ventas (visual-only) validado con smoke por roles (ADMIN/CAJERO/ALMACENERO/SUPERVISOR) sin nuevos hallazgos funcionales ni de seguridad.
- Smoke transaccional E3 (venta real + detalle + anulacion + stock + kardex) completado sin nuevos defectos frontend; se observaron solo respuestas esperadas de pruebas negativas (`403`).
- Bloque E4 Compras/Proveedores (visual-only) validado por rutas y matriz RBAC (frontend + API) sin nuevos hallazgos funcionales ni de seguridad.
- Smoke transaccional E4 (crear proveedor, crear/ aprobar/ recibir OC, validar stock y kardex `PURCHASE_IN`) completado sin defectos frontend; solo `403` esperados en pruebas negativas por rol.
- Bloque E5 Cotizaciones (visual-only) validado con flujo completo (crear, editar, enviar, convertir, historial y bloqueo de doble conversion `409`) sin nuevos hallazgos funcionales ni de seguridad.

# Frontend QA Findings

Fecha de auditoria: 2026-04-28
Alcance: Angular frontend, integracion REST real, Docker/Nginx, rutas SPA y permisos visuales

| ID     | Pantalla                   | Severidad | Problema                                                                                                    | Causa                                                                 | Archivo                                                 | Accion tomada                                                                                            | Estado                    |
| ------ | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------- |
| FE-001 | Global (todos los modulos) | HIGH      | Base URL hardcodeada a localhost:8080, no alineada al proxy /api de Nginx                                   | Configuracion de environment orientada a dev local directo al backend | frontend/src/environments/environment.ts                | Se cambio apiUrl a /api/v1 para consumir backend via proxy en Docker/Nginx                               | Cerrado                   |
| FE-002 | Dev server (npm start)     | HIGH      | Al usar apiUrl relativo, ng serve quedaria sin proxy y romperia llamadas API en desarrollo                  | Faltaba proxyConfig en angular serve                                  | frontend/angular.json, frontend/proxy.conf.json         | Se agrego proxy.conf.json y angular serve options.proxyConfig para mantener compatibilidad con npm start | Cerrado                   |
| FE-003 | Docker/Nginx runtime       | LOW       | localhost en Windows puede resolver a ::1 y apuntar a proceso local node si existe conflicto de puerto 4200 | Conflicto entre listener local (node) y docker publish                | N/A (entorno local)                                     | Documentado como riesgo operativo; validaciones oficiales realizadas por 127.0.0.1:4200                  | Abierto (deuda operativa) |
| FE-004 | UX login                   | LOW       | Mensaje de error de login es generico y no distingue 401/500                                                | Manejo simplificado en componente                                     | frontend/src/app/features/login/login.component.ts      | No se modifica por no ser bloqueante; se recomienda homogeneizar con helper de errores                   | Abierto (deuda tecnica)   |
| FE-005 | Errores HTTP helper        | LOW       | Existe helper duplicado por modulo en vez de uno compartido                                                 | Decision previa de estructura por feature                             | frontend/src/app/features/\*/data/http-error-message.ts | No se modifica para evitar refactor no solicitado; se documenta para deuda tecnica                       | Abierto (deuda tecnica)   |

## Resumen de severidades

- CRITICAL: 0
- HIGH: 2 (corregidos)
- MEDIUM: 0
- LOW: 3 (documentados)

## Notas

- No se tocaron endpoints backend ni reglas de negocio.
- No se crearon nuevos modulos funcionales.
- La correccion aplicada mejora integracion full-stack y evita desalineacion frontend/backend en Docker.

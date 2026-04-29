# Backend QA Findings - Auditoria MVP

Fecha de auditoria: 2026-04-28
Scope: backend Spring Boot + Docker local + Flyway + RBAC + endpoints API

## Resumen ejecutivo
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 3
- LOW: 2
- Estado general: **Backend estable para auditoria frontend**

## Hallazgos

| ID | Modulo | Severidad | Descripcion | Causa | Archivo afectado | Accion tomada | Estado | Commit sugerido |
|---|---|---|---|---|---|---|---|---|
| QA-001 | build/tests | CRITICAL | No se detectaron fallos en build ni tests. | N/A | N/A | Ejecutado `mvn clean test` y `mvn clean verify`, ambos SUCCESS. | Cerrado | N/A |
| QA-002 | docker/startup | CRITICAL | No se detectaron fallos de arranque ni Flyway roto. | N/A | N/A | Ejecutado `docker compose up --build -d` + logs backend sin errores bloqueantes. | Cerrado | N/A |
| QA-003 | security/RBAC | HIGH | No se detectaron rutas criticas con permisos incorrectos en muestra runtime. | N/A | N/A | Validacion manual: 401 sin token, 403 por rol (CAJERO/ALMACENERO), 200 con ADMIN. | Cerrado | N/A |
| QA-004 | reports | MEDIUM | Endpoints de reportes son lista agregada (sin paginacion) para datasets potencialmente grandes. | Decisiones MVP de simplicidad y menor complejidad de UI inicial. | `backend/src/main/java/com/erppos/backend/erp/reports/adapter/rest/ReportsController.java` | No se modifica por no ser bloqueante de piloto. Documentado como deuda tecnica. | Abierto | `chore(reports): add pagination for high-volume report endpoints` |
| QA-005 | CORS/hardening | MEDIUM | CORS restringido solo a `http://localhost:4200`; puede requerir ajuste por ambiente en despliegues futuros. | Configuracion unica para entorno local MVP. | `backend/src/main/java/com/erppos/backend/erp/security/adapter/security/SecurityConfig.java` | No se modifica para no alterar contrato actual MVP; dejar parametrizable por perfil. | Abierto | `chore(security): externalize allowed CORS origins by profile` |
| QA-006 | observability | LOW | Logging y healthcheck son basicos; no hay trazas estructuradas por modulo ni metricas operativas. | Alcance MVP priorizo funcionalidad sobre observabilidad avanzada. | `backend/src/main/java/com/erppos/backend/erp/shared/adapter/rest/HealthController.java` | Sin cambios funcionales. Documentado para hardening post-MVP. | Abierto | `chore(obs): add structured logs and module-level metrics` |
| QA-007 | contracts | LOW | Mezcla intencional de endpoints paginados y listas simples; requiere guia de consumo para frontend nuevo. | Contratos definidos por sprint de manera incremental. | `docs/qa/MATRIX_API_ENDPOINTS.md` | Matriz de contratos actualizada para evitar ambiguedad de consumo. | Mitigado | `docs(qa): clarify pagination contracts per endpoint` |
| QA-008 | contracts/pagination | MEDIUM | Spring Data registra warning por serializacion directa de `PageImpl`; estructura JSON puede cambiar entre versiones y afectar frontend. | Uso directo de `Page<T>` en respuestas REST sin `PagedModel`/DTO de paginacion estable. | `backend/src/main/java/com/erppos/backend/erp/catalog/adapter/rest/ProductController.java`, `backend/src/main/java/com/erppos/backend/erp/inventory/adapter/rest/InventoryController.java` | No se cambia en esta estabilizacion para no romper contratos MVP; se documenta deuda tecnica prioritaria. | Abierto | `refactor(api): wrap paginated responses in stable dto` |

## Hallazgos cerrados historicos relevantes (verificados)
- Conflicto de beans `auditUserProvider` entre modulos: resuelto con nombres explicitos por modulo.
- Error SQL de filtros con parametros nulos en listados de facturacion: resuelto en repositorio/adapter de billing.
- Conversion de cotizacion con estados invalidos devolviendo 500: mapeado a 409/422 en manejo de negocio.

## Decision de estabilizacion
- Se corrigen solo CRITICAL/HIGH. En esta auditoria no hubo defectos abiertos de ese nivel.
- MEDIUM/LOW quedan como deuda tecnica planificada para post-MVP sin afectar piloto.

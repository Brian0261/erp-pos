# Current Status - InkToy ERP/POS

## Estado actual

Proyecto en estado pre-piloto con MVP funcional, estabilizado y con validaciones tecnicas/QA documentadas.

## Deudas tecnicas cerradas (segun documentacion actual)

- BT-001: una sola caja OPEN por usuario.
- BT-002: bloqueo de doble conversion concurrente de cotizacion.
- BT-003: stock inicial unico por producto/almacen.
- BT-004: hardening/control de usuarios seed.
- BT-006 Fase 1: endpoints /api/v2 con contrato paginado estable.
- BT-007A/B: limites seguros en reportes.
- BT-008: CORS configurable por ambiente.
- BT-009: validaciones de integracion HTTP/RBAC/DB real.
- BT-010: documentacion tecnica alineada.

## Deudas diferidas

- BT-005: despacho automatico de outbox desde modulos de negocio.
- BT-006 (frontend): migrar consumidores Angular de /api/v1 a /api/v2.
- BT-007C: indices/tuning avanzado de reportes con metricas reales.

## Estado frontend

- Branding InkToy aplicado.
- Sidebar avanzado operativo (grupos, compacto/expandido, scroll interno, logout fijo).
- Modo claro/oscuro con persistencia local.
- Rutas protegidas y experiencia RBAC validadas en QA.
- Frontend desplegado via Nginx con proxy /api.

## Estado backend

- Build y verify exitosos en corridas de referencia QA.
- Seguridad JWT/RBAC operativa.
- Endpoints principales de modulos MVP operativos.
- Contrato legado v1 convive con contrato estable v2 para paginacion.

## Estado QA

- Sin hallazgos CRITICAL/HIGH abiertos en reportes de estabilizacion.
- Persisten deudas LOW/MEDIUM de hardening/operacion no bloqueantes.
- Checklist de regresion actualizado con validaciones por rol y smoke full-stack.

## Estado Docker y Flyway

- Docker Compose operativo con postgres/backend/frontend.
- Flyway aplicado en arranque backend, con migraciones versionadas en uso.
- Evidencia de runtime saludable en reportes QA recientes.

## Advertencias importantes antes de seguir trabajando

1. Respetar alcance de cada tarea para evitar regresiones cruzadas.
2. No usar datos reales sin autorizacion explicita.
3. Evitar mezclar cambios funcionales con cambios de estilo/documentacion.
4. Mantener compatibilidad temporal v1/v2 mientras frontend no migre completo.
5. En QA frontend, controlar riesgo de cache visual (segun protocolo UX-011).
6. No realizar commits/tags/push automaticos desde agentes.

## Siguiente etapa recomendada

Preparar carga inicial real controlada (catalogo, almacenes, stock base y parametros operativos), solo cuando exista autorizacion explicita del responsable de negocio/tecnico.

## Nota de alcance

Este estado se basa en README, ADR y reportes QA actuales del repositorio. Cualquier punto no cubierto por evidencia adicional queda "pendiente de verificar".

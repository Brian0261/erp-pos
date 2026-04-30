---
name: error-handling-safe
description: Diseña estrategias de manejo de errores resilientes y seguras (REST, servicios, jobs, async) sin ejecutar cambios destructivos ni ocultar fallos críticos.
---

# Error Handling Safe

Skill para definir patrones de manejo de errores con foco en confiabilidad operacional, trazabilidad y seguridad.

## Reglas de seguridad (obligatorias)
1. No suprimir errores críticos silenciosamente.
2. No capturar `Exception`/`Error` de forma global sin clasificación y re-raise adecuado.
3. No loguear secretos, tokens, PII o payloads sensibles.
4. No proponer retries infinitos ni sin backoff/jitter.
5. No convertir todos los errores en `200 OK` o respuestas ambiguas.
6. No ejecutar scripts/servicios de diagnóstico automáticamente sin aprobación explícita.

## Cuándo usar
- Diseñar manejo de errores en nuevas features.
- Mejorar resiliencia en APIs/consumidores de servicios.
- Revisar contratos de error antes de release.
- Definir estrategias de retry, circuit breaker, fallback y observabilidad.

## Flujo recomendado
1. Clasificar errores: esperados vs inesperados; recuperables vs no recuperables.
2. Definir contrato de error por capa (dominio, aplicación, transporte/API).
3. Diseñar estrategia por tipo: fail fast, retry, fallback, circuit breaker.
4. Definir observabilidad: logs estructurados, métricas, alertas, correlación.
5. Validar con checklist de `assets/error-handling-checklist.md`.
6. Entregar plan de pruebas de error paths (unit + integración + caos controlado).

## Entregables obligatorios
- Taxonomía de errores y códigos.
- Política de retries (máx intentos, backoff, jitter, timeouts).
- Política de degradación controlada.
- Política de logging seguro (redacción de datos sensibles).
- Matriz de pruebas de fallos.

## Referencias internas
- `assets/error-handling-checklist.md`
- `references/language-patterns.md`
- `references/reliability-patterns.md`

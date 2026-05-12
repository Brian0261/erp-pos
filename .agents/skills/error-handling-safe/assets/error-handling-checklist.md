# Error Handling Checklist (Safe)

## Clasificación
- [ ] Errores esperados y no esperados diferenciados.
- [ ] Errores recuperables/no recuperables definidos.
- [ ] Códigos de error consistentes por dominio.

## Contratos de API
- [ ] Formato de error consistente (`code`, `message`, `details`, `trace_id`, `timestamp`).
- [ ] Status codes correctos (4xx cliente, 5xx servidor).
- [ ] 401 vs 403 correctamente diferenciados.

## Resiliencia
- [ ] Retry solo en errores transitorios.
- [ ] Retry con límite + backoff + jitter.
- [ ] Circuit breaker en dependencias inestables.
- [ ] Fallback explícito y trazable.
- [ ] Timeouts definidos por operación.

## Seguridad
- [ ] Logs sin secretos/PII.
- [ ] Mensajes de error no filtran implementación interna.
- [ ] Trazas sensibles protegidas por entorno/rol.

## Observabilidad
- [ ] Logs estructurados con `trace_id`/`correlation_id`.
- [ ] Métricas de error-rate, retry-rate, timeout-rate.
- [ ] Alertas para degradación y picos de fallos.

## Testing
- [ ] Unit tests para ramas de error.
- [ ] Integración para fallos de dependencias.
- [ ] Pruebas de idempotencia en reintentos.
- [ ] Casos límite y race conditions cubiertos.

# API Design Checklist (Safe)

## REST Core
- [ ] Recursos en sustantivo plural y naming consistente.
- [ ] Métodos HTTP correctos (GET/POST/PUT/PATCH/DELETE).
- [ ] Status codes correctos (200/201/204/4xx/5xx).
- [ ] Paginación definida (default + máximo).
- [ ] Filtros/sorting/search/field selection documentados.
- [ ] Versionado definido + política de deprecación.
- [ ] Error format consistente con códigos internos.

## Security
- [ ] Auth definida (Bearer/API key/OAuth).
- [ ] 401 vs 403 correctamente usados.
- [ ] Rate limits y `Retry-After` definidos.
- [ ] Validación de input y sanitización.
- [ ] No secretos en responses/URLs.
- [ ] CORS y trusted hosts seguros para producción.

## Operación
- [ ] OpenAPI/Swagger actualizado.
- [ ] Tests de integración y escenarios de error.
- [ ] Monitoreo: logs, métricas, health checks.
- [ ] Performance: N+1, caching, queries pesadas.

## GraphQL (si aplica)
- [ ] Schema-first, tipos/input/payload consistentes.
- [ ] DataLoader para evitar N+1.
- [ ] Query depth y complexity limits.
- [ ] Paginación (Relay/offset) definida.
- [ ] Deprecations marcadas en schema.

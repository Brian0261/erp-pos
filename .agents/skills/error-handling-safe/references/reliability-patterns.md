# Reliability Patterns (Condensed)

- Retry: solo transitorios, con backoff exponencial + jitter.
- Circuit breaker: evita cascadas cuando dependencia cae.
- Bulkhead: aislar recursos para evitar colapso total.
- Graceful degradation: mantener servicio mínimo útil.
- Error aggregation: recolectar validaciones múltiples en una sola respuesta.

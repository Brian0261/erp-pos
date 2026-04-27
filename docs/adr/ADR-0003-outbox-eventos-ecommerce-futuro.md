# ADR-0003: Outbox de eventos para integracion futura con e-commerce

## Contexto

El MVP requiere preparar integracion eventual con un e-commerce externo sin acoplar el core ERP/POS a brokers o proveedores cloud en esta etapa.

## Decision

Se implementa patron Outbox en Sprint 8:

- tabla `outbox_events` para persistir eventos de negocio;
- estados `PENDING`, `PUBLISHED`, `FAILED`;
- endpoints administrativos para consulta y reproceso;
- `MockOutboxPublisherAdapter` para simulacion de publicacion.

No se integra publicacion real con RabbitMQ ni AWS SQS en este sprint.

## Alternativas evaluadas

1. Publicacion directa sin outbox.
   - Descartada por riesgo de inconsistencias en fallos transaccionales.

2. Integracion real inmediata con broker.
   - Descartada por complejidad operativa fuera del objetivo MVP.

3. No registrar eventos.
   - Descartada porque retrasa la integracion futura y trazabilidad.

## Consecuencias

- Se conserva consistencia eventual y trazabilidad de eventos.
- Se facilita migrar a broker real reemplazando el publisher mock por adapters concretos.
- Se requiere siguiente sprint para despacho asíncrono automatizado y observabilidad avanzada.


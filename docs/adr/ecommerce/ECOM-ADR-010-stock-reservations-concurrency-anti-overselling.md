# ADR-010 — Stock reservado, concurrencia y estrategia anti-sobreventa para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, ventas, pedidos, facturación y operación interna. La futura tienda online SEO-first usará Next.js, consumirá datos mediante Storefront API/BFF y no deberá duplicar catálogo, precios ni stock fuera del ERP/POS.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.
- ADR-007: Imágenes y assets de producto.
- ADR-008: SEO metadata.
- ADR-009: Almacén online configurable, stock disponible online y stock reservado.

El ADR-009 definió que:

- ERP/POS será la fuente de verdad del stock.
- Existirá un almacén online configurable.
- El almacén online inicial podrá compartirse con POS.
- El stock disponible online se calculará server-side.
- La fórmula base será:

```text
stockDisponibleOnline = stockFisicoAlmacenOnline - stockReservadoOnline - stockSeguridad
```

- El stock se controlará por variante vendible cuando existan variantes.
- Existirá stock reservado para pedidos online.
- Existirá stock de seguridad configurable.
- No se permitirá compra de productos agotados.
- El frontend nunca decidirá stock ni disponibilidad final.
- No se creará preferencia Mercado Pago sin validar stock server-side.
- Las operaciones críticas de stock, reserva, pago y confirmación deberán ser transaccionales, idempotentes y protegidas contra condiciones de carrera.

Este ADR profundiza específicamente en cómo funcionarán las reservas, cómo se evitará la sobreventa, cómo se manejará concurrencia, cómo se procesarán webhooks de Mercado Pago y cómo se impedirá doble reserva, doble confirmación, doble liberación o venta de stock inexistente.

En una empresa real, una sobreventa no es solo un error técnico. Puede generar cancelaciones, devoluciones, reclamos, pérdida de confianza, trabajo manual, errores de facturación y problemas operativos.

## Problema

Se debe definir la estrategia técnica para manejar stock reservado y evitar sobreventa en escenarios reales de concurrencia.

La decisión debe resolver:

- cuándo se crea una reserva;
- cómo se confirma una reserva;
- cómo se libera una reserva;
- cómo expira una reserva;
- cómo se audita una reserva;
- cómo se evitan condiciones de carrera;
- cómo interactúan POS y ecommerce cuando comparten almacén;
- cómo se procesan webhooks duplicados o tardíos de Mercado Pago;
- cómo se evita confirmar o liberar una misma reserva más de una vez;
- cómo se evita convertir un pedido a venta sin stock confirmado;
- cómo se evita emitir comprobante para un pedido con incidencia de stock.

Riesgos de no tener reservas robustas:

- dos clientes compran la última unidad;
- POS vende una unidad que ya estaba reservada online;
- Mercado Pago aprueba un pago cuando el stock ya no existe;
- una reserva vencida sigue bloqueando stock;
- una reserva liberada se vuelve a liberar;
- una reserva confirmada se confirma más de una vez;
- un webhook duplicado genera doble procesamiento;
- un pedido se convierte a venta sin stock real;
- se emite comprobante de una venta que no puede despacharse.

## Decisión

Se decide implementar una estrategia basada en reservas explícitas de stock, con operaciones transaccionales, idempotentes y protegidas contra concurrencia.

Decisiones principales:

1. Usar reservas explícitas de stock para pedidos online.
2. Crear reserva antes de crear preferencia de pago en Mercado Pago.
3. Confirmar reserva solo cuando exista pago aprobado validado server-side.
4. Liberar reserva por pago fallido, cancelado, expirado o pedido cancelado.
5. Usar TTL de reserva para evitar bloqueo indefinido de stock.
6. Usar operaciones transaccionales para crear, confirmar, liberar y expirar reservas.
7. Usar idempotencia en creación de pedido, reserva, preferencia, webhook, confirmación, liberación y conversión a venta.
8. Usar control de concurrencia para impedir que dos procesos reserven o vendan la misma última unidad.
9. No facturar ni convertir a venta si la reserva no está confirmada.
10. No confirmar reserva expirada sin revalidar stock.
11. No confiar en cantidades, precios, stock ni totales enviados desde frontend.
12. Usar estados monotónicos: una reserva liberada, expirada, cancelada o fallida no debe volver a estado activo sin flujo explícito de recuperación.
13. Usar reloj server-side para TTL y expiración.
14. Usar auditoría para cada transición relevante de reserva.

Decisión central:

> Una compra online solo podrá avanzar a pago, venta y facturación si el backend creó y confirmó una reserva válida de stock. La reserva será el mecanismo técnico que protege al negocio contra sobreventa.

## Modelo conceptual recomendado

### StockReservation

Representa una reserva de stock asociada a un pedido online.

Debe contener:

- identificador interno;
- pedido online asociado;
- almacén;
- estado;
- fecha de creación;
- fecha de expiración;
- fecha de confirmación;
- fecha de liberación;
- motivo de liberación o fallo;
- clave de idempotencia;
- auditoría.

### StockReservationItem

Representa cada línea reservada.

Debe contener:

- reserva asociada;
- producto simple o variante;
- cantidad reservada;
- cantidad confirmada;
- cantidad liberada;
- almacén;
- estado de línea;
- referencia al item del pedido.

La reserva se debe manejar a nivel de variante vendible cuando existan variantes.

### ReservationStatus

Estados recomendados:

```text
PENDING_PAYMENT
CONFIRMED
RELEASED
EXPIRED
CANCELLED
FAILED
STOCK_EXCEPTION
```

### ReservationEvent

Registro auditable de eventos de reserva.

Ejemplos:

```text
RESERVATION_CREATED
RESERVATION_CONFIRMED
RESERVATION_RELEASED
RESERVATION_EXPIRED
RESERVATION_FAILED
RESERVATION_STOCK_EXCEPTION
```

Debe permitir trazabilidad operativa y soporte.

### IdempotencyKey

Clave usada para evitar doble procesamiento.

Debe aplicarse a:

- creación de pedido;
- creación de reserva;
- creación de preferencia Mercado Pago;
- procesamiento de webhook;
- confirmación de reserva;
- liberación de reserva;
- conversión a venta.

### ReservationTTL

Tiempo máximo que una reserva puede permanecer pendiente de pago.

Ejemplo inicial recomendado:

```text
15 a 30 minutos
```

El valor exacto debe definirse en implementación, considerando Mercado Pago, comportamiento del usuario y operación real.

El TTL debe calcularse con reloj server-side. El frontend no debe definir la hora de expiración ni decidir si una reserva sigue vigente.

### StockMovement

Movimiento de inventario relacionado con venta, reserva, liberación o ajuste.

Las reservas pueden manejarse como entidad separada del movimiento físico, pero la conversión a venta debe generar el movimiento real de salida según el modelo de inventario.

### Pedido online

Entidad futura que representa la intención de compra online.

Estados relevantes:

```text
PENDING_PAYMENT
PAID
PAYMENT_FAILED
PAYMENT_EXPIRED
CANCELLED
STOCK_EXCEPTION
READY_TO_FULFILL
CONVERTED_TO_SALE
```

### Pago Mercado Pago

Entidad o registro de integración de pago.

Debe registrar:

- preference id;
- payment id;
- estado;
- monto validado;
- fecha;
- eventos recibidos;
- estado de conciliación;
- idempotencia;
- relación con pedido y reserva.

## Estados recomendados de reserva

| Estado | Significado |
|---|---|
| `PENDING_PAYMENT` | Reserva temporal creada mientras el cliente completa el pago. |
| `CONFIRMED` | Reserva confirmada por pago aprobado validado server-side. |
| `RELEASED` | Reserva liberada por pago fallido, cancelación o acción controlada. |
| `EXPIRED` | Reserva vencida por superar el TTL sin pago aprobado. |
| `CANCELLED` | Reserva cancelada por cancelación del pedido. |
| `FAILED` | Reserva falló por error técnico o inconsistencia. |
| `STOCK_EXCEPTION` | Existe pago o pedido con problema de stock que requiere revisión. |

### Transiciones permitidas

| Desde | Hacia | Motivo |
|---|---|---|
| `PENDING_PAYMENT` | `CONFIRMED` | Pago aprobado y validado server-side. |
| `PENDING_PAYMENT` | `RELEASED` | Pago fallido, cancelado o pedido cancelado. |
| `PENDING_PAYMENT` | `EXPIRED` | TTL vencido. |
| `PENDING_PAYMENT` | `FAILED` | Error técnico controlado. |
| `PENDING_PAYMENT` | `STOCK_EXCEPTION` | Pago aprobado tardío sin stock confirmable. |
| `CONFIRMED` | `RELEASED` | Cancelación posterior controlada antes de venta/facturación, si la política lo permite. |
| `EXPIRED` | `STOCK_EXCEPTION` | Pago aprobado llega tarde y ya no hay stock suficiente. |

### Transiciones prohibidas

| Desde | Hacia | Motivo |
|---|---|---|
| `RELEASED` | `CONFIRMED` | No se debe confirmar stock ya liberado sin nueva validación. |
| `EXPIRED` | `CONFIRMED` | No se debe confirmar reserva vencida sin revalidar stock. |
| `CONFIRMED` | `CONFIRMED` | Evitar doble confirmación. |
| `RELEASED` | `RELEASED` | Evitar doble liberación. |
| `EXPIRED` | `EXPIRED` | Evitar doble expiración. |
| `FAILED` | `CONFIRMED` | Requiere flujo explícito de recuperación. |
| `STOCK_EXCEPTION` | `CONFIRMED` | Requiere resolución manual o revalidación controlada. |

Una reserva en estado terminal no debe volver a estado activo sin un flujo explícito y auditado.

## Ciclo de vida de una reserva

### 1. Carrito sin reserva

El carrito del cliente no reserva stock.

Motivo:

- muchos carritos se abandonan;
- reservar desde carrito bloquearía stock innecesariamente;
- se reduciría disponibilidad real para ventas físicas y online.

El carrito solo muestra disponibilidad pública aproximada entregada por Storefront API.

### 2. Validación de carrito

Antes de checkout, el backend debe validar:

- productos publicados;
- variantes activas;
- cantidades válidas;
- precio online efectivo;
- stock disponible online;
- almacén online activo;
- restricciones de venta online.

El frontend no puede decidir si hay stock suficiente.

### 3. Creación de pedido pendiente

Si el carrito es válido, se crea un pedido online en estado:

```text
PENDING_PAYMENT
```

El pedido todavía no es venta y no debe facturarse.

### 4. Creación de reserva

Luego se crea una reserva en estado:

```text
PENDING_PAYMENT
```

La reserva debe crearse dentro de una transacción que valide disponibilidad y proteja la concurrencia.

### 5. Creación de preferencia Mercado Pago

Solo después de crear reserva válida se crea la preferencia de Mercado Pago.

Regla:

> No debe existir preferencia de pago sin reserva válida.

### 6. Pago aprobado

Cuando Mercado Pago informa pago aprobado:

1. Validar webhook.
2. Consultar estado real del pago si corresponde.
3. Validar idempotencia.
4. Confirmar reserva.
5. Actualizar pedido a estado pagado.
6. Preparar fulfillment.
7. Preparar conversión futura a venta.
8. Preparar facturación automática futura.

### 7. Pago rechazado o cancelado

Si Mercado Pago informa rechazo, cancelación o fallo:

1. Validar idempotencia.
2. Liberar reserva.
3. Actualizar pedido.
4. Registrar evento.
5. Devolver stock disponible online.

### 8. Reserva expirada

Si se supera el TTL sin pago aprobado:

1. Reserva pasa a `EXPIRED`.
2. Pedido pasa a `PAYMENT_EXPIRED`.
3. Stock queda disponible nuevamente.
4. Si luego llega pago aprobado, se maneja como webhook tardío.

### 9. Pedido cancelado

Si el pedido se cancela antes de confirmarse:

1. Liberar reserva si está pendiente.
2. Marcar pedido como `CANCELLED`.
3. Registrar evento.

### 10. Pedido convertido a venta

Solo se permite si:

- el pedido está pagado;
- la reserva está confirmada;
- no existe incidencia de stock;
- no se ha convertido antes;
- la operación es idempotente.

### 11. Incidencia de stock

Si existe pago aprobado pero no hay reserva válida o stock confirmable:

1. No convertir a venta.
2. No facturar.
3. Marcar pedido como `STOCK_EXCEPTION`.
4. Requerir revisión manual.
5. Evaluar reintento, sustitución, contacto con cliente o devolución.

## Reglas de concurrencia

### Evitar que dos clientes reserven la última unidad

La creación de reserva debe ser atómica.

Proceso recomendado:

1. Iniciar transacción.
2. Consultar stock físico del almacén online.
3. Consultar stock reservado activo.
4. Aplicar stock de seguridad.
5. Calcular disponibilidad.
6. Validar cantidad solicitada.
7. Crear reserva.
8. Confirmar transacción.

La operación debe impedir que dos transacciones reserven simultáneamente la misma última unidad.

### Conflicto entre POS y ecommerce

Si POS y ecommerce comparten almacén:

- POS debe validar disponibilidad considerando reservas online.
- Ecommerce debe validar disponibilidad considerando ventas físicas recientes.
- Ambas operaciones deben operar sobre la misma fuente de verdad.
- No se debe permitir que POS ignore stock reservado online.

### Operaciones que deben ser atómicas

Deben ser atómicas:

- creación de reserva;
- confirmación de reserva;
- liberación de reserva;
- expiración de reserva;
- venta POS;
- conversión de pedido a venta;
- descuento final de inventario;
- procesamiento de webhook que afecte stock;
- cancelación de pedido con stock reservado.

### Qué bloquear o validar en transacción

Se debe proteger:

- producto/variante;
- almacén;
- stock disponible;
- reserva activa;
- pedido;
- pago asociado;
- estado de reserva.

### Bloqueo optimista o pesimista

La implementación futura debe evaluar el mecanismo adecuado.

#### Bloqueo optimista

Útil cuando:

- hay baja concurrencia;
- se usa campo de versión;
- se aceptan reintentos controlados;
- se quiere reducir bloqueo de base de datos.

#### Bloqueo pesimista

Útil cuando:

- hay stock bajo;
- hay alta posibilidad de comprar la última unidad;
- la operación es crítica;
- se requiere impedir lectura concurrente inconsistente.

Recomendación:

- usar enfoque transaccional con validación atómica;
- evaluar bloqueo pesimista en la creación de reservas o venta POS sobre stock crítico;
- usar idempotencia y reintentos controlados para evitar errores duplicados;
- mantener transacciones cortas para reducir deadlocks.

### Evitar stock reservado negativo

Reglas:

- no permitir liberar más cantidad que la reservada;
- no permitir confirmar más cantidad que la reservada;
- no permitir reservas con cantidad menor o igual a cero;
- no permitir reservas sobre disponibilidad cero;
- validar integridad por pedido/item.

## Reglas de idempotencia

La idempotencia evita doble procesamiento por reintentos, errores de red, doble clic o webhooks repetidos.

### Creación de pedido

Debe usar una clave de idempotencia asociada al intento de checkout.

Si el cliente reintenta, el backend debe devolver el mismo pedido pendiente o rechazar el duplicado de forma segura.

### Creación de reserva

La reserva debe ser única por pedido/item o por intento de checkout aprobado.

No debe permitirse doble reserva para el mismo item del mismo pedido.

### Creación de preferencia Mercado Pago

No debe crearse una nueva preferencia sin invalidar o reutilizar la anterior según política.

La preferencia debe estar asociada a pedido y reserva.

### Procesamiento de webhook

Todo webhook debe procesarse con idempotencia.

Si llega duplicado:

- no confirmar dos veces;
- no liberar dos veces;
- no convertir dos veces;
- no facturar dos veces.

### Confirmación de reserva

Si una reserva ya está confirmada, una segunda confirmación debe ser no-op controlado o respuesta segura.

### Liberación de reserva

Si una reserva ya está liberada o expirada, una segunda liberación no debe alterar stock nuevamente.

### Conversión a venta

La conversión de pedido a venta debe ser idempotente.

Un pedido no puede generar dos ventas por reintento.

### Restricciones conceptuales recomendadas

La implementación futura debe considerar restricciones lógicas o de base de datos equivalentes a:

- una reserva activa por pedido/item;
- una preferencia de pago vigente por pedido/intento;
- una venta por pedido confirmado;
- un comprobante por venta;
- un evento de webhook procesado una sola vez por identificador externo.

## Relación con POS

En la primera versión, POS puede compartir almacén con ecommerce.

Reglas:

1. POS debe consultar disponibilidad real antes de confirmar venta.
2. POS debe considerar stock reservado online.
3. POS no debe vender stock reservado por un pedido online.
4. POS debe mostrar error operativo si intenta vender más de lo disponible.
5. POS debe operar en transacción al descontar stock.
6. POS no debe ignorar reservas confirmadas o pendientes críticas.

### Si POS intenta vender una unidad reservada

Debe bloquearse la venta o reducir disponibilidad.

Mensaje operativo recomendado:

```text
No hay stock disponible suficiente. Parte del stock está reservado por pedidos online.
```

### Riesgos si POS ignora reservas

- sobreventa;
- pago online aprobado sin producto;
- pedido online con incidencia;
- reclamo de cliente;
- descuadre de inventario;
- necesidad de devolución.

## Relación con Mercado Pago

### No crear preferencia sin reserva

La preferencia de pago solo debe crearse después de:

- validar carrito;
- recalcular precio;
- recalcular stock;
- crear pedido pendiente;
- crear reserva temporal.

### Pago aprobado tardío

Si Mercado Pago aprueba luego de expirar la reserva:

1. Verificar si la reserva sigue confirmable.
2. Revalidar stock.
3. Si hay stock, resolver bajo política controlada.
4. Si no hay stock, marcar `STOCK_EXCEPTION`.
5. No facturar automáticamente.
6. Requerir revisión manual.

### Webhook duplicado

Debe procesarse como evento idempotente.

El segundo webhook no debe alterar stock si ya fue procesado.

### Pago aprobado sin reserva válida

Debe tratarse como incidencia grave.

Regla:

> Pago aprobado sin reserva válida no debe generar venta ni comprobante automáticamente.

Estado sugerido:

```text
PAYMENT_APPROVED_WITHOUT_VALID_RESERVATION
```

### Estados de incidencia requeridos

Estados recomendados para pedido/pago:

```text
PAYMENT_APPROVED_STOCK_EXCEPTION
PAYMENT_APPROVED_RESERVATION_EXPIRED
PAYMENT_APPROVED_WITHOUT_VALID_RESERVATION
PAYMENT_DUPLICATE_EVENT_IGNORED
```

## Relación con pedidos online

El pedido online debe coordinar reserva, pago, venta y facturación.

### Pedido pendiente de pago

Estado:

```text
PENDING_PAYMENT
```

Debe tener reserva temporal.

No se factura.

No se convierte en venta.

### Pedido pagado

Estado:

```text
PAID
```

Requiere pago aprobado y reserva confirmada.

### Pedido con incidencia de stock

Estado:

```text
STOCK_EXCEPTION
```

Se usa cuando:

- pago aprobado llega tarde;
- reserva expiró;
- stock ya no existe;
- reserva no es válida;
- hubo inconsistencia de concurrencia.

No se factura automáticamente.

### Pedido cancelado

Debe liberar reserva si corresponde.

### Pedido expirado

Debe expirar reserva y quedar sin posibilidad de pago válido sin nuevo intento.

### Conversión a venta

Solo se permite si:

- pedido está pagado;
- reserva está confirmada;
- no existe incidencia;
- no existe venta previa;
- operación es idempotente.

## Relación con facturación automática

La facturación automática debe depender del estado de reserva.

Reglas:

1. No emitir comprobante si la reserva no está confirmada.
2. No emitir comprobante si hay incidencia de stock.
3. No emitir comprobante si el pedido no está pagado.
4. No emitir comprobante si el pedido no puede convertirse a venta.
5. No emitir comprobante duplicado por webhook duplicado.
6. No emitir comprobante para pago aprobado sin reserva válida.

Si Mercado Pago aprueba pero la reserva falló:

- no crear venta;
- no emitir comprobante;
- marcar incidencia;
- resolver manualmente.

Esto evita venta/factura sin stock real.

## Relación con Storefront API/BFF

La Storefront API debe apoyar la estrategia anti-sobreventa sin exponer detalles internos.

### Validación de carrito

Endpoint conceptual futuro:

```text
POST /api/v1/storefront/cart/validate
```

Debe recalcular server-side:

- producto publicado;
- variante activa;
- cantidad válida;
- precio online efectivo;
- stock disponible online;
- disponibilidad pública;
- restricciones de venta online.

### Disponibilidad pública

Estados recomendados:

```text
AVAILABLE
LOW_STOCK
OUT_OF_STOCK
```

No exponer stock exacto por defecto.

### Revalidación antes de checkout

Antes de crear pedido y reserva, el backend debe revalidar el carrito completo.

La disponibilidad mostrada en tienda no reemplaza la validación final server-side.

## Reglas obligatorias

1. No reservar más de lo disponible.
2. No confirmar reserva expirada sin revalidar stock.
3. No liberar reserva ya liberada.
4. No confirmar reserva ya confirmada.
5. No convertir pedido a venta sin reserva confirmada.
6. No facturar pedido con incidencia de stock.
7. No confiar en cantidades enviadas por frontend.
8. No permitir compra de producto agotado.
9. No crear preferencia Mercado Pago sin reserva válida.
10. No procesar webhook sin idempotencia.
11. No permitir doble reserva para el mismo pedido/item.
12. No permitir doble consumo de stock.
13. POS no debe ignorar reservas online si comparte almacén.
14. Las operaciones críticas deben ser transaccionales.
15. La conversión a venta debe ser idempotente.
16. La facturación automática debe ejecutarse solo después de venta válida y reserva confirmada.
17. El TTL de reserva debe calcularse server-side.
18. Las reservas en estado terminal no deben reactivarse sin flujo explícito y auditado.
19. Debe existir auditoría de eventos relevantes de reserva.
20. Debe existir proceso de reconciliación para reservas vencidas, huérfanas o inconsistentes.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| No usar reservas | Descartada. Riesgo alto de sobreventa, especialmente con POS y ecommerce compartiendo almacén. |
| Reservar desde carrito | Descartada como regla general. Bloquea stock por carritos abandonados y afecta operación. |
| Reservar solo después del pago | Descartada. Puede generar pago aprobado sin stock disponible. |
| Reservar al crear pedido pendiente | Aceptada. Protege stock durante el pago y reduce sobreventa. |
| Usar almacén ecommerce exclusivo desde el inicio | No se adopta inicialmente. Puede ser evolución futura, pero no debe bloquear primera versión. |

## Justificación

### Prevención de sobreventa

La reserva antes del pago reduce el riesgo de vender la misma unidad dos veces.

### Operación real

El negocio podrá manejar pedidos online sin depender de revisión manual constante.

### Seguridad

El frontend no controla stock, cantidades finales ni disponibilidad.

### Confiabilidad

La idempotencia y las transacciones evitan efectos duplicados por reintentos o webhooks repetidos.

### Consistencia con POS

Si POS comparte almacén, debe respetar stock reservado online para evitar conflictos.

### Preparación para Mercado Pago

Mercado Pago depende de un flujo robusto ante pagos pendientes, aprobados, rechazados, duplicados o tardíos.

### Bajo riesgo

Evita avanzar a facturación o venta sin stock confirmado.

## Consecuencias positivas

- Reduce sobreventa.
- Protege stock durante pago.
- Permite integración segura con Mercado Pago.
- Evita doble procesamiento.
- Evita doble liberación o confirmación.
- Reduce incidencias operativas.
- Mantiene ERP/POS como fuente de verdad.
- Permite auditoría completa.
- Mejora confiabilidad del checkout.
- Prepara facturación automática segura.

## Consecuencias negativas o costos

- Aumenta complejidad técnica.
- Requiere modelo formal de reservas.
- Requiere TTL y expiración.
- Requiere idempotencia.
- Requiere control de concurrencia.
- Requiere adaptación de POS si comparte almacén.
- Requiere QA de casos extremos.
- Puede bloquear stock temporalmente si hay muchos intentos de pago abandonados.
- Requiere monitoreo de reservas vencidas e incidencias.

Estos costos son aceptables porque la alternativa es operar ecommerce con alto riesgo de sobreventa.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sobreventa | Reserva antes de pago, transacciones y control de concurrencia. |
| Reservas huérfanas | TTL, job de expiración y auditoría. |
| Reservas vencidas no liberadas | Limpieza programada y validación lazy. |
| Webhook duplicado | Idempotencia por evento/pago/pedido. |
| Webhook tardío | Revalidación de reserva y stock; incidencia si no hay stock. |
| Pago aprobado sin stock | Estado de incidencia; no venta ni factura automática. |
| POS ignorando reservas | POS debe validar disponibilidad considerando reservas online. |
| Bloqueo excesivo por carritos abandonados | No reservar en carrito; reservar solo en pedido pendiente. |
| Deadlocks o problemas de concurrencia | Transacciones cortas, bloqueo bien definido y reintentos controlados. |
| Doble liberación | Operación idempotente y validación de estado. |
| Doble confirmación | Operación idempotente y validación de estado. |
| Doble conversión a venta | Restricción por pedido y operación idempotente. |
| Reservas terminales reactivadas por error | Estados monotónicos y validación de transición. |
| TTL inconsistente | Reloj server-side y auditoría de expiración. |

## Impacto técnico

### Inventario backend

Debe soportar:

- reservas;
- cálculo de reservado activo;
- operaciones transaccionales;
- control de concurrencia;
- validaciones atómicas.

### Pedidos online

Debe integrarse con reserva y pago.

### POS

Debe considerar stock reservado online si comparte almacén.

### Mercado Pago

Debe usar reserva previa, idempotencia y manejo de webhooks tardíos/duplicados.

### Facturación automática

Debe depender de pedido pagado, venta válida y reserva confirmada.

### Storefront API

Debe validar carrito y exponer disponibilidad pública.

### Auditoría

Debe registrar eventos de reserva, pago, expiración, liberación e incidencia.

### Reportes

Se necesitarán reportes futuros de:

- reservas activas;
- reservas expiradas;
- reservas confirmadas;
- incidencias de stock;
- pagos aprobados con excepción;
- stock reservado por almacén.

### QA

Debe cubrir:

- dos checkouts simultáneos;
- POS vendiendo mientras ecommerce reserva;
- webhook duplicado;
- webhook tardío;
- reserva expirada;
- pago fallido;
- pago aprobado;
- pedido cancelado;
- conversión a venta idempotente;
- intento de doble liberación;
- intento de doble confirmación;
- intento de doble conversión a venta.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba usar reservas explícitas de stock para pedidos online.
2. Se aprueba crear reserva antes de crear preferencia Mercado Pago.
3. Se aprueba confirmar reserva solo con pago aprobado validado server-side.
4. Se aprueba liberar reserva por pago fallido, cancelado, expirado o pedido cancelado.
5. Se aprueba usar TTL de reserva.
6. Se aprueba que las operaciones de reserva sean transaccionales.
7. Se aprueba que las operaciones críticas sean idempotentes.
8. Se aprueba que debe existir control de concurrencia.
9. Se aprueba no convertir pedido a venta sin reserva confirmada.
10. Se aprueba no facturar pedido con incidencia de stock.
11. Se aprueba que POS debe considerar reservas online si comparte almacén.
12. Se aprueba que webhooks duplicados o tardíos no deben generar doble procesamiento.
13. Se aprueba que pago aprobado sin reserva válida debe ir a incidencia.
14. Se aprueba que Storefront API debe revalidar carrito server-side antes de checkout.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar reservas;
- implementar checkout;
- implementar Mercado Pago;
- crear endpoints;
- crear migraciones;
- modificar POS;
- modificar inventario actual;
- modificar facturación;
- activar venta online;
- crear jobs de expiración;
- crear pedidos online;
- cambiar reglas productivas;
- tocar AWS/staging.

Este ADR solo define la estrategia de stock reservado, concurrencia, idempotencia y prevención de sobreventa. La implementación debe ocurrir en fases posteriores, alineada con inventario, pedidos online, Mercado Pago, POS, Storefront API y facturación automática.

## Decisión resultante

InkToy usará reservas explícitas de stock para proteger el checkout online contra sobreventa. La reserva se creará al generar un pedido pendiente de pago y antes de crear una preferencia Mercado Pago.

La reserva tendrá TTL, estados controlados, auditoría, idempotencia y reglas de transición. Los pagos aprobados confirmarán reservas solo si el evento es válido y la reserva sigue siendo confirmable. Los pagos fallidos, cancelados o expirados liberarán reservas.

Las operaciones críticas serán transaccionales y protegidas contra concurrencia. POS deberá considerar reservas online si comparte almacén con ecommerce. No se convertirá un pedido a venta ni se emitirá comprobante si no existe una reserva confirmada o si el pedido tiene incidencia de stock.

Las reservas en estado terminal no se reactivarán sin flujo explícito y auditado. El sistema deberá contar con procesos de reconciliación para detectar reservas vencidas, huérfanas o inconsistentes.

# ADR-013 — Mercado Pago, webhook e idempotencia para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first usará Next.js, será publicada en `inktoy.pe` y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

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
- ADR-010: Stock reservado, concurrencia y estrategia anti-sobreventa.
- ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ADR-012: Pedidos online y lifecycle ecommerce.

Los ADRs previos establecieron que:

- ERP/POS será la fuente de verdad del catálogo, precios, stock, pedidos, ventas y facturación.
- La tienda solo consumirá productos publicados mediante Storefront API/BFF.
- El frontend nunca decide precios, stock, descuentos, totales finales, estado del pedido ni estado del pago.
- El precio online efectivo se calcula server-side.
- El stock disponible online se calcula server-side.
- Existirán reservas explícitas de stock para pedidos online.
- No se creará preferencia Mercado Pago sin validar carrito, precio y stock server-side.
- El pedido online será entidad formal dentro del ERP/POS.
- El pedido online no será venta hasta cumplir condiciones específicas.
- El pedido debe guardar snapshot de productos, precios, cliente, dirección, envío y totales.
- No se convertirá pedido a venta sin pago aprobado y reserva confirmada.
- No se facturará pedido con incidencia de stock, pago, precio o datos tributarios.
- Las operaciones críticas deben ser transaccionales, idempotentes y protegidas contra concurrencia.
- Mercado Pago será el medio de pago online inicial.
- No habrá recojo en tienda ni pago contraentrega en la primera versión.
- La facturación automática se definirá en ADR posterior, pero Mercado Pago debe quedar preparado para integrarse con venta y comprobantes.

Mercado Pago será el primer proveedor de pagos online de InkToy. Su integración debe ser segura, server-side, auditable e idempotente. El pago no puede tratarse como una acción aislada: debe estar conectado con pedido online, reserva de stock, snapshot de precios, validación de monto, futura venta ERP/POS y facturación electrónica.

## Problema

Se debe definir cómo integrar Mercado Pago en InkToy sin comprometer seguridad, consistencia operativa ni trazabilidad.

La decisión debe resolver:

- cuándo se crea una preferencia de pago;
- qué datos se envían a Mercado Pago;
- cómo se relaciona la preferencia con el pedido online;
- cómo se valida que el monto pagado coincide con el pedido;
- cómo se procesa el webhook;
- cómo se evita doble procesamiento;
- cómo se confirma pago y reserva;
- cómo se liberan reservas ante pagos fallidos o expirados;
- cómo se manejan pagos aprobados tardíos;
- cómo se manejan webhooks duplicados;
- cómo se evita crear venta o comprobante sin pago válido;
- cómo se previene manipulación de monto desde frontend.

Riesgos de crear pagos sin pedido/reserva válida:

- cobros aprobados sin stock disponible;
- pagos sin pedido trazable;
- pedidos imposibles de preparar;
- facturación incorrecta;
- necesidad de devolución manual;
- mala experiencia del cliente.

Riesgos de manipulación de monto:

- cliente altera precio o total desde frontend;
- preferencia se crea con monto menor;
- pedido queda pagado parcialmente;
- comprobante se emite con monto incorrecto;
- reportes y conciliación quedan inconsistentes.

Riesgos de webhooks falsos, duplicados o tardíos:

- venta duplicada;
- comprobante duplicado;
- reserva confirmada dos veces;
- reserva liberada dos veces;
- pedido pagado fuera de tiempo;
- pedido facturado sin validación suficiente.

Riesgos de confiar solo en el webhook:

- el webhook podría llegar duplicado, tarde o incompleto;
- puede existir inconsistencia entre evento recibido y estado real del pago;
- un evento no validado puede alterar pedidos críticos.

## Decisión

Se decide integrar Mercado Pago exclusivamente desde backend, con flujo server-side, validación estricta, idempotencia, auditoría y control de incidencias.

Decisiones principales:

1. Mercado Pago se integrará server-side.
2. La preferencia se creará solo después de validar carrito, precios, stock, pedido y reserva.
3. El monto enviado a Mercado Pago será calculado por backend.
4. El frontend nunca enviará montos confiables, estado de pago ni totales finales.
5. La preferencia estará asociada a un pedido online y a una reserva de stock.
6. El webhook será validado server-side.
7. El webhook no será suficiente por sí solo para convertir a venta o facturar.
8. Cuando sea necesario, el backend consultará el estado real del pago antes de confirmar.
9. Se usará idempotencia en preferencia, webhook, confirmación de pago, confirmación de reserva, liberación de reserva, conversión futura a venta y facturación futura.
10. Pago aprobado sin reserva válida generará incidencia.
11. Pago aprobado con monto inconsistente generará incidencia.
12. No se convertirá pedido a venta ni se facturará si existe incidencia de pago, stock, precio o reserva.
13. No se expondrán credenciales, tokens ni detalles internos de pago al frontend.
14. Las credenciales y configuraciones de Mercado Pago deberán separarse por entorno: local, sandbox/staging y producción.
15. No se activarán pagos reales hasta tener pedidos, reservas, checkout, seguridad y QA aprobados.

Decisión central:

> Mercado Pago será tratado como un proveedor externo de pago, no como fuente única de verdad del pedido. InkToy confirmará el estado del pedido únicamente después de validar server-side el pago, el monto, la moneda, la reserva, el pedido y la idempotencia del evento.

## Modelo conceptual recomendado

### PaymentAttempt

Representa un intento de pago asociado a un pedido online.

Debe contener:

- identificador interno;
- pedido asociado;
- proveedor de pago;
- estado del intento;
- monto esperado;
- moneda;
- fecha de creación;
- fecha de expiración si aplica;
- idempotency key;
- referencia a preferencia;
- referencia a transacción aprobada si existe;
- auditoría.

Un pedido puede tener más de un intento de pago si el primer intento falla o expira, pero debe existir una política clara para evitar intentos activos duplicados.

### PaymentPreference

Representa la preferencia creada en Mercado Pago.

Debe contener:

- preference id;
- init point o URL de pago si aplica;
- pedido asociado;
- monto esperado;
- moneda;
- estado;
- fecha de creación;
- fecha de expiración;
- idempotency key;
- datos mínimos necesarios para conciliación.

La preferencia no debe existir sin pedido y reserva válidos.

### PaymentTransaction

Representa una transacción o pago concreto reportado por Mercado Pago.

Debe contener:

- payment id;
- provider;
- pedido asociado;
- preference id;
- estado del pago;
- monto aprobado;
- moneda;
- fecha de aprobación;
- método de pago si se requiere para reportes;
- datos de conciliación;
- resultado de validación;
- auditoría.

### PaymentWebhookEvent

Representa un evento recibido desde Mercado Pago.

Debe contener:

- identificador del evento;
- tipo de evento;
- proveedor;
- payload mínimo o referencia segura al payload;
- fecha de recepción;
- resultado de validación;
- estado de procesamiento;
- idempotency key;
- error si aplica.

No se deben guardar datos sensibles completos si no son necesarios.

### PaymentStatus

Estados internos de pago definidos por InkToy.

No necesariamente deben ser copia directa de los estados del proveedor. Deben representar estados operativos del ERP/POS.

### PaymentProvider

Proveedor de pago.

Valor inicial:

```text
MERCADO_PAGO
```

Debe quedar preparado para proveedores futuros sin acoplar todo el dominio a Mercado Pago.

### PaymentReconciliation

Proceso o registro de conciliación entre:

- pedido;
- preference id;
- payment id;
- monto esperado;
- monto aprobado;
- moneda;
- reserva;
- venta futura;
- comprobante futuro.

### IdempotencyKey

Clave que evita doble procesamiento.

Debe aplicarse a:

- creación de preferencia;
- procesamiento de webhook;
- confirmación de pago;
- confirmación de reserva;
- liberación de reserva;
- conversión futura a venta;
- facturación futura.

### PaymentIncident

Incidencia operativa de pago.

Ejemplos:

```text
PAYMENT_AMOUNT_MISMATCH
PAYMENT_APPROVED_WITHOUT_VALID_RESERVATION
PAYMENT_APPROVED_AFTER_RESERVATION_EXPIRED
PAYMENT_WITHOUT_ORDER
PAYMENT_DUPLICATE_EVENT
PAYMENT_PROVIDER_VALIDATION_FAILED
PAYMENT_RECONCILIATION_REQUIRED
```

### Relación con OnlineOrder y StockReservation

Relación conceptual:

```text
OnlineOrder
→ PaymentAttempt
→ PaymentPreference
→ PaymentTransaction

OnlineOrder
→ StockReservation
```

Un pago aprobado solo puede avanzar el pedido si la reserva asociada es válida y confirmable.

## Estados recomendados de pago

### PENDING

Pago pendiente o preferencia creada, pero aún sin confirmación.

Uso:

- cliente aún no completa pago;
- se espera confirmación;
- pedido sigue pendiente.

### PROCESSING

Pago en procesamiento.

Uso:

- Mercado Pago reporta que el pago está siendo evaluado;
- el sistema no debe asumir aprobación final.

No permite:

- venta;
- facturación;
- despacho.

### APPROVED

Pago aprobado y validado server-side.

Uso:

- el proveedor confirma pago aprobado;
- monto y moneda coinciden;
- pedido existe;
- reserva existe y es confirmable;
- evento fue procesado con idempotencia.

Permite:

- confirmar reserva;
- avanzar pedido a pagado;
- preparar conversión futura a venta.

### REJECTED

Pago rechazado.

Uso:

- proveedor rechaza el pago;
- se debe liberar reserva si corresponde.

No permite:

- venta;
- facturación.

### CANCELLED

Pago cancelado.

Uso:

- cliente o proveedor cancela flujo;
- se debe liberar reserva si corresponde.

### EXPIRED

Pago o intento de pago vencido.

Uso:

- expiró la preferencia;
- expiró la reserva;
- el cliente no completó pago a tiempo.

Debe liberar o expirar reserva.

### REFUNDED

Estado futuro para pago devuelto.

Uso:

- devolución parcial o total;
- se definirá con flujo de devoluciones.

No se implementa en primera versión salvo que sea necesario para incidencias.

### CHARGEBACK

Estado futuro para contracargo.

Uso:

- disputa o contracargo;
- requiere gestión operativa y contable.

No se implementa en primera versión como flujo completo, pero debe quedar previsto.

### AMOUNT_MISMATCH

Monto aprobado no coincide con monto esperado.

Uso:

- pago aprobado con diferencia;
- no se debe convertir a venta;
- no se debe facturar;
- requiere revisión manual.

### STOCK_EXCEPTION

Pago aprobado, pero reserva no válida o stock no confirmable.

Uso:

- reserva expirada;
- reserva inexistente;
- conflicto de stock;
- pago tardío.

No permite venta ni facturación automática.

### WEBHOOK_DUPLICATE_IGNORED

Evento duplicado recibido y descartado de forma segura.

Uso:

- webhook repetido;
- el evento ya fue procesado;
- no debe alterar estado nuevamente.

## Flujo recomendado

### 1. Validar carrito server-side

Antes de crear cualquier pago, el backend debe validar:

- productos publicados;
- variantes activas;
- cantidades;
- precio online efectivo;
- stock disponible online;
- datos mínimos del cliente;
- dirección;
- reglas de venta.

### 2. Crear pedido `PENDING_PAYMENT`

Si el carrito es válido:

- se crea pedido online;
- se guarda snapshot de productos y precios;
- se genera número público de pedido;
- se registra monto esperado.

### 3. Crear reserva `PENDING_PAYMENT`

Después del pedido:

- se crea reserva de stock;
- se asigna TTL;
- se asocia al pedido.

Si falla la reserva, no se crea preferencia Mercado Pago.

### 4. Crear preferencia Mercado Pago

Solo si pedido y reserva son válidos:

- backend crea preferencia;
- monto viene del snapshot del pedido;
- moneda viene del backend;
- preferencia se asocia al pedido;
- se guarda idempotency key;
- Storefront API devuelve URL/identificador seguro al frontend.

### 5. Redirigir cliente a Mercado Pago

El frontend redirige o muestra el flujo de pago usando la información pública segura entregada por backend.

El frontend no modifica monto ni estado.

### 6. Recibir webhook

Mercado Pago envía evento al endpoint webhook.

El backend debe:

- registrar recepción;
- validar autenticidad/origen según mecanismo oficial vigente;
- aplicar idempotencia;
- consultar pago real si corresponde;
- no confiar ciegamente en el payload.

### 7. Validar pago

El backend valida:

- payment id;
- preference id;
- pedido asociado;
- monto aprobado;
- moneda;
- estado real del pago;
- reserva asociada;
- expiración;
- idempotencia;
- si ya fue procesado.

### 8. Confirmar pago

Si todo es válido:

- registrar pago aprobado;
- marcar intento como `APPROVED`;
- actualizar pedido;
- confirmar reserva.

### 9. Confirmar reserva

Pago aprobado permite confirmar reserva solo si:

- reserva existe;
- reserva pertenece al pedido;
- reserva no expiró o sigue confirmable según política;
- cantidades coinciden;
- no existe incidencia.

### 10. Pasar pedido a `PAID` / `READY_TO_PREPARE`

Después de pago aprobado y reserva confirmada:

- pedido puede pasar a `PAID`;
- si no hay incidencias, puede pasar a `READY_TO_PREPARE`.

### 11. Preparar conversión futura a venta

El pedido queda listo para futura conversión a venta ERP/POS según ADR de pedido y facturación.

### 12. Manejar fallos, expiraciones e incidencias

Si el pago falla:

- liberar reserva;
- marcar pedido como `PAYMENT_FAILED`.

Si expira:

- expirar reserva;
- marcar pedido como `PAYMENT_EXPIRED`.

Si hay inconsistencia:

- marcar incidencia;
- no convertir a venta;
- no facturar.

## Reglas de idempotencia

La idempotencia es obligatoria para evitar doble procesamiento por reintentos, latencia, doble clic, timeouts o webhooks duplicados.

### Creación de preferencia

Reglas:

1. Una misma solicitud de checkout no debe crear múltiples preferencias activas sin política definida.
2. Si se reintenta con la misma idempotency key, debe retornar la misma preferencia o estado seguro.
3. Si la preferencia expiró, debe crearse un nuevo intento controlado.

### Procesamiento de webhook

Reglas:

1. Cada evento externo debe procesarse una sola vez.
2. Si llega duplicado, registrar y responder de forma segura.
3. Un webhook duplicado no debe confirmar pago dos veces.
4. Un webhook duplicado no debe confirmar reserva dos veces.
5. Un webhook duplicado no debe convertir venta ni facturar dos veces.

### Confirmación de pago

Si el pago ya fue marcado como aprobado, una nueva confirmación debe ser no-op seguro.

### Confirmación de reserva

Si la reserva ya fue confirmada, no debe confirmarse nuevamente.

### Liberación de reserva

Si la reserva ya fue liberada o expirada, no debe liberar stock nuevamente.

### Conversión futura a venta

Un pedido no debe generar más de una venta válida.

### Facturación futura

Una venta no debe generar comprobantes duplicados por el mismo flujo.

### Prevención de doble procesamiento

Debe existir una estrategia de claves únicas o restricciones lógicas para:

- payment id;
- event id de webhook;
- preference id;
- order id;
- reservation id;
- sale id futura;
- electronic document id futuro.

## Reglas de seguridad

### No confiar en frontend

El frontend no es fuente confiable para:

- monto;
- moneda;
- total;
- descuentos;
- estado del pago;
- payment id;
- preference id no validado;
- estado del pedido;
- estado de reserva.

### Validar webhook

El webhook debe validarse server-side.

Validaciones recomendadas:

- verificar autenticidad según mecanismo oficial vigente de Mercado Pago;
- validar que el evento corresponde a un pago esperado;
- verificar que el pago existe consultando al proveedor cuando corresponda;
- validar monto;
- validar moneda;
- validar pedido;
- validar reserva;
- aplicar idempotencia.

### Consultar estado real del pago

Cuando el webhook no sea suficiente o exista duda, el backend debe consultar el estado real del pago al proveedor.

Regla:

> No convertir a venta ni facturar únicamente por recibir un webhook sin validación suficiente.

### Credenciales y tokens

Reglas:

1. No exponer credenciales en frontend.
2. No registrar tokens completos.
3. No subir secretos al repositorio.
4. Separar credenciales por entorno.
5. Rotar credenciales si existe sospecha de exposición.
6. Usar variables de entorno o gestor de secretos en producción futura.
7. Separar credenciales sandbox/staging de credenciales productivas.
8. No activar credenciales productivas hasta completar QA y hardening.

### Endpoint webhook

Debe protegerse con:

- validación de origen/autenticidad;
- idempotencia;
- rate limiting si aplica;
- logging seguro;
- no exposición de errores internos;
- monitoreo;
- tolerancia a reintentos.

### Logging seguro

No registrar:

- tokens completos;
- credenciales;
- datos sensibles completos de tarjeta;
- payloads completos si contienen información innecesaria;
- datos personales más allá de lo necesario.

Sí registrar:

- event id;
- payment id;
- preference id;
- order public number o internal id interno controlado;
- resultado de validación;
- estado final;
- error técnico resumido;
- timestamps.

## Relación con pedidos online

La preferencia de pago debe estar asociada a un pedido online.

Reglas:

1. No existe pago sin pedido.
2. No existe preferencia sin pedido.
3. El pago solo actualiza pedido si pasa validaciones.
4. Pedido pagado requiere:
   - pago aprobado;
   - monto coincidente;
   - moneda coincidente;
   - reserva confirmada;
   - ausencia de incidencia crítica.
5. Pedido con pago inconsistente pasa a incidencia.
6. Pedido no se convierte a venta solo por recibir webhook.

Estados de pedido relacionados:

```text
PENDING_PAYMENT
PAYMENT_PROCESSING
PAID
PAYMENT_FAILED
PAYMENT_EXPIRED
STOCK_EXCEPTION
READY_TO_PREPARE
```

## Relación con stock reservado

Reglas:

1. No crear preferencia sin reserva.
2. Pago aprobado confirma reserva.
3. Pago rechazado libera reserva.
4. Pago cancelado libera reserva.
5. Pago expirado libera o expira reserva.
6. Pago aprobado tardío con reserva expirada genera incidencia.
7. Pago aprobado sin reserva válida genera incidencia.
8. No convertir a venta sin reserva confirmada.
9. No facturar sin reserva confirmada.

Estados de incidencia recomendados:

```text
PAYMENT_APPROVED_AFTER_RESERVATION_EXPIRED
PAYMENT_APPROVED_WITHOUT_VALID_RESERVATION
PAYMENT_APPROVED_STOCK_EXCEPTION
```

## Relación con precios

Mercado Pago debe usar el total snapshot del pedido.

Reglas:

1. El total enviado a Mercado Pago viene del backend.
2. El total esperado se guarda en el pedido.
3. El pago aprobado debe compararse contra el total esperado.
4. La moneda debe coincidir.
5. Si el monto aprobado difiere, se genera incidencia.
6. No se factura ni convierte a venta con diferencia de precio/pago.

Estado recomendado:

```text
PAYMENT_AMOUNT_MISMATCH
```

Si el precio cambia después de crear la preferencia:

- no se modifica silenciosamente el pedido;
- si aún no fue pagado, se puede expirar y crear nuevo intento;
- si ya fue pagado correctamente, se respeta el snapshot del pedido;
- si hay diferencia, se genera incidencia.

## Relación con venta y facturación automática futura

### Conversión a venta

Un pedido puede convertirse a venta solo si:

- pago está aprobado;
- monto y moneda coinciden;
- reserva está confirmada;
- pedido no tiene incidencias;
- pedido no fue convertido previamente.

### Datos de pago que deben transferirse a la venta

La venta debería recibir o referenciar:

- proveedor de pago;
- payment id;
- monto pagado;
- moneda;
- fecha de aprobación;
- canal de venta online;
- pedido online asociado.

### Facturación automática futura

No emitir comprobante si:

- pago no está aprobado;
- monto no coincide;
- reserva no está confirmada;
- pedido tiene incidencia;
- venta no existe;
- ya existe comprobante para esa venta;
- datos tributarios son inválidos;
- no hay serie activa.

### Webhook duplicado

Un webhook duplicado no debe:

- crear segunda venta;
- emitir segundo comprobante;
- confirmar dos veces el pago;
- confirmar dos veces la reserva.

## Relación con Storefront API/BFF

La Storefront API/BFF será la capa pública/controlada entre Next.js y ERP/POS.

### Crear intento de checkout

Endpoint conceptual:

```text
POST /api/v1/storefront/checkout/start
```

Debe:

- validar carrito;
- crear pedido;
- crear reserva;
- crear preferencia;
- devolver URL/identificador seguro de pago.

### Consultar estado público del pedido

Endpoint conceptual:

```text
GET /api/v1/storefront/orders/{publicOrderNumber}
```

Debe exponer solo estado público seguro.

No debe exponer:

- payment id interno completo si no es necesario;
- payload de Mercado Pago;
- datos internos de reserva;
- detalles internos de facturación;
- logs de error;
- IDs internos sensibles;
- datos personales innecesarios.

### Devolver URL/preferencia segura

El frontend puede recibir:

- URL de pago;
- identificador público de pedido;
- estado inicial.

No debe recibir:

- access token;
- credenciales;
- reglas internas;
- totales confiables calculados en frontend.

## Conciliación

La conciliación es necesaria porque los pagos pueden quedar en estados intermedios, duplicados, tardíos o inconsistentes.

Debe permitir comparar:

- pedido;
- preference id;
- payment id;
- monto esperado;
- monto aprobado;
- moneda;
- estado de pago;
- reserva;
- venta futura;
- comprobante futuro;
- eventos webhook recibidos.

### Estados de conciliación recomendados

```text
MATCHED
PENDING_REVIEW
AMOUNT_MISMATCH
MISSING_RESERVATION
MISSING_ORDER
DUPLICATE_PAYMENT
PAYMENT_WITHOUT_SALE
SALE_WITHOUT_PAYMENT
BILLING_PENDING
```

### Revisión manual

Debe existir rol o proceso futuro para soporte de pagos.

Responsabilidades:

- revisar pagos con incidencia;
- validar monto;
- coordinar devolución si aplica;
- corregir pedido bajo flujo autorizado;
- reintentar facturación si corresponde;
- documentar resolución.

## Reglas obligatorias

1. No crear preferencia sin pedido válido.
2. No crear preferencia sin reserva válida.
3. No crear preferencia sin precio y stock recalculados server-side.
4. No confiar en frontend para monto, moneda, estado ni total.
5. No procesar webhook sin idempotencia.
6. No convertir pedido a venta sin pago aprobado validado.
7. No confirmar reserva si pago no está aprobado.
8. No confirmar reserva si el pago no corresponde al pedido.
9. No facturar con pago inconsistente.
10. No facturar con monto distinto.
11. No duplicar venta por webhook duplicado.
12. No duplicar comprobante por webhook duplicado.
13. No exponer credenciales ni tokens al frontend.
14. No guardar datos sensibles innecesarios.
15. No usar Mercado Pago como única fuente de verdad del pedido.
16. No procesar pago aprobado sin validar pedido, monto, moneda y reserva.
17. No avanzar pedido si el webhook no se puede validar.
18. No activar pagos reales sin entorno, credenciales y QA definidos.
19. No mezclar credenciales sandbox/staging con producción.
20. No registrar secretos ni tokens completos en logs.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Crear preferencia directamente desde frontend | Descartada. Expondría lógica sensible y permitiría manipulación de monto. |
| Crear preferencia sin reserva | Descartada. Riesgo de pago aprobado sin stock. |
| Confiar solo en redirect de Mercado Pago | Descartada. El usuario puede cerrar ventana, fallar retorno o manipular flujo. |
| Confiar solo en webhook | Descartada. El webhook puede llegar duplicado, tarde o requerir validación adicional. |
| Integración server-side con pedido, reserva e idempotencia | Aceptada. Es la opción más segura y consistente para operación real. |

## Justificación

### Seguridad

Evita que el cliente manipule precios, totales o estados de pago desde frontend.

### Operación real

Permite gestionar pagos pendientes, aprobados, fallidos, tardíos o con incidencia.

### Consistencia

Pago, pedido, reserva, venta y comprobante quedan relacionados y auditables.

### Prevención de fraude/manipulación

El backend controla monto, moneda, pedido, reserva y estado real del pago.

### Bajo riesgo

No se avanza a venta ni facturación sin validaciones completas.

### Preparación para facturación

La facturación automática futura dependerá de pagos confirmados y consistentes.

## Consecuencias positivas

- Menor riesgo de manipulación de monto.
- Menor riesgo de pago sin stock.
- Menor riesgo de venta duplicada.
- Menor riesgo de comprobante duplicado.
- Mejor trazabilidad de pagos.
- Mejor preparación para conciliación.
- Mejor integración con pedidos online.
- Mejor integración con reservas.
- Mejor preparación para facturación automática.
- Mayor seguridad del checkout.

## Consecuencias negativas o costos

- Mayor complejidad técnica.
- Requiere modelo formal de pagos.
- Requiere idempotencia.
- Requiere procesamiento seguro de webhooks.
- Requiere conciliación.
- Requiere manejo de incidencias.
- Requiere QA de escenarios complejos.
- Requiere administración segura de credenciales.
- Requiere separación de entornos sandbox/producción en fases futuras.

Estos costos son aceptables porque el pago online es una operación crítica de seguridad, dinero y confianza.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pago duplicado | Idempotencia por payment id, pedido e intento. |
| Webhook duplicado | Registro de eventos procesados y no-op seguro. |
| Webhook tardío | Validar reserva y pedido antes de avanzar. |
| Pago aprobado sin stock | Requiere reserva previa; si falla, incidencia. |
| Pago aprobado con monto distinto | Validar monto contra snapshot; incidencia. |
| Reserva expirada | No confirmar sin revalidación; incidencia si pago llegó tarde. |
| Venta duplicada | Restricción de una venta por pedido. |
| Comprobante duplicado | Facturación idempotente y una relación venta-comprobante controlada. |
| Credenciales filtradas | Variables de entorno, gestor de secretos futuro, no logs sensibles. |
| Endpoint webhook abusado | Validación, rate limiting, logging seguro e idempotencia. |
| Pago sin pedido asociado | Incidencia y conciliación manual. |
| Error en consulta al proveedor | Reintento controlado y estado pendiente de revisión. |
| Confusión sandbox/producción | Separación estricta de credenciales, URLs y configuración por entorno. |

## Impacto técnico

### Backend payments

Se requerirá módulo o submódulo de pagos.

Debe respetar arquitectura hexagonal:

- dominio de pago;
- casos de uso;
- puertos hacia proveedor;
- adaptador Mercado Pago;
- DTOs internos;
- control de idempotencia;
- auditoría.

### Pedidos online

El pedido será la entidad central relacionada con el pago.

### Reservas

El pago aprobado confirmará reserva. Pago fallido o expirado liberará reserva.

### Storefront API

Deberá iniciar checkout y devolver URL/identificador seguro de pago.

### Mercado Pago

Se implementará como proveedor inicial mediante adaptador.

### Venta

La venta se creará en fase posterior solo con pago aprobado y reserva confirmada.

### Facturación automática

La facturación dependerá de venta válida y pago consistente.

### Angular interno

Necesitará vista futura para revisar pagos, incidencias y conciliación.

### Next.js futuro

Iniciará checkout y consultará estado público del pedido.

### Auditoría

Debe registrar:

- creación de preferencia;
- recepción de webhook;
- validación de pago;
- confirmación;
- rechazo;
- incidencia;
- conciliación.

### Reportes

Futuros reportes:

- pagos aprobados;
- pagos rechazados;
- pagos con incidencia;
- pedidos pagados;
- pagos sin venta;
- ventas sin pago online;
- conciliación.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que Mercado Pago se integrará server-side.
2. Se aprueba que no se creará preferencia sin pedido válido.
3. Se aprueba que no se creará preferencia sin reserva válida.
4. Se aprueba que el monto enviado a Mercado Pago será calculado por backend.
5. Se aprueba que el frontend no define monto, estado ni total.
6. Se aprueba que webhook debe validarse server-side.
7. Se aprueba que webhook no basta por sí solo para venta/facturación.
8. Se aprueba usar idempotencia en preferencia, webhook, pago, reserva, venta y facturación futura.
9. Se aprueba que pago aprobado sin reserva válida genera incidencia.
10. Se aprueba que pago con monto distinto genera incidencia.
11. Se aprueba que no se convierte a venta sin pago aprobado validado.
12. Se aprueba que no se factura con pago inconsistente.
13. Se aprueba que debe existir conciliación de pagos.
14. Se aprueba que credenciales y tokens no se exponen al frontend.
15. Se aprueba que Mercado Pago no será la única fuente de verdad del pedido.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar Mercado Pago;
- crear endpoints;
- crear migraciones;
- implementar checkout;
- modificar pedidos;
- modificar reservas;
- modificar ventas;
- modificar facturación;
- activar pagos reales;
- tocar credenciales reales;
- configurar producción;
- integrar webhooks reales;
- modificar AWS/staging;
- crear UI de conciliación;
- emitir comprobantes desde pagos.

Este ADR solo define la estrategia de integración con Mercado Pago, webhooks e idempotencia. La implementación debe ocurrir en fases posteriores, alineada con pedidos online, stock reservado, Storefront API, venta, facturación automática, seguridad y conciliación.

## Decisión resultante

InkToy integrará Mercado Pago como proveedor inicial de pagos online mediante flujo server-side. La preferencia de pago se creará únicamente después de validar carrito, recalcular precios, validar stock, crear pedido online y crear reserva de stock.

El frontend nunca definirá montos, totales ni estados de pago. Mercado Pago no será la única fuente de verdad del pedido. El backend validará webhooks, aplicará idempotencia, verificará monto, moneda, pedido, reserva y estado real del pago antes de avanzar el pedido.

Un pago aprobado permitirá confirmar reserva y preparar el pedido para venta solo si pasa todas las validaciones. Pagos con monto inconsistente, sin reserva válida, tardíos o duplicados generarán incidencias y no deberán producir venta ni comprobante automático.

Las credenciales, webhooks y configuraciones deberán separarse por entorno. No se activarán pagos reales hasta contar con pedidos, reservas, checkout, seguridad, QA y monitoreo adecuados.

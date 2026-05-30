# ADR-012 — Pedidos online y lifecycle ecommerce para la futura tienda online SEO-first de InkToy

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

Los ADRs previos establecieron que:

- ERP/POS será la fuente de verdad del catálogo, precios, stock, pedidos, ventas y facturación.
- La tienda solo consumirá productos publicados mediante Storefront API/BFF.
- No se debe duplicar catálogo, precios ni stock.
- El precio online efectivo se calcula server-side.
- El frontend nunca decide precios, stock, descuentos ni totales finales.
- El stock disponible online se calcula server-side.
- Existirán reservas explícitas de stock para pedidos online.
- No se creará preferencia Mercado Pago sin validar carrito, precio y stock server-side.
- Las operaciones críticas deben ser transaccionales, idempotentes y protegidas contra concurrencia.
- No se permitirá compra de productos agotados.
- No se facturará ni convertirá a venta un pedido con incidencia de stock o pago.
- Mercado Pago será el medio de pago online inicial, pero su integración detallada se definirá en un ADR posterior.
- No habrá recojo en tienda ni pago contraentrega en la primera versión.
- Habrá delivery a todo el Perú, pero la estrategia logística se definirá en otro ADR.

El pedido online será la entidad central del ecommerce. Debe coordinar carrito validado, snapshot de productos y precios, reserva de stock, pago, preparación, despacho, conversión a venta y facturación automática futura.

## Problema

Se debe definir cómo se modela y controla el lifecycle del pedido online dentro de InkToy.

La decisión debe resolver:

- cuándo nace un pedido online;
- cómo se diferencia un carrito de un pedido;
- cuándo se reserva stock;
- cuándo se crea preferencia de pago;
- cuándo un pedido se considera pagado;
- cuándo puede prepararse;
- cuándo puede despacharse;
- cuándo se convierte en venta;
- cuándo se emite comprobante;
- cómo se manejan cancelaciones, expiraciones e incidencias;
- cómo se evita duplicar pedidos, pagos, ventas o comprobantes;
- cómo se conserva trazabilidad de cada transición.

Riesgos de no tener lifecycle claro:

- convertir carritos directamente en ventas;
- generar ventas sin pago aprobado;
- generar comprobantes sin stock confirmado;
- reservar stock sin pedido trazable;
- crear pedidos duplicados por reintentos;
- procesar varias veces un mismo webhook;
- generar más de una venta por el mismo pedido;
- generar más de un comprobante por la misma venta;
- perder trazabilidad de pagos, reservas, delivery o facturación;
- mezclar flujos POS con ecommerce sin control.

## Decisión

Se decide modelar el pedido online como una entidad formal dentro del ERP/POS, distinta del carrito, distinta de la venta y distinta del comprobante electrónico.

Decisiones principales:

1. El pedido online será una entidad formal del ERP/POS.
2. El pedido online no será una venta hasta cumplir condiciones específicas.
3. El pedido debe guardar snapshot de productos, variantes, precios, cliente, dirección, envío, stock, pago y totales.
4. El pedido debe coordinar reserva, pago, preparación, despacho, venta y facturación.
5. Las transiciones de estado deben ser controladas, auditadas e idempotentes.
6. No se debe convertir a venta si el pedido no tiene pago aprobado.
7. No se debe convertir a venta si la reserva de stock no está confirmada.
8. No se debe facturar si existe incidencia de pago, stock, datos tributarios o validación.
9. No se debe crear venta duplicada por reintentos.
10. No se debe crear comprobante duplicado por reintentos o webhooks duplicados.
11. El frontend nunca debe decidir el estado final del pedido.
12. Storefront API/BFF debe exponer solo información pública y segura del pedido.
13. El pedido debe tener un número público de pedido, distinto del ID interno.
14. Los datos personales deben exponerse de forma mínima y controlada.
15. El pedido debe conservar snapshots históricos para evitar que cambios posteriores de catálogo, precio o stock alteren operaciones ya confirmadas.

Decisión central:

> El pedido online será el orquestador del ecommerce. Solo podrá avanzar a venta y facturación cuando el backend confirme pago, stock, datos del cliente, dirección de envío y ausencia de incidencias.

## Modelo conceptual recomendado

### OnlineOrder

Entidad principal del pedido ecommerce.

Debe contener:

- identificador interno;
- número público de pedido;
- estado;
- origen;
- cliente o datos de comprador;
- dirección de envío;
- método de envío;
- snapshot de precios;
- total confirmado;
- moneda;
- referencia de reserva;
- referencia de pago;
- referencia futura de delivery;
- referencia futura de venta;
- referencia futura de comprobante;
- auditoría;
- timestamps relevantes.

El número público del pedido debe ser seguro para comunicación con cliente. No se recomienda exponer IDs internos como identificador principal.

### OnlineOrderItem

Línea del pedido.

Debe contener:

- producto simple o variante vendible;
- SKU;
- nombre del producto al momento de compra;
- atributos relevantes;
- cantidad;
- precio unitario confirmado;
- subtotal;
- descuentos futuros si aplica;
- total de línea;
- snapshot de imagen o referencia pública si aplica;
- estado de línea si se requiere en el futuro.

El pedido debe conservar snapshot. Si luego cambia el nombre, precio o imagen del producto, el pedido histórico no debe alterarse.

### OnlineCustomer o Customer

Puede representar:

- cliente invitado;
- cliente registrado futuro;
- cliente ya existente del ERP/POS.

En primera versión, puede permitirse checkout invitado con datos suficientes para pago, facturación y delivery.

### ShippingAddress

Dirección de envío capturada en checkout.

Debe contener como mínimo:

- nombres y apellidos del destinatario;
- documento si aplica;
- celular;
- email;
- departamento;
- provincia;
- distrito;
- dirección;
- referencia;
- observaciones opcionales;
- datos futuros de courier/tracking.

La estructura exacta de delivery se detallará en ADR posterior.

### PaymentReference

Referencia al pago online.

Debe contener:

- proveedor de pago;
- preference id;
- payment id cuando exista;
- estado del pago;
- monto esperado;
- monto aprobado;
- moneda;
- timestamps;
- idempotency key;
- eventos recibidos.

Mercado Pago será definido en detalle en un ADR posterior.

### StockReservationReference

Referencia a la reserva de stock.

Debe contener:

- reservation id;
- estado de reserva;
- fecha de expiración;
- fecha de confirmación;
- estado de incidencia si aplica.

### DeliveryReference

Referencia futura al despacho.

Debe contener:

- método de entrega;
- courier;
- costo de envío;
- tracking;
- estado de despacho;
- fechas relevantes.

No bloquea este ADR. La estrategia logística se definirá en otro ADR.

### SaleReference

Referencia a la venta generada desde el pedido online.

Debe existir solo cuando el pedido cumpla condiciones para convertirse a venta.

### ElectronicDocumentReference

Referencia al comprobante electrónico generado.

Debe existir solo después de venta válida y facturación exitosa.

### OrderEvent

Registro auditable de cambios de estado.

Ejemplos:

```text
ORDER_CREATED
ORDER_PAYMENT_PENDING
ORDER_PAYMENT_APPROVED
ORDER_PAYMENT_FAILED
ORDER_STOCK_RESERVED
ORDER_STOCK_EXCEPTION
ORDER_READY_TO_PREPARE
ORDER_PREPARING
ORDER_READY_TO_SHIP
ORDER_SHIPPED
ORDER_DELIVERED
ORDER_CANCELLED
ORDER_CONVERTED_TO_SALE
ORDER_BILLED
```

### OrderStatus

Estado del pedido.

Debe ser controlado por backend.

### OrderSource

Origen del pedido.

Valores conceptuales:

```text
ONLINE_STORE
ADMIN_CREATED
CUSTOMER_SERVICE
MARKETPLACE_FUTURE
```

En primera versión, el origen principal será `ONLINE_STORE`.

## Estados recomendados del pedido online

### DRAFT o CART_VALIDATED

Estado opcional para representar un carrito validado server-side antes de crear pedido formal.

Puede omitirse si se decide crear pedido directamente después de validar carrito.

Uso:

- validación temporal;
- revisión de cambios de precio o stock;
- cálculo previo.

No debe reservar stock de forma permanente.

### PENDING_PAYMENT

Pedido creado y pendiente de pago.

Uso:

- ya existe snapshot de productos y precios;
- ya se puede crear reserva temporal;
- ya se puede crear preferencia Mercado Pago.

Permite:

- crear reserva;
- crear preferencia;
- cancelar;
- expirar;
- pasar a pago procesando.

No permite:

- venta;
- facturación;
- despacho.

### PAYMENT_PROCESSING

Pago iniciado o en proceso de confirmación.

Uso:

- cliente fue enviado a Mercado Pago;
- se espera webhook o confirmación del proveedor.

Permite:

- pasar a `PAID`;
- pasar a `PAYMENT_FAILED`;
- pasar a `PAYMENT_EXPIRED`;
- pasar a incidencia si el pago llega inconsistente.

No permite:

- facturación automática sin validación;
- venta sin pago aprobado.

### PAID

Pago aprobado y validado server-side.

Uso:

- Mercado Pago confirmó pago;
- monto coincide con pedido;
- evento fue procesado de forma idempotente.

Permite:

- confirmar reserva;
- pasar a preparación si no hay incidencias;
- preparar conversión futura a venta.

No permite:

- facturación si falta reserva confirmada;
- despacho si no está listo para preparar.

### PAYMENT_FAILED

Pago rechazado o fallido.

Uso:

- Mercado Pago informa fallo;
- cliente no completó el pago correctamente.

Permite:

- liberar reserva;
- permitir nuevo intento controlado;
- cancelar pedido.

No permite:

- venta;
- facturación;
- despacho.

### PAYMENT_EXPIRED

El pago o la reserva venció.

Uso:

- se superó TTL de reserva;
- no existe pago aprobado válido en el plazo esperado.

Permite:

- liberar reserva;
- crear nuevo intento bajo política definida;
- cancelar.

No permite:

- venta;
- facturación.

### STOCK_RESERVED

Estado o subestado que indica reserva activa.

Puede manejarse como estado del pedido o como estado asociado a la reserva.

Uso recomendado:

- mantener la reserva en entidad separada;
- reflejar en pedido que el stock está reservado.

Permite:

- avanzar a pago;
- confirmar reserva con pago aprobado;
- liberar reserva si falla pago.

### STOCK_EXCEPTION

Pedido con incidencia de stock.

Uso:

- pago aprobado sin reserva válida;
- reserva expirada antes de confirmación;
- stock inconsistente;
- POS/ecommerce generaron conflicto;
- reserva no confirmable.

Permite:

- revisión manual;
- sustitución;
- devolución;
- cancelación;
- resolución controlada.

No permite:

- venta automática;
- facturación automática.

### READY_TO_PREPARE

Pedido pagado, reserva confirmada y sin incidencias.

Uso:

- listo para que operación prepare productos.

Permite:

- pasar a preparación;
- convertir a venta según política futura;
- iniciar flujo de facturación si corresponde.

### PREPARING

Pedido en preparación.

Uso:

- personal está separando productos;
- puede validar disponibilidad física real.

Permite:

- marcar listo para despacho;
- reportar incidencia operativa;
- cancelar bajo política controlada.

### READY_TO_SHIP

Pedido preparado y listo para entrega al courier.

Uso:

- productos separados;
- dirección validada;
- envío calculado;
- pago correcto.

Permite:

- generar despacho;
- registrar courier/tracking;
- pasar a enviado.

### SHIPPED

Pedido despachado.

Uso:

- pedido entregado a courier o enviado.

Permite:

- actualizar tracking;
- pasar a entregado;
- registrar incidencia logística.

### DELIVERED

Pedido entregado al cliente.

Uso:

- courier o equipo interno confirma entrega.

Puede ser terminal operativo, salvo devoluciones futuras.

### CANCELLED

Pedido cancelado.

Uso:

- cancelación por cliente;
- cancelación por operación;
- expiración;
- stock no disponible;
- pago fallido sin reintento.

Debe liberar reservas si existen y no debe generar venta/facturación automática.

### REFUND_PENDING o REFUNDED

Estados futuros para devolución.

Uso:

- pago debe devolverse;
- pedido fue cancelado después de pago;
- incidencia de stock o logística requiere devolución.

La lógica detallada se definirá con Mercado Pago y operaciones.

### CONVERTED_TO_SALE

Pedido convertido a venta ERP/POS.

Uso:

- existe venta asociada;
- operación es idempotente;
- no se debe convertir otra vez.

Puede coexistir con estados de fulfillment o manejarse como hito/referencia.

## Ciclo de vida recomendado

### 1. Carrito validado

El cliente arma carrito en la tienda pública.

Antes de crear pedido:

- backend valida productos;
- backend valida publicación online;
- backend valida variantes;
- backend recalcula precios;
- backend valida stock disponible online;
- backend calcula totales;
- backend valida datos mínimos del cliente y envío.

### 2. Creación de pedido pendiente

Si el carrito es válido:

- se crea `OnlineOrder`;
- estado inicial: `PENDING_PAYMENT`;
- se genera número público de pedido;
- se guarda snapshot de productos, precios y cantidades;
- se guarda dirección y datos de comprador;
- se guarda costo de envío futuro si aplica.

### 3. Snapshot de precios y productos

El pedido debe guardar:

- nombre del producto;
- SKU;
- variante;
- cantidad;
- precio unitario;
- subtotal;
- total;
- moneda;
- datos de envío;
- datos de cliente;
- datos tributarios si aplica;
- reglas aplicadas.

Cambios posteriores de precio o producto no deben alterar el pedido histórico.

### 4. Reserva de stock

Después de crear pedido:

- se crea reserva temporal;
- estado de reserva: `PENDING_PAYMENT`;
- reserva tiene TTL;
- pedido queda asociado a la reserva.

No se debe crear preferencia de pago si la reserva falla.

### 5. Creación de preferencia Mercado Pago

Luego de pedido y reserva válidos:

- backend crea preferencia;
- monto viene del snapshot del pedido;
- preference id queda asociado al pedido;
- estado puede pasar a `PAYMENT_PROCESSING`.

### 6. Pago aprobado, rechazado, cancelado o vencido

Mercado Pago informa resultado mediante webhook y/o consulta server-side.

- Pago aprobado: validar monto, pedido y reserva.
- Pago rechazado: liberar reserva.
- Pago cancelado: liberar reserva.
- Pago vencido: expirar pedido/reserva.
- Pago inconsistente: pasar a incidencia.

### 7. Confirmación o liberación de reserva

Si pago aprobado y válido:

- confirmar reserva;
- pedido pasa a `PAID` o `READY_TO_PREPARE`.

Si pago falló:

- liberar reserva;
- pedido pasa a `PAYMENT_FAILED`, `PAYMENT_EXPIRED` o `CANCELLED`.

### 8. Preparación del pedido

Pedido pagado y con reserva confirmada puede pasar a:

```text
READY_TO_PREPARE
PREPARING
READY_TO_SHIP
```

### 9. Despacho

Cuando el pedido está preparado:

- se registra courier o método de envío;
- se registra tracking futuro si aplica;
- estado pasa a `SHIPPED`.

### 10. Entrega

Cuando el courier confirma entrega o se registra manualmente:

```text
DELIVERED
```

### 11. Conversión a venta

La conversión a venta debe ocurrir solo cuando se cumplan reglas aprobadas.

Recomendación inicial:

- convertir a venta después de pago aprobado y reserva confirmada;
- antes de facturación automática;
- con idempotencia;
- con relación explícita pedido → venta.

La decisión exacta de si la venta se crea al confirmar pago o al iniciar preparación puede definirse en la fase de implementación, pero nunca antes de pago aprobado y reserva confirmada.

### 12. Emisión automática de comprobante futuro

La facturación automática se ejecutará solo si:

- pedido tiene pago aprobado;
- reserva confirmada;
- venta válida;
- datos tributarios válidos;
- serie activa;
- no hay incidencia.

### 13. Cancelaciones e incidencias

Cancelaciones e incidencias deben:

- liberar reserva si corresponde;
- no convertir a venta automáticamente;
- no facturar automáticamente;
- registrar evento;
- permitir revisión operativa.

## Reglas de transición

### Transiciones permitidas principales

| Desde | Hacia | Condición |
|---|---|---|
| `PENDING_PAYMENT` | `PAYMENT_PROCESSING` | Preferencia de pago creada. |
| `PENDING_PAYMENT` | `PAYMENT_EXPIRED` | TTL vencido sin pago. |
| `PENDING_PAYMENT` | `CANCELLED` | Cancelación antes de pago. |
| `PAYMENT_PROCESSING` | `PAID` | Pago aprobado y validado. |
| `PAYMENT_PROCESSING` | `PAYMENT_FAILED` | Pago rechazado/fallido. |
| `PAYMENT_PROCESSING` | `PAYMENT_EXPIRED` | Pago/reserva vencida. |
| `PAID` | `READY_TO_PREPARE` | Reserva confirmada y sin incidencias. |
| `PAID` | `STOCK_EXCEPTION` | Pago aprobado sin stock/reserva válida. |
| `READY_TO_PREPARE` | `PREPARING` | Operación inicia preparación. |
| `PREPARING` | `READY_TO_SHIP` | Pedido preparado. |
| `READY_TO_SHIP` | `SHIPPED` | Pedido despachado. |
| `SHIPPED` | `DELIVERED` | Entrega confirmada. |
| `PAID` | `CONVERTED_TO_SALE` | Venta creada idempotentemente. |

### Transiciones prohibidas

| Desde | Hacia | Motivo |
|---|---|---|
| `PENDING_PAYMENT` | `CONVERTED_TO_SALE` | No hay pago aprobado. |
| `PENDING_PAYMENT` | Facturación | No hay venta ni pago confirmado. |
| `PAYMENT_FAILED` | `CONVERTED_TO_SALE` | Pago fallido. |
| `PAYMENT_EXPIRED` | `CONVERTED_TO_SALE` | Pago/reserva expirada. |
| `STOCK_EXCEPTION` | Facturación automática | Hay incidencia de stock. |
| `CANCELLED` | `CONVERTED_TO_SALE` | Pedido cancelado. |
| `CONVERTED_TO_SALE` | `CONVERTED_TO_SALE` | Evitar doble venta. |
| Facturado | Facturado nuevamente | Evitar doble comprobante. |

### Estados terminales

Pueden considerarse terminales o casi terminales:

- `DELIVERED`;
- `CANCELLED`;
- `REFUNDED`;
- `CONVERTED_TO_SALE` como hito irreversible;
- `PAYMENT_EXPIRED`, salvo nuevo intento controlado.

### Estados que permiten cancelación

Permiten cancelación controlada:

- `PENDING_PAYMENT`;
- `PAYMENT_PROCESSING`;
- `PAYMENT_FAILED`;
- `PAYMENT_EXPIRED`;
- `READY_TO_PREPARE`;
- `PREPARING`, según política;
- `STOCK_EXCEPTION`.

Cancelación después de `SHIPPED` o `DELIVERED` debe tratarse como devolución o incidencia logística, no como simple cancelación.

### Estados que permiten conversión a venta

Solo debería permitirse cuando:

- pago está aprobado;
- reserva está confirmada;
- no hay incidencia de stock;
- no hay incidencia de precio/pago;
- pedido no fue convertido antes.

### Estados que permiten facturación

Solo si:

- existe venta válida;
- pedido no tiene incidencia;
- datos tributarios son válidos;
- total pagado coincide con total de venta;
- existe serie activa;
- no existe comprobante previo para esa venta.

## Relación con carrito y Storefront API

### Validación server-side

Storefront API/BFF debe validar carrito antes de crear pedido.

Debe validar:

- producto publicado online;
- variante activa;
- cantidad válida;
- precio online efectivo;
- stock disponible online;
- datos mínimos de cliente;
- dirección de envío;
- política de delivery;
- restricciones de venta.

### Snapshot de carrito

Al crear pedido, el carrito validado se transforma en snapshot.

El snapshot debe conservar:

- productos;
- variantes;
- SKU;
- nombres;
- precios;
- cantidades;
- totales;
- dirección;
- datos de cliente;
- datos de envío.

### Datos que vienen del frontend y deben validarse

El frontend puede enviar:

- identificador público de producto/variante;
- cantidad solicitada;
- datos de cliente;
- dirección;
- tipo de comprobante deseado;
- método de envío;
- cupón futuro si aplica.

Backend debe validar todo.

### Datos que nunca se deben confiar desde frontend

No se debe confiar en:

- precio unitario;
- subtotal;
- total;
- stock;
- descuento;
- impuesto;
- costo final de envío;
- estado de pedido;
- estado de pago;
- estado de reserva;
- datos tributarios no validados.

## Relación con stock reservado

Reglas:

1. Pedido pendiente requiere reserva temporal antes de crear preferencia.
2. Pedido pagado requiere reserva confirmada.
3. Pedido cancelado libera reserva si corresponde.
4. Pago fallido libera reserva.
5. Pago expirado expira/libera reserva.
6. Reserva vencida impide conversión automática a venta.
7. Pedido con reserva vencida puede pasar a `PAYMENT_EXPIRED` o `STOCK_EXCEPTION`.
8. No convertir a venta sin reserva confirmada.
9. No facturar sin reserva confirmada.

La reserva protege la consistencia entre ecommerce, POS y stock físico.

## Relación con precios

El pedido debe guardar snapshot de:

- precio unitario;
- subtotal;
- descuentos futuros;
- envío futuro;
- impuestos si aplica;
- total;
- moneda;
- regla de precio o versión de cálculo.

No se deben recalcular pedidos históricos por cambios posteriores de precio.

### Si el precio cambia entre carrito y checkout

El backend debe:

1. detectar diferencia;
2. no crear pedido automáticamente si el cliente no confirmó;
3. devolver respuesta indicando cambio;
4. pedir confirmación del cliente;
5. crear pedido con precio actualizado solo tras aceptación.

### Si el precio cambia después del pago

Debe respetarse el snapshot del pedido pagado.

No se debe alterar venta o comprobante por cambios posteriores de catálogo/precio.

## Relación con Mercado Pago

### Pedido antes de preferencia

El pedido debe existir antes de crear preferencia.

Orden recomendado:

```text
Validar carrito
→ Crear pedido PENDING_PAYMENT
→ Crear reserva
→ Crear preferencia Mercado Pago
```

### Preferencia asociada a pedido

La preferencia debe quedar vinculada al pedido.

Debe registrarse:

- preference id;
- monto esperado;
- moneda;
- estado;
- intento de pago;
- idempotency key.

### Webhook actualiza pago y pedido

El webhook debe:

- validarse server-side;
- procesarse con idempotencia;
- consultar pago real si corresponde;
- comparar monto aprobado con total esperado;
- actualizar pago;
- actualizar pedido;
- confirmar o liberar reserva.

### Pago aprobado sin reserva válida

Debe generar incidencia:

```text
PAYMENT_APPROVED_WITHOUT_VALID_RESERVATION
```

No debe crear venta ni comprobante automáticamente.

### Pago con monto distinto

Debe generar incidencia:

```text
PAYMENT_AMOUNT_MISMATCH
```

No debe facturarse automáticamente.

### No confiar solo en webhook

No se debe convertir a venta ni facturar solo porque llegó un webhook. El backend debe validar:

- autenticidad;
- estado real del pago;
- monto;
- moneda;
- pedido asociado;
- reserva asociada;
- idempotencia.

## Relación con venta POS/ERP

### Cuándo se convierte en venta

Un pedido online se convierte en venta cuando:

- el pago está aprobado;
- el monto coincide;
- la reserva está confirmada;
- no hay incidencia;
- el pedido no fue convertido antes;
- se cumplen datos mínimos requeridos para venta.

### Información que debe pasar a la venta

La venta debe recibir:

- items;
- cantidades;
- precios confirmados;
- descuentos futuros si aplican;
- total;
- cliente si aplica;
- canal de venta online;
- referencia al pedido online;
- referencia de pago;
- referencia de almacén;
- metadata necesaria para facturación.

### Evitar doble conversión

Debe existir idempotencia y restricción lógica:

```text
un pedido online no puede generar más de una venta válida
```

### Relación venta-pedido

Debe existir referencia explícita:

```text
OnlineOrder → Sale
Sale → OnlineOrder
```

o equivalente de solo lectura.

### Diferencia entre venta POS y venta online

Venta POS:

- ocurre en tienda física;
- puede estar ligada a sesión de caja;
- pago se registra en POS;
- stock se descuenta por operación presencial.

Venta online:

- nace desde pedido online;
- pago viene de Mercado Pago;
- requiere reserva previa;
- requiere delivery;
- puede tener estados de preparación/despacho;
- facturación se integra después de confirmar pago y venta.

No se debe mezclar flujo POS con ecommerce sin distinguir canal.

## Relación con facturación automática

### Cuándo emitir boleta/factura

La emisión debe ocurrir cuando:

- existe pedido pagado;
- existe venta válida;
- no hay incidencia de stock;
- no hay incidencia de pago;
- datos tributarios son válidos;
- existe serie activa;
- no existe comprobante previo.

La decisión exacta de emitir inmediatamente después de venta o después de preparación se definirá en ADR de facturación ecommerce.

### Datos necesarios antes de facturar

El pedido debe tener:

- tipo de comprobante deseado: boleta o factura;
- datos de cliente;
- documento;
- datos fiscales si es factura;
- dirección fiscal si aplica;
- items;
- precios confirmados;
- impuestos;
- total;
- venta asociada.

### Si el pago está aprobado pero falla facturación

Debe:

- mantener pedido/venta en estado de incidencia de facturación;
- no duplicar comprobante;
- permitir reintento controlado;
- registrar error;
- alertar operación.

Estado conceptual:

```text
BILLING_EXCEPTION
```

### Si no hay serie activa

No se debe intentar emitir indefinidamente.

Debe generarse incidencia:

```text
BILLING_SERIES_NOT_AVAILABLE
```

### Regla crítica

No emitir comprobante si existe incidencia de:

- stock;
- pago;
- precio;
- datos tributarios;
- venta duplicada;
- comprobante previo.

## Relación con delivery

El pedido debe guardar dirección y datos de envío desde el inicio.

Debe preparar estructura para:

- departamento;
- provincia;
- distrito;
- dirección;
- referencia;
- celular;
- destinatario;
- costo de envío;
- courier futuro;
- tracking futuro;
- estado de despacho.

Estados de despacho básicos:

```text
READY_TO_SHIP
SHIPPED
DELIVERED
```

No se debe bloquear este ADR esperando integración definitiva con courier.

La integración con Shalom, Olva Courier, Urbano u otro proveedor se definirá en ADR posterior.

## Relación con clientes

La primera versión puede permitir checkout invitado, siempre que se capturen datos suficientes para:

- pago;
- seguimiento;
- delivery;
- boleta o factura;
- atención al cliente;
- auditoría.

Datos mínimos:

- nombres y apellidos;
- email;
- celular;
- documento si aplica;
- dirección de envío;
- datos tributarios si solicita factura.

En el futuro puede existir:

- cliente registrado;
- historial de pedidos;
- login por email/celular;
- direcciones guardadas;
- seguimiento de pedidos.

El pedido debe poder asociarse a cliente registrado en el futuro sin romper el modelo inicial.

## Privacidad y exposición pública del pedido

La consulta pública de un pedido debe ser limitada.

Reglas:

1. No exponer ID interno como identificador público principal.
2. Usar número público de pedido o token seguro.
3. No exponer datos personales innecesarios.
4. No exponer datos internos de pago, reserva o facturación.
5. No permitir consultar pedidos de terceros sin validación suficiente.
6. No exponer información sensible por Storefront API.
7. En futuras cuentas de cliente, validar autorización antes de mostrar historial.

## Reglas de negocio

Reglas obligatorias:

1. No crear pedido sin carrito validado.
2. No crear pedido sin precio calculado server-side.
3. No crear pedido sin stock disponible o reserva válida.
4. No crear preferencia Mercado Pago sin pedido y reserva.
5. No convertir a venta sin pago aprobado.
6. No convertir a venta sin reserva confirmada.
7. No facturar pedido con incidencia.
8. No duplicar pedido por reintento.
9. No duplicar venta por reintento.
10. No duplicar comprobante por reintento.
11. Toda transición crítica debe auditarse.
12. El frontend no decide estado del pedido.
13. El backend debe validar toda transición.
14. El pedido debe guardar snapshot histórico.
15. No alterar pedido histórico por cambios posteriores de producto, precio o stock.
16. Pedido cancelado no debe convertirse a venta.
17. Pedido expirado no debe facturarse.
18. Pedido con pago inconsistente requiere revisión manual.
19. Storefront API no debe exponer datos internos del pedido.
20. Toda transición crítica debe ser idempotente.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Convertir carrito directamente a venta | Descartada. No permite controlar pago, reserva, delivery ni incidencias. |
| Crear venta antes del pago | Descartada. Genera ventas sin cobro confirmado y riesgo de facturación incorrecta. |
| Crear pedido sin reserva | Descartada. Riesgo de pago aprobado sin stock. |
| Crear pedido formal con lifecycle controlado | Aceptada. Permite trazabilidad, idempotencia, stock reservado, pago, delivery y facturación segura. |
| Manejar pedidos solo en la tienda online | Descartada. Rompe ERP/POS como fuente de verdad y duplica operación. |

## Justificación

### Operación real

El pedido online permite administrar una venta ecommerce antes de que sea venta definitiva.

### Seguridad

El frontend no controla estados, precios, stock ni totales.

### Consistencia

El pedido conecta catálogo, stock, precio, pago, venta, facturación y delivery.

### Trazabilidad

Cada transición queda registrada y auditable.

### Bajo riesgo

Evita facturar, vender o despachar pedidos con inconsistencias.

### Preparación para delivery y Mercado Pago

Permite integrar pagos y logística de forma ordenada, sin improvisar.

## Consecuencias positivas

- Lifecycle claro del pedido online.
- Menor riesgo de ventas duplicadas.
- Menor riesgo de comprobantes duplicados.
- Mejor trazabilidad de pagos y reservas.
- Mejor preparación para delivery.
- Mejor preparación para facturación automática.
- Mejor consistencia con POS/ERP.
- Mejor soporte para incidencias.
- Mejor experiencia operativa para atención al cliente.
- Mejor base para reportes ecommerce.
- Mejor separación entre carrito, pedido, venta y comprobante.
- Mejor protección de datos al usar número público de pedido.

## Consecuencias negativas o costos

- Se agrega nueva entidad de negocio.
- Se requiere modelar estados y transiciones.
- Se requiere auditoría.
- Se requiere idempotencia.
- Se requiere integración futura con pagos, reservas, venta y facturación.
- Se requiere UI interna futura para gestionar pedidos.
- Se requiere QA de muchos escenarios.
- Se requiere definir políticas operativas de cancelación, devolución y delivery.
- Se requiere proteger datos personales en consultas públicas.

Estos costos son aceptables porque un ecommerce real no debe operar convirtiendo carritos directamente en ventas sin control.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pedido duplicado | Idempotencia en creación de pedido. |
| Pago duplicado | Idempotencia en Mercado Pago y asociación a pedido. |
| Venta duplicada | Restricción de una venta por pedido. |
| Comprobante duplicado | Una venta no debe generar más de un comprobante del mismo flujo. |
| Pedido pagado sin stock | Reserva previa y estado `STOCK_EXCEPTION`. |
| Pedido pagado sin facturación | Estado de incidencia de facturación y reintento controlado. |
| Cambio de precio entre carrito y pago | Snapshot de precio y revalidación. |
| Cliente con datos incompletos | Validaciones antes de pago/facturación/despacho. |
| Delivery pendiente o mal registrado | Dirección estructurada y estados de despacho. |
| Estados inconsistentes | Máquina de estados controlada por backend. |
| Webhook duplicado | Procesamiento idempotente. |
| Pedido cancelado con reserva activa | Cancelación debe liberar reserva. |
| Exposición de datos personales | Storefront API pública limitada y uso de número público/token. |

## Impacto técnico

### Backend ecommerce/orders

Se requerirá módulo o submódulo para pedidos online.

Debe respetar arquitectura hexagonal:

- dominio de pedido;
- casos de uso;
- puertos;
- adaptadores;
- DTOs públicos e internos.

### Inventario

Debe coordinarse con reservas.

### Reservas

Pedido debe referenciar reserva y reaccionar a cambios de estado.

### Mercado Pago futuro

Pedido será la entidad base para preferencia, webhook y conciliación.

### Facturación automática

Pedido se convertirá a venta antes de emitir comprobante.

### Delivery

Pedido deberá almacenar dirección, costo de envío y estados básicos de despacho.

### Clientes

Pedido debe soportar checkout invitado y futura cuenta de cliente.

### Storefront API

Debe permitir crear pedido y consultar estado público de forma segura.

### Angular interno

Se necesitará futura UI para administrar pedidos, incidencias, preparación y despacho.

### Next.js futuro

Consumirá endpoints para checkout y seguimiento.

### Auditoría

Toda transición crítica debe registrarse.

### Reportes

Pedidos online deberán alimentar reportes de ecommerce, pagos, ventas, delivery e incidencias.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba modelar pedido online como entidad formal.
2. Se aprueba que pedido online no es venta hasta cumplir condiciones específicas.
3. Se aprueba guardar snapshot de productos, precios, cliente, dirección, envío y totales.
4. Se aprueba que pedido coordina reserva, pago, preparación, despacho, venta y facturación futura.
5. Se aprueban estados principales del pedido online.
6. Se aprueban transiciones permitidas y prohibidas.
7. Se aprueba no convertir a venta sin pago aprobado.
8. Se aprueba no convertir a venta sin reserva confirmada.
9. Se aprueba no facturar pedidos con incidencia.
10. Se aprueba idempotencia para pedido, pago, venta y comprobante.
11. Se aprueba que frontend no decide estado final.
12. Se aprueba que Storefront API valida carrito server-side antes de crear pedido.
13. Se aprueba que delivery y facturación se integrarán en ADRs posteriores.
14. Se aprueba que pedidos solo en la tienda online no son aceptables como fuente de verdad.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar pedidos online;
- implementar checkout;
- implementar Mercado Pago;
- implementar delivery;
- implementar facturación automática ecommerce;
- crear endpoints;
- crear migraciones;
- modificar POS;
- modificar ventas actuales;
- modificar inventario actual;
- activar venta online;
- crear UI interna de pedidos;
- crear seguimiento público de pedidos;
- cambiar AWS/staging.

Este ADR solo define el modelo y lifecycle del pedido online. La implementación debe ocurrir en fases posteriores, alineada con Storefront API, stock reservado, Mercado Pago, venta, facturación automática, delivery, clientes y auditoría.

## Decisión resultante

InkToy modelará el pedido online como entidad formal dentro del ERP/POS. El pedido online será diferente del carrito, de la venta y del comprobante electrónico.

El pedido online coordinará validación de carrito, snapshot de productos y precios, reserva de stock, pago, preparación, despacho, conversión a venta y facturación automática futura. Solo podrá convertirse a venta cuando exista pago aprobado, reserva confirmada y ausencia de incidencias.

La facturación automática futura solo podrá ejecutarse sobre una venta válida derivada de un pedido consistente. Las transiciones del pedido serán controladas, auditadas e idempotentes para evitar duplicidad de pedidos, pagos, ventas o comprobantes.

El pedido tendrá número público seguro para comunicación con el cliente, sin exponer IDs internos como identificador principal. Storefront API deberá exponer únicamente información pública y segura del pedido.

# ADR-009 — Almacén online configurable, stock disponible online y stock reservado para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, ventas, pedidos, facturación y operación interna. La futura tienda pública vivirá en `inktoy.pe`, será desarrollada con Next.js y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.
- ADR-007: Imágenes y assets de producto.
- ADR-008: SEO metadata.

Los ADRs previos establecieron que:

- la tienda pública será Next.js con SSR/SSG/ISR;
- `inktoy.pe` será la tienda pública SEO-first;
- `app.inktoy.pe` será el ERP/POS interno;
- `api.inktoy.pe` será la Storefront API/API pública controlada;
- ERP/POS Spring Boot será la fuente de verdad;
- el catálogo online se gestiona desde el ERP/POS;
- la tienda solo consume productos publicados mediante Storefront API/BFF;
- no se debe duplicar catálogo, precios ni stock;
- el precio POS será precio base por defecto, con posible precio online distinto mediante override server-side;
- las marcas serán entidades formales;
- los productos con diferencias vendibles relevantes usarán producto padre + variantes;
- la variante será la unidad vendible concreta;
- el stock debe controlarse a nivel de variante vendible cuando existan variantes;
- las URLs públicas usarán slugs limpios y estables;
- la metadata SEO será administrada desde el ERP/POS;
- las imágenes/assets se gestionarán desde el ERP/POS.

La tienda online será para ventas reales online. No habrá recojo en tienda en la primera versión, no habrá pago contraentrega y el pago online será inicialmente con Mercado Pago. El almacén online inicial será compartido con el POS, pero debe poder configurarse y cambiarse desde el ERP/POS. No se permitirá comprar productos agotados en la primera versión.

En ecommerce real, el stock online es una decisión crítica. Un error de stock puede generar sobreventa, cobros sin producto disponible, cancelaciones, reclamos, mala experiencia del cliente y carga operativa adicional.

## Problema

Se debe definir cómo funcionará el almacén online configurable, cómo se calculará el stock disponible online y cómo se manejarán reservas de stock para pedidos online.

La decisión debe resolver:

- qué almacén alimentará la tienda online;
- cómo se configura y cambia el almacén online;
- cómo calcular disponibilidad online;
- cómo manejar stock físico, stock reservado y stock de seguridad;
- cuándo reservar stock;
- cómo liberar reservas;
- cómo evitar sobreventa cuando POS y ecommerce comparten almacén;
- cómo interactuar con Mercado Pago;
- qué disponibilidad se expone públicamente por Storefront API/BFF;
- qué hacer si cambia el stock entre carrito, checkout y pago.

Riesgos si se vende online sin stock confiable:

- clientes pagan por productos no disponibles;
- pedidos deben cancelarse manualmente;
- facturación automática puede intentar emitir comprobantes de pedidos inviables;
- el negocio pierde confianza;
- se generan devoluciones, reclamos y carga operativa.

Riesgos de usar stock físico directo sin reservas:

- dos clientes pueden intentar comprar la última unidad;
- POS puede vender físicamente un producto mientras un cliente online está pagando;
- Mercado Pago puede aprobar un pago cuando el stock ya fue vendido;
- el stock mostrado en la tienda puede estar desactualizado.

Riesgos de compartir almacén con POS:

- competencia directa entre ventas físicas y ventas online;
- stock cambia en tiempo real por operaciones internas;
- una compra online puede quedar sin producto si no existe reserva;
- el personal puede no distinguir stock disponible físico de stock comprometido.

Riesgos de cambiar almacén online con pedidos pendientes:

- reservas activas podrían quedar apuntando a un almacén anterior;
- pedidos pendientes podrían confirmarse contra otro stock;
- disponibilidad pública podría cambiar bruscamente;
- reportes y auditoría podrían quedar inconsistentes.

Riesgos de exponer stock exacto públicamente:

- competidores podrían monitorear inventario;
- bots podrían detectar niveles de stock;
- clientes podrían interpretar como promesa absoluta una cantidad que cambia dinámicamente;
- aumenta la superficie de abuso del sistema.

## Decisión

Se decide que:

1. ERP/POS será la fuente de verdad del stock.
2. Debe existir una configuración formal de almacén online.
3. El almacén online inicial podrá ser compartido con POS.
4. El almacén online debe poder cambiarse desde el ERP/POS solo bajo reglas controladas.
5. El stock disponible online debe calcularse server-side.
6. Debe existir stock reservado para pedidos online.
7. Debe existir stock de seguridad configurable.
8. No se permitirá compra si no hay stock disponible online.
9. POS y ecommerce deben operar sobre la misma fuente de verdad de inventario.
10. Storefront API/BFF solo debe exponer disponibilidad pública, no stock operativo interno completo.
11. El frontend nunca debe decidir stock ni disponibilidad final.
12. Mercado Pago no debe iniciarse sin validación server-side de stock y reserva temporal.
13. Las operaciones críticas de stock y reserva deben ser transaccionales, idempotentes y protegidas contra condiciones de carrera.

Decisión central:

> El stock disponible online no será el stock físico bruto. Será un cálculo server-side basado en stock físico del almacén online, menos stock reservado online, menos stock de seguridad.

Fórmula base:

```text
stockDisponibleOnline = stockFisicoAlmacenOnline - stockReservadoOnline - stockSeguridad
```

## Modelo conceptual recomendado

### EcommerceSettings

Configuración global ecommerce.

Puede incluir:

- ecommerce habilitado/deshabilitado;
- almacén online activo;
- política de stock de seguridad;
- política de reserva;
- TTL de reserva;
- estado de checkout online;
- configuración futura de Mercado Pago;
- configuración futura de delivery.

Uso:

- controlar operación ecommerce;
- activar o desactivar venta online;
- definir reglas centrales de stock y disponibilidad.

### OnlineWarehouseConfig

Configuración específica del almacén usado para ecommerce.

Debe definir:

- `warehouseId`;
- fecha de activación;
- estado activo/inactivo;
- usuario que realizó el cambio;
- motivo del cambio;
- política de transición;
- historial de cambios.

### Warehouse

Almacén físico o lógico existente en ERP/POS.

Puede ser:

- almacén principal;
- almacén de tienda física;
- almacén ecommerce futuro;
- almacén temporal;
- almacén compartido POS/ecommerce.

En primera versión, el almacén online podrá ser compartido con POS.

### ProductVariant / producto simple

La unidad de stock debe ser:

- variante vendible, si el producto tiene variantes;
- producto simple, si no tiene variantes.

El stock online no debe calcularse sobre producto padre genérico cuando existan variantes.

### PhysicalStock

Stock físico registrado en el almacén online.

Representa la cantidad real existente según inventario del ERP/POS.

### ReservedStock

Cantidad comprometida temporal o definitivamente por pedidos online aún no convertidos en venta final o aún no liberados.

### SafetyStock

Cantidad que se resta del stock físico para reducir riesgo de sobreventa.

Ejemplo:

```text
stockFisico = 10
stockReservadoOnline = 2
stockSeguridad = 1
stockDisponibleOnline = 7
```

### AvailableOnlineStock

Resultado calculado para ecommerce.

No debe ser un campo manipulado por frontend. Puede materializarse como read-model/cache futuro, pero la fuente lógica debe ser server-side.

### OnlineStockReservation

Reserva de stock para un checkout/pedido online.

Debe incluir:

- pedido asociado;
- producto simple o variante;
- cantidad reservada;
- almacén;
- estado;
- fecha de creación;
- fecha de expiración;
- motivo de liberación o confirmación.

### ReservationStatus

Estados recomendados:

```text
PENDING_PAYMENT
CONFIRMED
RELEASED
EXPIRED
CANCELLED
FAILED
```

| Estado | Significado |
|---|---|
| `PENDING_PAYMENT` | Stock reservado mientras el cliente completa pago |
| `CONFIRMED` | Reserva confirmada por pago aprobado y lista para pedido/venta |
| `RELEASED` | Reserva liberada manual o automáticamente |
| `EXPIRED` | Reserva vencida por TTL |
| `CANCELLED` | Pedido cancelado |
| `FAILED` | Error técnico o inconsistencia |

### ReservationTTL

Tiempo máximo de una reserva temporal.

Debe ser configurable.

Ejemplo inicial recomendado:

```text
15 a 30 minutos
```

El valor exacto debe definirse en implementación según comportamiento real de Mercado Pago y operación del negocio.

## Fórmula recomendada de stock disponible online

Fórmula base:

```text
stockDisponibleOnline = stockFisicoAlmacenOnline - stockReservadoOnline - stockSeguridad
```

Donde:

- `stockFisicoAlmacenOnline`: stock físico del producto simple o variante en el almacén online configurado.
- `stockReservadoOnline`: stock reservado por pedidos online activos o pendientes.
- `stockSeguridad`: margen configurado para reducir riesgo de sobreventa.

### Producto simple

Para producto sin variantes:

```text
stockDisponibleOnline(producto) =
  stockFisico(producto, almacenOnline)
  - stockReservadoOnline(producto, almacenOnline)
  - stockSeguridad(producto o global)
```

### Producto con variantes

Para producto con variantes:

```text
stockDisponibleOnline(variante) =
  stockFisico(variante, almacenOnline)
  - stockReservadoOnline(variante, almacenOnline)
  - stockSeguridad(variante o global)
```

El producto padre puede mostrar un resumen:

- disponible si al menos una variante está disponible;
- agotado si ninguna variante tiene disponibilidad;
- bajo stock si las variantes disponibles están por debajo de un umbral.

### Casos con stock cero o negativo

Si la fórmula resulta menor o igual a cero:

```text
stockDisponibleOnline <= 0
```

Entonces la disponibilidad pública debe ser:

```text
OUT_OF_STOCK
```

No debe permitirse compra.

Si por error operativo el stock físico queda negativo, la tienda debe tratarlo como agotado y no exponer el número exacto.

## Almacén online configurable

Debe existir una configuración para elegir qué almacén alimenta la tienda online.

Ejemplo conceptual:

```text
Almacén online activo: Almacén Principal
```

Debe poder cambiarse desde ERP/POS por un rol autorizado.

### Cambio de almacén online

Cambiar el almacén online es una operación sensible.

Antes de permitir el cambio, el sistema debe validar:

1. Si existen pedidos online pendientes.
2. Si existen reservas activas.
3. Si existen pagos pendientes.
4. Si existen pedidos pagados no despachados.
5. Si hay procesos de conciliación o facturación pendientes.
6. Si el nuevo almacén tiene stock suficiente o stock inicial válido.
7. Si el cambio debe aplicarse inmediatamente o programarse.

### Política recomendada

En primera versión, no permitir cambio de almacén online si existen:

- reservas `PENDING_PAYMENT`;
- pedidos online pendientes de pago;
- pedidos pagados pendientes de preparación;
- pedidos con incidencia de stock;
- procesos críticos abiertos.

Mensaje operativo recomendado:

```text
No se puede cambiar el almacén online porque existen pedidos o reservas activas. Finaliza o libera esas operaciones antes de cambiar la configuración.
```

### Historial de cambios

Debe existir historial de cambios de almacén online.

Debe registrar:

- almacén anterior;
- almacén nuevo;
- usuario;
- fecha/hora;
- motivo;
- estado del cambio;
- observaciones.

### Roles autorizados

Cambiar almacén online debe requerir rol autorizado, por ejemplo:

- ADMIN;
- SUPERVISOR;
- futuro ECOMMERCE_MANAGER.

No debería estar permitido para cajeros ni usuarios operativos sin permisos de configuración.

## Stock reservado

El stock reservado evita sobreventa durante checkout y pago.

### Cuándo reservar stock

No se recomienda reservar stock solo por agregar productos al carrito, porque muchos carritos se abandonan y bloquearían inventario innecesariamente.

Recomendación:

1. Carrito: no reserva stock, solo valida disponibilidad estimada.
2. Validación de carrito: backend recalcula stock disponible online.
3. Inicio de checkout / creación de pedido pendiente: reservar stock temporalmente.
4. Creación de preferencia Mercado Pago: solo después de reservar stock.
5. Pago aprobado: confirmar reserva.
6. Pago fallido, cancelado o expirado: liberar reserva.

Flujo recomendado:

```text
Carrito
→ validar carrito server-side
→ crear pedido PENDING_PAYMENT
→ crear reserva PENDING_PAYMENT
→ crear preferencia Mercado Pago
→ webhook de pago
→ confirmar o liberar reserva
```

### Diferencia entre carrito, pedido pendiente y pedido pagado

| Estado | Reserva |
|---|---|
| Carrito local/frontend | No reserva |
| Carrito validado | No reserva permanente |
| Pedido pendiente de pago | Reserva temporal |
| Pago aprobado | Reserva confirmada |
| Pago fallido/cancelado | Reserva liberada |
| Pedido cancelado | Reserva liberada |
| Pedido convertido a venta | Reserva consumida por venta/inventario |

### TTL de reserva

La reserva temporal debe tener expiración.

Ejemplo conceptual:

```text
reservationExpiresAt = createdAt + 30 minutos
```

Si el cliente no paga dentro del TTL:

- la reserva expira;
- el pedido puede pasar a `PAYMENT_EXPIRED`;
- el stock vuelve a estar disponible;
- la preferencia de pago debe invalidarse o tratarse como no aceptable si es posible.

### Liberación automática

Debe existir un proceso para liberar reservas vencidas.

Puede ser:

- job programado;
- proceso de limpieza;
- validación lazy en operaciones críticas;
- combinación de ambos.

### Pago fallido o cancelado

Si Mercado Pago informa pago rechazado, cancelado o fallido:

- liberar reserva;
- actualizar pedido;
- registrar evento;
- mantener auditoría.

### Pago aprobado

Si Mercado Pago aprueba:

- validar idempotencia;
- confirmar reserva;
- avanzar estado del pedido;
- preparar conversión futura a venta;
- preparar facturación automática futura.

### Webhook tardío o duplicado

El webhook puede llegar tarde o repetido.

Reglas:

1. Todo webhook debe ser idempotente.
2. No debe confirmar dos veces la misma reserva.
3. Si el pago llega aprobado pero la reserva ya expiró, el sistema debe intentar resolver de forma segura.
4. Si ya no hay stock, el pedido debe pasar a incidencia operativa, no facturarse automáticamente.
5. El caso debe requerir revisión manual y posible devolución.

Estado sugerido:

```text
PAYMENT_APPROVED_STOCK_EXCEPTION
```

Este estado evita emitir comprobante o prometer despacho si el pago fue aprobado pero ya no existe stock confirmable.

## Relación con POS

En la primera versión, POS y ecommerce podrán compartir el mismo almacén.

Esto implica que:

- el POS puede vender productos físicamente mientras hay clientes online;
- ecommerce puede reservar productos mientras POS está operando;
- ambos deben validar stock contra la misma fuente de verdad.

### Riesgo principal

Si POS vende la última unidad mientras un cliente online está en checkout, puede ocurrir sobreventa si no hay reserva.

### Regla recomendada

Toda operación crítica debe validar stock en tiempo real server-side:

- venta POS;
- validación de carrito;
- creación de pedido online;
- creación de reserva;
- confirmación de pago;
- conversión de pedido a venta.

### POS y stock reservado online

Cuando POS venda desde el almacén online compartido, debe considerar que una parte del stock puede estar reservada por ecommerce.

Regla conceptual:

```text
stockDisponibleParaPOS = stockFisico - stockReservadoOnline
```

La decisión exacta de si POS debe bloquear venta por reservas online depende de implementación operativa, pero para evitar sobreventa lo recomendable es que POS respete reservas confirmadas o pendientes críticas.

### Cambio de stock entre carrito y pago

Si el stock cambia entre carrito y checkout:

- el backend debe recalcular;
- si ya no hay disponibilidad, no se crea pedido ni preferencia de pago;
- el cliente debe recibir mensaje claro.

Si el stock cambia después de crear reserva:

- la reserva protege el stock durante su TTL;
- POS no debería consumir stock reservado;
- si ocurre una inconsistencia, debe generarse incidencia.

## Relación con pedidos online

El pedido online debe integrarse con reservas.

Flujo recomendado:

1. Cliente agrega productos al carrito.
2. Cliente inicia checkout.
3. Backend valida carrito.
4. Backend recalcula precios y stock.
5. Backend crea pedido `PENDING_PAYMENT`.
6. Backend crea reservas `PENDING_PAYMENT`.
7. Backend crea preferencia de Mercado Pago.
8. Cliente paga.
9. Webhook confirma pago.
10. Reserva pasa a `CONFIRMED`.
11. Pedido pasa a `PAID` o estado equivalente.
12. Pedido se prepara para despacho.
13. Pedido se convierte a venta o genera venta/facturación según ADR futuro.
14. Si no se paga, la reserva se libera.

### Validación de carrito

La validación de carrito debe verificar:

- producto publicado;
- variante activa;
- precio online efectivo server-side;
- stock disponible online;
- cantidades válidas;
- almacén online activo;
- reglas de venta online.

### Pedido pendiente de pago

Un pedido pendiente de pago debe tener reservas temporales.

No debe facturarse todavía.

No debe convertirse en venta final todavía.

### Pedido pagado

Un pedido pagado debe tener stock confirmado o estado de incidencia si ocurrió un problema.

## Relación con Mercado Pago

Mercado Pago no debe recibir montos ni disponibilidad decididos por frontend.

### Antes de crear preferencia

Backend debe:

1. Recalcular precios.
2. Recalcular stock disponible online.
3. Reservar stock.
4. Crear pedido pendiente.
5. Crear preferencia con monto calculado server-side.

### Durante la ventana de pago

La reserva debe mantenerse durante el TTL.

El cliente no debe poder modificar cantidades o precios desde frontend.

### Webhook

El webhook debe:

- validar origen/firma según mecanismo disponible;
- consultar estado real del pago si corresponde;
- ser idempotente;
- confirmar o liberar reserva;
- actualizar pedido;
- registrar auditoría.

### Idempotencia

Debe existir una clave de idempotencia o mecanismo equivalente para:

- creación de pedido;
- creación de preferencia;
- procesamiento de webhook;
- confirmación de reserva;
- liberación de reserva.

### Pago aprobado sin reserva válida

Si el pago se aprueba pero la reserva ya expiró o no existe:

1. No facturar automáticamente.
2. No convertir automáticamente a venta.
3. Intentar validar stock nuevamente.
4. Si hay stock, se puede re-confirmar bajo reglas controladas.
5. Si no hay stock, crear incidencia operativa.
6. Evaluar devolución o contacto con cliente.

## Relación con Storefront API/BFF

La Storefront API debe exponer disponibilidad pública, no stock interno completo.

### Estados públicos recomendados

```text
AVAILABLE
LOW_STOCK
OUT_OF_STOCK
```

| Estado técnico | Texto público |
|---|---|
| `AVAILABLE` | Disponible |
| `LOW_STOCK` | Últimas unidades |
| `OUT_OF_STOCK` | Agotado |

No se recomienda mostrar stock exacto públicamente en primera versión.

### Producto publicado sin stock

Si un producto publicado no tiene stock disponible:

- puede mostrarse como agotado;
- no debe poder comprarse;
- puede seguir indexado si tiene valor SEO;
- puede mostrar productos relacionados.

### Validar carrito desde backend

Endpoint conceptual futuro:

```text
POST /api/v1/storefront/cart/validate
```

Debe devolver:

- productos válidos;
- productos sin stock;
- cantidades ajustadas si aplica;
- precio online efectivo;
- disponibilidad pública;
- mensajes de error;
- total calculado server-side.

No debe confiar en:

- precios enviados por frontend;
- stock enviado por frontend;
- totales enviados por frontend.

## Relación con SEO

Un producto agotado no debe desaparecer automáticamente si tiene valor SEO.

Reglas:

1. Producto agotado puede seguir indexado si está publicado y tiene contenido útil.
2. Producto agotado no debe permitir compra.
3. Debe mostrar estado claro: `Agotado`.
4. Debe ofrecer alternativas o relacionados cuando sea posible.
5. Schema.org debe reflejar disponibilidad correcta.

Ejemplo de disponibilidad estructurada futura:

```text
OutOfStock
InStock
LimitedAvailability
```

No se debe ocultar automáticamente una página solo por stock temporal en cero, salvo que el producto esté descontinuado o no publicado.

## Transaccionalidad, concurrencia e idempotencia

Las operaciones de stock y reserva son críticas y deben ejecutarse de forma segura.

### Operaciones transaccionales

Deben ejecutarse transaccionalmente:

- creación de reserva;
- confirmación de reserva;
- liberación de reserva;
- expiración de reserva;
- conversión de pedido a venta;
- validación final antes de pago;
- validación final antes de facturación.

### Control de concurrencia

El sistema debe evitar que dos operaciones reserven o vendan la misma última unidad.

La implementación futura deberá evaluar mecanismos como:

- transacciones de base de datos;
- bloqueo optimista;
- bloqueo pesimista en operaciones críticas;
- restricciones de unicidad;
- validaciones atómicas;
- reintentos controlados.

### Idempotencia

Deben ser idempotentes:

- creación de pedido online;
- creación de preferencia Mercado Pago;
- procesamiento de webhook;
- confirmación de reserva;
- liberación de reserva;
- manejo de expiración.

No debe permitirse:

- doble reserva para el mismo pedido/item;
- doble confirmación;
- doble liberación;
- doble consumo de stock;
- doble conversión a venta;
- doble facturación.

## Reglas de negocio

Reglas obligatorias:

1. No comprar sin stock disponible online.
2. No reservar más de lo disponible.
3. No permitir stock reservado negativo.
4. No permitir disponibilidad online negativa.
5. No permitir cambiar almacén online si existen pedidos/reservas activas sin política definida.
6. No confiar en stock enviado por frontend.
7. No exponer stock operativo interno.
8. No facturar automáticamente pedidos con incidencia de stock.
9. No confirmar dos veces una misma reserva.
10. No liberar dos veces una misma reserva.
11. No permitir compra de variante inactiva o no publicada.
12. No permitir compra si no hay almacén online activo.
13. No crear preferencia de pago sin reserva válida.
14. No convertir pedido a venta si la reserva no está confirmada.
15. No ejecutar operaciones críticas de stock fuera de transacciones.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Usar stock físico directo sin reservas | Descartada. Riesgo alto de sobreventa cuando POS y ecommerce comparten stock. |
| Crear almacén exclusivo ecommerce desde el inicio | No se adopta como primera versión. Reduce riesgo, pero exige separación operativa mayor. Puede ser evolución futura. |
| Compartir almacén con POS con stock reservado | Aceptada para inicio. Permite avanzar con bajo riesgo si se implementan reservas, stock de seguridad y validación server-side. |
| Duplicar stock en la tienda online | Descartada. Rompe ERP/POS como fuente de verdad y genera desincronización. |
| Reservar stock solo después del pago | Descartada como regla principal. Puede causar pagos aprobados sin stock disponible. |

## Justificación

### Operación real

InkToy operará ventas físicas y online. El stock debe reflejar una única realidad operativa controlada desde ERP/POS.

### Prevención de sobreventa

Las reservas y el stock de seguridad reducen el riesgo de vender más unidades de las disponibles.

### Bajo riesgo

Permitir almacén compartido con POS evita crear una operación ecommerce separada prematuramente, pero exige reglas estrictas.

### Mantenibilidad

Centralizar cálculo de stock disponible online evita duplicidad de lógica en tienda, frontend o integraciones.

### Consistencia ERP/POS

ERP/POS conserva la fuente de verdad. Ecommerce no inventa stock ni mantiene inventario paralelo.

### Seguridad

El frontend no puede manipular stock, cantidades finales ni disponibilidad.

### Futuro checkout con Mercado Pago

Reservar antes de crear preferencia reduce el riesgo de pagos aprobados sin stock.

## Consecuencias positivas

- Reduce riesgo de sobreventa.
- Mantiene ERP/POS como fuente de verdad.
- Permite iniciar con almacén compartido con POS.
- Prepara checkout seguro con Mercado Pago.
- Permite stock de seguridad.
- Evita exponer stock exacto públicamente.
- Mejora consistencia entre POS, ecommerce e inventario.
- Prepara pedidos online reales.
- Permite auditoría de reservas.
- Facilita evolución futura a almacén ecommerce exclusivo.

## Consecuencias negativas o costos

- Se agrega complejidad al inventario.
- Se requiere implementar reservas.
- Se requiere limpiar reservas vencidas.
- Se requiere manejar TTL e idempotencia.
- Se requiere adaptar POS para respetar reservas online si comparte almacén.
- Se requiere manejar incidencias de pago aprobado sin stock.
- Se requiere UI futura de configuración de almacén online.
- Se requiere auditoría de cambios y reservas.
- Se requiere QA exhaustivo con casos de concurrencia.

Estos costos son aceptables porque vender online sin control de stock es un riesgo operativo alto.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sobreventa | Reservas, stock de seguridad, validación server-side, transacciones y control de concurrencia. |
| Reservas vencidas no liberadas | Job de expiración y validación lazy en operaciones críticas. |
| Pago aprobado sin stock | Reserva antes de preferencia; si falla, estado de incidencia y no facturar automáticamente. |
| POS y ecommerce compitiendo por el mismo stock | POS debe considerar reservas online o validar disponibilidad real antes de vender. |
| Cambio de almacén online con pedidos pendientes | Bloquear cambio si existen reservas/pedidos activos. |
| Exposición de stock exacto | Storefront API expone estados públicos, no cantidades internas. |
| Webhooks duplicados o tardíos | Idempotencia y control de estado. |
| Stock de seguridad mal configurado | Configuración por rol autorizado, auditoría y valores mínimos razonables. |
| Stock negativo por error operativo | Tratar como agotado y generar alerta/inconsistencia. |
| Reserva doble del mismo pedido | Restricciones e idempotencia por pedido/item. |
| Condiciones de carrera | Transacciones, bloqueo optimista/pesimista y validaciones atómicas según diseño final. |

## Reglas obligatorias

1. ERP/POS es fuente de verdad del stock.
2. Stock disponible online se calcula server-side.
3. El frontend nunca decide stock ni disponibilidad final.
4. Debe existir almacén online configurable.
5. Debe existir stock reservado para pedidos online.
6. Debe existir stock de seguridad configurable.
7. Storefront API expone disponibilidad pública, no stock interno completo.
8. No se permite compra de productos agotados.
9. No se permite compra sin almacén online activo.
10. No se reserva más stock que el disponible online.
11. No se crea preferencia de pago sin validación server-side de stock.
12. No se confirma pedido pagado sin reserva válida o sin resolver incidencia.
13. No se cambia almacén online con reservas/pedidos activos sin política definida.
14. POS y ecommerce deben operar contra la misma fuente de verdad.
15. Toda reserva debe tener estado, auditoría y mecanismo de liberación.
16. Las operaciones críticas de stock deben ser transaccionales.
17. Las operaciones críticas de stock y pago deben ser idempotentes.
18. No se debe permitir doble reserva, doble liberación, doble confirmación ni doble consumo de stock.

## Impacto técnico

### Inventario backend

Se requerirá soporte para:

- stock por almacén;
- stock por producto simple o variante;
- reservas online;
- stock de seguridad;
- cálculo de disponibilidad online;
- operaciones transaccionales;
- control de concurrencia.

### Catálogo online

El producto publicado deberá exponer disponibilidad pública calculada.

### Variantes

El stock debe calcularse por variante vendible cuando existan variantes.

### POS

El POS deberá considerar reservas online si vende desde el almacén online compartido.

### Pedidos online futuros

El pedido online dependerá de reserva temporal antes de pago.

### Mercado Pago futuro

La preferencia de pago dependerá de reserva previa e idempotencia.

### Storefront API

Deberá exponer disponibilidad pública y validar carrito server-side.

### Next.js

Mostrará disponibilidad pública y bloqueará compra de productos agotados, pero sin decidir stock final.

### Reportes

Se necesitarán reportes futuros de:

- stock reservado;
- reservas vencidas;
- pedidos con incidencia;
- disponibilidad online;
- ventas online por almacén.

### Auditoría

Se debe auditar:

- cambio de almacén online;
- creación de reserva;
- confirmación;
- expiración;
- liberación;
- incidencias.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que ERP/POS será fuente de verdad del stock.
2. Se aprueba que debe existir almacén online configurable.
3. Se aprueba que el almacén online inicial podrá compartirse con POS.
4. Se aprueba que el stock disponible online se calculará server-side.
5. Se aprueba la fórmula base: stock físico menos stock reservado menos stock de seguridad.
6. Se aprueba que el stock se calcula por variante vendible cuando existan variantes.
7. Se aprueba que debe existir stock reservado para pedidos online.
8. Se aprueba que debe existir TTL de reserva.
9. Se aprueba que debe existir liberación automática de reservas vencidas.
10. Se aprueba que no se permitirá compra sin stock disponible online.
11. Se aprueba que no se expondrá stock exacto públicamente por defecto.
12. Se aprueba que Storefront API expondrá disponibilidad pública.
13. Se aprueba que no se debe crear preferencia Mercado Pago sin validar stock server-side.
14. Se aprueba que cambiar almacén online requiere validaciones y rol autorizado.
15. Se aprueba que el frontend nunca decide stock ni disponibilidad final.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar reservas todavía;
- implementar Mercado Pago;
- implementar checkout;
- crear endpoints;
- crear migraciones;
- crear UI de configuración;
- modificar inventario actual;
- modificar POS;
- modificar ventas;
- modificar facturación;
- cambiar AWS/staging;
- activar compra online;
- crear Storefront API real de stock;
- crear job de expiración;
- crear pedidos online;
- cambiar reglas productivas de almacén.

## Decisión resultante

InkToy gestionará el stock online desde el ERP/POS, manteniendo una única fuente de verdad. La tienda online usará un almacén online configurable, inicialmente compartido con POS, pero controlado mediante reglas de disponibilidad, reserva y stock de seguridad.

El stock disponible online se calculará server-side con la fórmula:

```text
stockDisponibleOnline = stockFisicoAlmacenOnline - stockReservadoOnline - stockSeguridad
```

No se permitirá comprar productos agotados. El frontend no decidirá stock ni disponibilidad final. Storefront API expondrá disponibilidad pública como disponible, bajo stock o agotado, sin revelar stock operativo interno completo.

Antes de iniciar Mercado Pago, el backend deberá validar carrito, recalcular stock y precio, crear pedido pendiente y reservar stock temporalmente. Los webhooks deberán procesarse con idempotencia, confirmando o liberando reservas según el resultado del pago.

Las operaciones críticas de stock, reserva, pago y confirmación deberán ser transaccionales, idempotentes y protegidas contra condiciones de carrera para reducir el riesgo de sobreventa, doble reserva, doble liberación o doble consumo de stock.

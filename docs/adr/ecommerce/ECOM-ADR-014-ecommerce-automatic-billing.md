# ADR-014 — Facturación automática ecommerce para la futura tienda online SEO-first de InkToy

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
- ADR-013: Mercado Pago, webhook e idempotencia.

Los ADRs previos establecieron que:

- ERP/POS será fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
- El pedido online será una entidad formal dentro del ERP/POS.
- El pedido online no será venta hasta cumplir condiciones específicas.
- El pedido guardará snapshot de productos, precios, cliente, dirección, envío y totales.
- El precio online efectivo se calculará server-side.
- El frontend nunca decidirá precios, stock, descuentos, totales, estado del pedido, estado del pago ni datos finales de facturación.
- Existirán reservas explícitas de stock para pedidos online.
- No se convertirá pedido a venta sin pago aprobado, monto validado y reserva confirmada.
- Mercado Pago se integrará server-side.
- El webhook de Mercado Pago no bastará por sí solo para convertir a venta ni facturar.
- No se facturará pedido con incidencia de stock, pago, precio, reserva o datos tributarios.
- Las operaciones críticas deberán ser transaccionales, idempotentes, auditables y protegidas contra concurrencia.
- El sistema ya cuenta con módulo de facturación/comprobantes electrónicos en el ERP/POS.
- La tienda deberá permitir boleta y factura.
- La factura requiere datos tributarios empresariales válidos.
- No habrá recojo en tienda ni pago contraentrega en la primera versión.

La facturación automática ecommerce debe integrarse correctamente con pedido online, venta, Mercado Pago, stock reservado, series, correlativos, comprobantes electrónicos y futuras reglas de anulación, nota de crédito o gestión tributaria.

## Problema

Se debe definir cómo funcionará la facturación automática ecommerce de InkToy sin romper la trazabilidad tributaria ni generar comprobantes incorrectos o duplicados.

La decisión debe resolver:

- cuándo convertir un pedido online a venta;
- cuándo emitir boleta o factura;
- qué datos tributarios son obligatorios;
- cómo validar series activas y correlativos;
- cómo manejar fallos de emisión;
- cómo reintentar de forma segura;
- cómo evitar comprobantes duplicados;
- cómo relacionar pedido, pago, reserva, venta y comprobante;
- cómo manejar pagos aprobados con errores de facturación;
- cómo preparar futuras anulaciones, notas de crédito o flujos tributarios.

Riesgos de facturar antes de tener pago validado:

- comprobante emitido sin cobro real;
- venta tributaria sin pago confirmado;
- necesidad de anulación o nota de crédito;
- inconsistencia contable y operativa.

Riesgos de facturar sin reserva confirmada:

- comprobante emitido sin stock disponible;
- pedido pagado que no puede despacharse;
- devolución o reclamo del cliente;
- necesidad de flujo tributario correctivo.

Riesgos de facturar con datos tributarios incompletos:

- factura inválida;
- rechazo del comprobante;
- errores ante proveedor/SUNAT;
- necesidad de corrección manual.

Riesgos de comprobantes duplicados:

- doble emisión por webhook duplicado;
- doble emisión por reintento manual;
- doble emisión por error técnico;
- correlativos inconsistentes;
- problemas tributarios.

Riesgos de pago aprobado pero facturación fallida:

- cliente pagó, pero no recibe comprobante;
- pedido queda operativo pero con incidencia tributaria;
- atención al cliente debe intervenir;
- sistema debe permitir reintento controlado.

Riesgos de venta creada sin comprobante o comprobante creado sin venta válida:

- pérdida de trazabilidad;
- reportes inconsistentes;
- problemas de auditoría;
- dificultad para anulación o nota de crédito futura.

## Decisión

Se decide que la facturación automática ecommerce se ejecutará únicamente después de que el pedido online cumpla las condiciones mínimas de consistencia: pago aprobado validado, monto coincidente, reserva confirmada y venta válida generada desde el pedido.

Decisiones principales:

1. La facturación automática se ejecutará solo después de pedido pagado, monto validado, reserva confirmada y venta válida.
2. La venta será el origen formal del comprobante electrónico.
3. El pedido online no se facturará directamente sin convertirse a venta.
4. El comprobante usará snapshot confirmado de precios, cliente, items, impuestos y total.
5. Boleta y factura tendrán validaciones distintas.
6. No se emitirá comprobante si falta serie activa.
7. No se emitirá comprobante si los datos tributarios son inválidos.
8. No se emitirá comprobante si existe incidencia de pago, stock, precio, reserva o datos tributarios.
9. La emisión será idempotente.
10. Los fallos de emisión generarán incidencia y permitirán reintento controlado.
11. No se emitirán comprobantes duplicados por reintentos, webhooks duplicados o doble procesamiento.
12. El comprobante electrónico quedará asociado a la venta y, por trazabilidad, al pedido online.
13. Las futuras anulaciones, cancelaciones tributarias o notas de crédito se manejarán mediante flujos específicos, no mediante anulación interna simple.

Decisión central:

> InkToy no facturará directamente pedidos online. Primero validará pago, stock y datos; luego convertirá el pedido en venta; finalmente emitirá el comprobante electrónico desde la venta válida, usando idempotencia y reglas tributarias controladas.

## Modelo conceptual recomendado

### OnlineOrder

Entidad formal del pedido ecommerce.

Debe conservar:

- número público de pedido;
- cliente;
- dirección de envío;
- datos tributarios solicitados;
- items;
- precios;
- total;
- pago;
- reserva;
- venta asociada;
- comprobante asociado;
- incidencias;
- auditoría.

### Sale

Venta ERP/POS generada a partir de un pedido online válido.

Debe conservar:

- canal de venta online;
- referencia al pedido online;
- referencia al pago;
- referencia a la reserva;
- items y precios confirmados;
- total;
- cliente;
- datos necesarios para facturación.

La venta será el origen formal del comprobante.

### ElectronicDocument

Comprobante electrónico generado desde la venta.

Puede representar:

- boleta;
- factura;
- estados de generación, firma, envío, aceptación, error o cancelación;
- numeración tributaria;
- relación con serie/correlativo.

### BillingRequest

Solicitud de facturación generada cuando una venta online cumple condiciones.

Debe contener:

- venta;
- pedido;
- tipo de comprobante;
- datos de cliente;
- items;
- totales;
- ambiente;
- serie aplicable;
- idempotency key.

### BillingAttempt

Intento concreto de emisión.

Debe registrar:

- fecha/hora;
- estado;
- error si aplica;
- proveedor;
- serie/correlativo si se asignó;
- resultado;
- usuario o proceso que lo inició;
- trazabilidad de reintentos.

### BillingStatus

Estado interno de facturación ecommerce.

Debe ser independiente del estado específico del comprobante cuando sea necesario, porque puede haber incidencias antes de crear el documento.

### BillingIncident

Incidencia de facturación.

Ejemplos:

```text
BILLING_TAX_DATA_INVALID
BILLING_SERIES_NOT_AVAILABLE
BILLING_PROVIDER_ERROR
BILLING_DUPLICATE_ATTEMPT
BILLING_AMOUNT_MISMATCH
BILLING_ORDER_NOT_ELIGIBLE
```

### BillingRetry

Reintento controlado de facturación.

Debe evitar:

- duplicar comprobantes;
- saltar validaciones;
- reintentar indefinidamente;
- ocultar errores operativos.

### TaxDocumentType

Tipo de comprobante:

```text
BOLETA
FACTURA
```

Otros tipos futuros pueden agregarse sin romper el flujo base.

### BillingCustomerSnapshot

Snapshot de datos del cliente usados para facturación.

Para boleta:

- nombre o razón social según aplique;
- tipo y número de documento si corresponde;
- email;
- datos mínimos definidos por política tributaria interna.

Para factura:

- RUC;
- razón social;
- dirección fiscal;
- email;
- datos fiscales requeridos.

### BillingItemSnapshot

Snapshot de líneas a facturar.

Debe contener:

- producto/variante;
- SKU;
- descripción;
- cantidad;
- precio unitario confirmado;
- descuentos futuros si aplican;
- impuestos;
- subtotal;
- total de línea.

### Serie/correlativo

Serie activa y correlativo usados para emitir el comprobante.

Debe integrarse con las reglas existentes del módulo de Billing Series.

### PaymentReference

Referencia al pago aprobado:

- proveedor;
- payment id;
- monto;
- moneda;
- fecha de aprobación;
- estado validado.

### StockReservationReference

Referencia a la reserva confirmada:

- reservation id;
- estado;
- almacén;
- items reservados;
- fecha de confirmación.

## Estados recomendados de facturación ecommerce

### NOT_REQUIRED

Estado opcional para pedidos que no requieren emisión automática bajo una política específica.

En la primera versión ecommerce real, normalmente no debería usarse para ventas pagadas, salvo decisión explícita.

### PENDING_BILLING

Venta válida pendiente de facturación.

Uso:

- pedido pagado;
- reserva confirmada;
- venta creada;
- datos mínimos aparentemente válidos;
- facturación aún no iniciada.

### BILLING_IN_PROGRESS

Emisión en proceso.

Uso:

- se está generando, firmando o enviando comprobante;
- evita que otro proceso dispare emisión simultánea.

### BILLED

Comprobante emitido correctamente dentro del flujo operativo.

Puede corresponder a un documento aceptado o a un estado equivalente definido por la política del proveedor.

### BILLING_FAILED

La emisión falló.

Uso:

- error técnico;
- error del proveedor;
- error de generación;
- error no clasificable.

Requiere revisión o reintento controlado.

### BILLING_RETRY_PENDING

Existe una falla recuperable y se programó o habilitó reintento.

Uso:

- proveedor temporalmente no disponible;
- error técnico transitorio;
- pendiente de reintento controlado.

### BILLING_BLOCKED

La facturación está bloqueada por una condición de negocio.

Ejemplos:

- pedido con incidencia;
- venta inválida;
- pago inconsistente;
- reserva no confirmada;
- datos tributarios incompletos.

### BILLING_SERIES_NOT_AVAILABLE

No hay serie activa para el tipo de comprobante y ambiente requeridos.

No se debe emitir hasta corregir configuración.

### BILLING_TAX_DATA_INVALID

Los datos tributarios no cumplen validaciones mínimas.

Ejemplo:

- factura solicitada sin RUC válido;
- razón social vacía;
- dirección fiscal faltante.

### BILLING_PROVIDER_ERROR

El proveedor o servicio de facturación devuelve error.

Puede requerir reintento o revisión manual.

### BILLING_DUPLICATE_IGNORED

Intento duplicado ignorado por idempotencia.

Uso:

- webhook repetido;
- reintento manual duplicado;
- job repetido;
- proceso concurrente.

## Flujo recomendado

### 1. Validar pedido pagado

El pedido debe cumplir:

- pago aprobado;
- monto coincidente;
- moneda coincidente;
- sin incidencia de pago;
- sin mismatch de precio.

### 2. Confirmar reserva

La reserva debe estar:

- confirmada;
- asociada al pedido;
- sin incidencia;
- con cantidades coherentes.

### 3. Convertir pedido a venta

La conversión pedido → venta debe ser idempotente.

Condiciones:

- pedido pagado;
- reserva confirmada;
- snapshot de precios válido;
- cliente/datos mínimos disponibles;
- no existe venta previa para el pedido.

La venta creada debe referenciar el pedido online.

### 4. Validar datos de boleta/factura

Antes de emitir:

- validar tipo de comprobante;
- validar datos del cliente;
- validar datos fiscales si es factura;
- validar email o canal de entrega del comprobante si aplica.

### 5. Validar serie activa

Validar:

- tipo de comprobante;
- ambiente;
- serie activa;
- correlativo consistente;
- reglas existentes de Billing Series.

Si no hay serie activa, crear incidencia.

### 6. Crear solicitud de facturación

Crear `BillingRequest` con idempotency key.

Debe estar asociada a:

- pedido;
- venta;
- tipo de comprobante;
- serie;
- snapshot de cliente;
- snapshot de items;
- total.

### 7. Emitir comprobante electrónico

La emisión puede incluir:

- creación de documento;
- generación de XML;
- firma;
- envío al proveedor/SUNAT;
- recepción de estado.

El detalle exacto dependerá del módulo de facturación existente y del proveedor configurado.

### 8. Asociar comprobante a venta y pedido

Cuando el documento se crea:

- asociar comprobante a venta;
- asociar referencia al pedido;
- registrar estado;
- registrar número completo;
- registrar ambiente.

### 9. Manejar éxito

Si la emisión es exitosa:

- venta queda facturada;
- pedido registra referencia de comprobante;
- estado de facturación pasa a `BILLED`;
- cliente puede consultar comprobante o recibirlo según flujo futuro.

### 10. Manejar error

Si falla:

- registrar intento;
- registrar error;
- cambiar a estado de incidencia;
- no duplicar comprobante;
- permitir reintento controlado si corresponde.

### 11. Reintentar de forma controlada

El reintento debe:

- validar idempotencia;
- verificar si ya existe comprobante;
- validar estado de venta;
- validar serie;
- validar datos tributarios;
- registrar nuevo intento.

### 12. Registrar auditoría

Todo intento debe auditar:

- quién o qué proceso inició;
- timestamp;
- entrada validada;
- resultado;
- error;
- documento creado si aplica;
- relación con pedido/venta.

## Boleta vs factura

### Boleta

Debe emitirse cuando:

- cliente no solicita factura;
- datos mínimos para boleta son válidos;
- venta cumple condiciones de facturación.

Datos mínimos recomendados:

- nombre del comprador o destinatario según política;
- documento si aplica;
- email;
- items;
- precios;
- total;
- dirección si se requiere para trazabilidad del pedido.

### Factura

Debe emitirse cuando el cliente solicita comprobante para empresa.

Datos mínimos recomendados:

- RUC;
- razón social;
- dirección fiscal;
- email;
- datos de contacto;
- items;
- precios;
- total.

### Validaciones para factura

Antes de emitir factura:

- RUC con formato válido;
- razón social no vacía;
- dirección fiscal no vacía;
- tipo de documento compatible con factura;
- datos consistentes en snapshot;
- serie activa para factura.

La validación externa o consulta a servicios tributarios puede definirse en fase posterior. Este ADR exige al menos validaciones internas mínimas antes de emitir.

### Si el cliente pide factura con datos inválidos

El sistema debe:

- bloquear facturación automática;
- marcar `BILLING_TAX_DATA_INVALID`;
- permitir corrección de datos antes de emitir;
- no emitir boleta en lugar de factura sin política explícita;
- registrar auditoría.

### Corrección antes de emitir

Debe permitirse corregir datos tributarios antes de la emisión, bajo control de rol autorizado o flujo seguro para cliente.

Una vez emitido el comprobante, la corrección debe tratarse mediante flujos tributarios formales futuros.

### Snapshot de datos

Los datos usados en el comprobante deben quedar como snapshot.

Cambios posteriores en datos del cliente no deben alterar comprobantes ya emitidos.

## Relación con pedido online

Reglas:

1. Pedido pagado no implica facturación inmediata si hay incidencias.
2. Pedido debe tener datos suficientes para facturar.
3. Pedido debe referenciar venta y comprobante.
4. Pedido con incidencia de pago no debe facturarse.
5. Pedido con incidencia de stock no debe facturarse.
6. Pedido con incidencia de precio no debe facturarse.
7. Pedido con datos tributarios inválidos no debe facturarse.
8. Pedido debe conservar trazabilidad de intentos de facturación.
9. Pedido debe mostrar estado público seguro al cliente.
10. Pedido debe mostrar estado interno detallado al equipo autorizado.

Estados de pedido relacionados:

```text
PAID
READY_TO_PREPARE
CONVERTED_TO_SALE
BILLING_PENDING
BILLED
BILLING_EXCEPTION
```

La nomenclatura exacta puede ajustarse en implementación, manteniendo las reglas aprobadas.

## Relación con venta ERP/POS

### Cuándo se crea la venta

La venta se crea después de:

- pago aprobado;
- monto validado;
- reserva confirmada;
- pedido sin incidencias críticas.

No se crea venta por simple creación de pedido.

No se crea venta solo por recibir webhook sin validación.

### Datos que pasan del pedido a la venta

La venta debe recibir:

- canal online;
- referencia al pedido;
- referencia de pago;
- cliente;
- items;
- cantidades;
- precios confirmados;
- descuentos futuros si aplican;
- total;
- almacén;
- datos necesarios para facturación.

### Diferencia entre venta POS y venta online

Venta POS:

- nace en operación presencial;
- puede estar ligada a caja física;
- pago se registra en POS;
- no depende de Mercado Pago ecommerce.

Venta online:

- nace desde pedido online;
- depende de pago online validado;
- requiere reserva de stock;
- requiere datos de delivery;
- requiere trazabilidad ecommerce.

### Evitar doble conversión a venta

Debe existir restricción lógica:

```text
un pedido online no puede generar más de una venta válida
```

La conversión debe ser idempotente.

### Relación pedido → venta → comprobante

Relación recomendada:

```text
OnlineOrder → Sale → ElectronicDocument
```

El pedido puede guardar referencia al comprobante para consulta rápida, pero la venta será el origen formal del comprobante.

### Por qué la venta es el origen formal del comprobante

Porque el módulo de facturación actual trabaja sobre ventas y porque tributariamente el comprobante debe representar una operación comercial válida, no un intento de pedido ni un carrito.

## Relación con Mercado Pago

Reglas:

1. No facturar sin pago aprobado validado.
2. No facturar con monto diferente al snapshot del pedido.
3. No facturar con moneda inconsistente.
4. No facturar solo porque llegó webhook.
5. No facturar pagos con incidencia.
6. No facturar pagos duplicados.
7. No facturar pagos aprobados tardíos si la reserva no es válida.

### Si Mercado Pago aprueba pero facturación falla

El sistema debe:

- mantener pedido pagado;
- mantener venta creada si ya fue creada correctamente;
- marcar incidencia de facturación;
- no duplicar comprobante;
- permitir reintento controlado;
- alertar al rol responsable.

Estado sugerido:

```text
BILLING_FAILED
```

o más específico según causa.

### Si webhook llega duplicado

El webhook duplicado no debe:

- crear segunda venta;
- crear segundo comprobante;
- reemitir comprobante;
- mover correlativo indebidamente.

Debe registrarse como evento duplicado ignorado.

### Si pago aprobado llega tarde y genera incidencia

No se factura automáticamente.

Debe requerir revisión si:

- reserva expiró;
- stock no es confirmable;
- pedido está cancelado;
- monto no coincide.

## Relación con stock reservado

Reglas:

1. No facturar sin reserva confirmada.
2. No facturar pedido con incidencia de stock.
3. No facturar si la reserva expiró.
4. No facturar si hay pago aprobado pero stock no confirmable.
5. No facturar si la reserva no pertenece al pedido.
6. No facturar si cantidades reservadas no coinciden con items del pedido.

Si hay pago aprobado pero stock no confirmable:

- marcar incidencia;
- no crear venta automática si aún no existe;
- no emitir comprobante;
- permitir resolución operativa.

## Relación con series y correlativos

La facturación ecommerce debe respetar las reglas del módulo actual de Billing Series.

Reglas:

1. Validar serie activa por tipo de comprobante y ambiente.
2. Validar correlativo antes de emitir.
3. No emitir si no hay serie activa.
4. No emitir si el correlativo está inconsistente.
5. No emitir si la serie está inactiva.
6. No asignar correlativo dos veces.
7. No saltar correlativo por reintentos fallidos si la política actual no lo permite.
8. No crear duplicidad de numeración.
9. Registrar intento y resultado.

### Si no hay serie activa

Marcar:

```text
BILLING_SERIES_NOT_AVAILABLE
```

No emitir hasta corregir configuración.

### Si el correlativo está inconsistente

Bloquear emisión automática.

Marcar incidencia operativa.

### Integración con reglas existentes

Debe mantenerse coherencia con reglas actuales:

- única serie activa por tipo/ambiente;
- `currentNumber` como siguiente número a emitir;
- defensa ante correlativo inconsistente;
- bloqueo de configuración inválida;
- separación por ambiente LOCAL/BETA/PROD.

### Errores que deben bloquear facturación automática

- sin serie activa;
- serie inactiva;
- correlativo menor o igual al último emitido;
- ambiente inválido;
- tipo de comprobante sin serie;
- configuración de proveedor no válida para ambiente requerido.

## Relación con comprobantes electrónicos

El comprobante debe crearse desde venta.

Estados relevantes del comprobante actual/futuro:

```text
DRAFT
GENERATED
SIGNED
SENT
ACCEPTED
REJECTED
ERROR
CANCELLED
```

### Éxito operativo

Pueden considerarse éxito operativo según política:

- `ACCEPTED` para emisión formal aceptada.
- `SENT` o `SIGNED` podrían ser estados intermedios, no necesariamente cierre final.
- En ambiente LOCAL/BETA, el éxito puede representar simulación o sandbox, según configuración.

La definición exacta depende del proveedor y ambiente.

### Estados que requieren seguimiento o reintento

- `ERROR`;
- `REJECTED`;
- `GENERATED` sin firma/envío;
- `SIGNED` sin envío;
- `SENT` sin respuesta final;
- fallos técnicos del proveedor.

### Estados que bloquean anulación interna

Si una venta online ya tiene comprobante activo, aplican reglas similares a ventas internas:

- `DRAFT`;
- `GENERATED`;
- `SIGNED`;
- `SENT`;
- `ACCEPTED`.

Estos estados no deberían permitir anulación comercial simple sin flujo tributario.

### Relación futura con nota de crédito

Si la venta online requiere devolución, cancelación o corrección después de comprobante válido, deberá usarse flujo tributario formal futuro:

- nota de crédito;
- anulación tributaria si aplica;
- cancelación técnica de documento no enviado si corresponde.

No se debe resolver con anulación interna simple.

## Idempotencia

La idempotencia es obligatoria.

### Pedido → venta

Regla:

```text
un pedido online no puede generar más de una venta válida
```

La conversión debe ser segura ante reintentos.

### Creación de comprobante

Regla:

```text
una venta no debe generar más de un comprobante válido dentro del flujo ecommerce
```

Debe validarse existencia previa antes de emitir.

### Emisión/firma/envío

Cada etapa debe poder reintentarse sin duplicar documento ni correlativo.

### Webhook duplicado

Un webhook duplicado de Mercado Pago no debe:

- convertir nuevamente a venta;
- emitir nuevamente comprobante;
- confirmar nuevamente facturación.

### Reintento manual

Un reintento manual debe:

- validar si ya existe comprobante;
- validar estado actual;
- usar idempotency key;
- registrar intento;
- no duplicar numeración.

### Restricciones conceptuales

- una venta por pedido;
- un comprobante por venta en flujo ecommerce;
- un billing request activo por venta;
- eventos duplicados ignorados de forma segura.

## Incidencias y reintentos

### Datos tributarios inválidos

Estado:

```text
BILLING_TAX_DATA_INVALID
```

Requiere corrección antes de emitir.

### Serie no disponible

Estado:

```text
BILLING_SERIES_NOT_AVAILABLE
```

Requiere configurar serie activa.

### Error de proveedor/SUNAT

Estado:

```text
BILLING_PROVIDER_ERROR
```

Puede requerir reintento automático o manual según tipo de error.

### Error técnico

Estado:

```text
BILLING_FAILED
```

Requiere análisis y reintento controlado.

### Pago aprobado pero comprobante no emitido

Debe quedar como incidencia operativa visible.

No debe perderse entre logs.

### Venta creada pero comprobante pendiente

Debe mostrarse en consola interna futura como:

```text
PENDING_BILLING
```

o equivalente.

### Cuándo reintentar automáticamente

Solo para errores transitorios claramente identificados:

- timeout del proveedor;
- error temporal de red;
- indisponibilidad temporal;
- estado pendiente de respuesta.

### Cuándo requerir revisión manual

- datos tributarios inválidos;
- serie inexistente;
- correlativo inconsistente;
- rechazo tributario;
- monto inconsistente;
- pedido con incidencia;
- intento duplicado sospechoso.

### Rol responsable

Roles futuros posibles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Soporte de pagos;
- Responsable de facturación.

La definición formal de roles puede ampliarse en ADR de administración ecommerce.

## Relación con Storefront API/BFF

La Storefront API debe exponer únicamente estados públicos seguros.

### Estado público para cliente

Ejemplos:

```text
Pago confirmado
Pedido en preparación
Comprobante en proceso
Comprobante emitido
Estamos revisando tu comprobante
```

No debe exponer errores técnicos internos.

### Datos del comprobante visibles para cliente

Puede exponerse:

- tipo de comprobante;
- número completo si ya existe;
- estado público;
- fecha de emisión;
- enlace seguro de descarga si se implementa;
- datos mínimos de la empresa.

No debe exponerse:

- payload XML interno;
- errores técnicos;
- logs;
- tokens;
- IDs internos sensibles;
- datos de otros clientes.

### Consulta segura

La consulta debe requerir:

- número público de pedido;
- token seguro;
- sesión de cliente futura;
- o mecanismo equivalente.

No debe permitir IDOR.

## Relación con Angular interno

Debe existir una pantalla futura para revisar pedidos con incidencia de facturación.

Acciones recomendadas para roles autorizados:

- ver pedido;
- ver venta asociada;
- ver pago asociado;
- ver reserva asociada;
- ver datos tributarios;
- ver comprobante;
- reintentar facturación;
- registrar resolución;
- marcar incidencia revisada;
- enviar o reenviar comprobante si aplica.

Debe mostrar:

- motivo de bloqueo;
- estado de serie;
- estado del comprobante;
- intentos previos;
- fecha/hora;
- responsable;
- acción recomendada.

No debe permitir:

- emitir duplicado;
- cambiar totales;
- alterar snapshots confirmados sin flujo formal;
- corregir comprobantes ya emitidos sin flujo tributario.

## Reglas obligatorias

1. No facturar sin venta válida.
2. No facturar sin pago aprobado validado.
3. No facturar sin reserva confirmada.
4. No facturar con monto inconsistente.
5. No facturar con datos tributarios inválidos.
6. No facturar sin serie activa.
7. No duplicar comprobante.
8. No confiar en datos de facturación enviados por frontend sin validación.
9. No emitir comprobante por webhook duplicado.
10. No emitir comprobante si el pedido tiene incidencia crítica.
11. Toda emisión o intento debe auditarse.
12. No facturar pedido cancelado.
13. No facturar pedido expirado.
14. No facturar pago rechazado.
15. No facturar venta ya facturada dentro del mismo flujo.
16. No alterar comprobantes emitidos mediante edición directa.
17. No resolver devoluciones con anulación interna simple si ya existe comprobante tributario activo.
18. No saltar validaciones de serie/correlativo.
19. No exponer errores internos por Storefront API.
20. No exponer datos sensibles del comprobante.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Facturar directamente el pedido sin venta | Descartada. Rompe la relación formal venta → comprobante y dificulta auditoría. |
| Crear venta y comprobante antes del pago | Descartada. Genera riesgo tributario y operativo. |
| Facturar apenas llega webhook sin validación adicional | Descartada. El webhook puede ser duplicado, tardío o insuficiente. |
| Facturar manualmente todos los pedidos online | Descartada como solución principal. Reduce automatización y escala mal, aunque debe existir revisión manual para incidencias. |
| Convertir pedido a venta y luego emitir comprobante automáticamente | Aceptada. Es la opción más consistente con ERP/POS, facturación y trazabilidad. |

## Justificación

### Seguridad

Evita que frontend, webhooks duplicados o datos no validados generen comprobantes.

### Cumplimiento tributario

La emisión se basa en venta válida, datos tributarios y serie activa.

### Operación real

Permite automatizar pedidos correctos y aislar incidencias.

### Consistencia

Mantiene relación clara:

```text
pedido → pago → reserva → venta → comprobante
```

### Bajo riesgo

No se factura si falta pago, stock, datos o configuración.

### Trazabilidad

Cada intento de emisión queda auditado.

### Preparación para notas de crédito futuras

El sistema queda preparado para flujos tributarios formales cuando existan devoluciones, cancelaciones o correcciones.

## Consecuencias positivas

- Menor riesgo de comprobantes duplicados.
- Menor riesgo de facturar pedidos inválidos.
- Mayor consistencia entre pedido, pago, stock, venta y comprobante.
- Mejor trazabilidad tributaria.
- Mejor control de incidencias.
- Mejor integración con módulo de facturación existente.
- Preparación para reintentos controlados.
- Preparación para notas de crédito futuras.
- Mejor experiencia para cliente y soporte interno.

## Consecuencias negativas o costos

- Mayor complejidad del flujo ecommerce.
- Requiere estados de facturación.
- Requiere incidencias y reintentos.
- Requiere UI interna futura para soporte.
- Requiere QA de casos críticos.
- Requiere control estricto de series/correlativos.
- Requiere definir políticas de emisión, reintento y revisión.

Estos costos son aceptables porque la facturación electrónica es un punto crítico de cumplimiento, operación y confianza.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Comprobante duplicado | Idempotencia y restricción de un comprobante por venta. |
| Pago aprobado sin comprobante | Incidencia visible y reintento controlado. |
| Venta sin comprobante | Estado `PENDING_BILLING` y monitoreo operativo. |
| Comprobante con datos tributarios incorrectos | Validaciones y snapshot antes de emitir. |
| Serie no disponible | Bloqueo automático y estado `BILLING_SERIES_NOT_AVAILABLE`. |
| Error de proveedor/SUNAT | Estado específico, reintento controlado y revisión manual. |
| Reintentos duplicados | Idempotency key y auditoría de intentos. |
| Nota de crédito futura no prevista | No usar anulación interna para comprobantes activos; preparar flujo tributario. |
| Cliente solicita factura con datos inválidos | Bloquear emisión y permitir corrección antes de emitir. |
| Desalineación entre pago, venta y comprobante | Flujo obligatorio pedido → pago → reserva → venta → comprobante. |
| Correlativo inconsistente | Validación previa y reglas existentes de Billing Series. |
| Error expuesto al cliente | Storefront API solo muestra estados públicos seguros. |

## Impacto técnico

### Backend billing

Debe integrarse con flujo ecommerce, soportar idempotencia, incidencias y reintentos.

### Backend sales

Debe permitir venta online derivada de pedido y mantener referencia.

### Pedidos online

Deben almacenar estado de facturación, venta y comprobante.

### Mercado Pago

Pago aprobado validado habilita venta/facturación, no la dispara sin validaciones.

### Stock reservado

Reserva confirmada es condición obligatoria para venta/facturación.

### Storefront API

Debe exponer estado público seguro de facturación/comprobante.

### Angular interno

Debe tener UI futura para revisar incidencias y reintentar emisión.

### Next.js futuro

Debe mostrar estado de comprobante sin exponer datos internos.

### Auditoría

Debe registrar emisión, intentos, reintentos, errores y resoluciones.

### Reportes

Deben distinguir:

- pedidos pagados no facturados;
- ventas online facturadas;
- comprobantes con error;
- incidencias tributarias;
- reintentos.

### Seguridad

Debe evitar:

- duplicidad;
- IDOR;
- exposición de datos tributarios;
- manipulación de datos de facturación desde frontend.

### QA

Debe cubrir:

- boleta exitosa;
- factura exitosa;
- factura con datos inválidos;
- serie inexistente;
- correlativo inconsistente;
- webhook duplicado;
- reintento manual;
- proveedor con error;
- pago aprobado pero facturación fallida;
- venta ya facturada.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que la facturación automática solo ocurre después de pedido pagado, reserva confirmada y venta válida.
2. Se aprueba que la venta será el origen formal del comprobante.
3. Se aprueba que el pedido no se factura directamente.
4. Se aprueba que el comprobante usa snapshot confirmado.
5. Se aprueban validaciones diferenciadas para boleta y factura.
6. Se aprueba que factura requiere RUC, razón social y dirección fiscal válidos.
7. Se aprueba bloquear facturación sin serie activa.
8. Se aprueba bloquear facturación con datos tributarios inválidos.
9. Se aprueba bloquear facturación con incidencia de pago, stock, precio o reserva.
10. Se aprueba idempotencia en conversión a venta y emisión de comprobante.
11. Se aprueba no duplicar comprobantes por webhook o reintento.
12. Se aprueba registrar incidencias y permitir reintentos controlados.
13. Se aprueba que Storefront API no expone errores técnicos internos.
14. Se aprueba preparar notas de crédito/anulación tributaria para fases futuras.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar facturación automática ecommerce;
- crear endpoints;
- crear migraciones;
- modificar ventas actuales;
- modificar billing actual;
- implementar Mercado Pago;
- implementar pedidos online;
- activar venta online;
- emitir comprobantes ecommerce reales;
- implementar notas de crédito;
- cambiar reglas actuales de series;
- modificar proveedor de facturación;
- tocar AWS/staging;
- exponer comprobantes por Storefront API.

Este ADR solo define la estrategia de facturación automática ecommerce. La implementación debe ocurrir en fases posteriores, alineada con pedidos online, Mercado Pago, stock reservado, ventas, Billing Series, comprobantes electrónicos, Storefront API, Angular interno y QA.

## Decisión resultante

InkToy implementará facturación automática ecommerce únicamente sobre ventas válidas derivadas de pedidos online consistentes. Un pedido online no será facturado directamente. Primero deberá tener pago aprobado validado, monto coincidente, reserva confirmada y ausencia de incidencias críticas. Luego se convertirá a venta ERP/POS y esa venta será el origen formal del comprobante electrónico.

Boleta y factura tendrán validaciones diferenciadas. La factura requerirá datos tributarios empresariales válidos antes de emitir. La emisión será idempotente, auditable y protegida contra duplicados. Los errores de emisión generarán incidencias y permitirán reintentos controlados.

La facturación automática no se ejecutará si falta serie activa, si el correlativo es inconsistente, si existen datos tributarios inválidos, si el pago es inconsistente, si la reserva no está confirmada o si el pedido tiene una incidencia crítica. Las futuras devoluciones, cancelaciones o correcciones de comprobantes activos deberán resolverse con flujos tributarios formales como nota de crédito o anulación tributaria, no con anulación interna simple.

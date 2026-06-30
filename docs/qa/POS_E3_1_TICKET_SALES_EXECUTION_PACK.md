# POS-E3.1 Ticket Sales Execution Pack

## Resultado

Estado documental: PASS.

Estado de ejecucion POS-E3 real: BLOCKED hasta que el usuario confirme las precondiciones operativas pendientes.

## Resumen ejecutivo

POS-E3.1 prepara la ejecucion segura de POS-E3 real para ventas controladas con ticket interno en local QA. Esta fase es documental y no ejecuta ventas.

POS-E3 real sigue bloqueado porque aun falta confirmar snapshot, base descartable o trazabilidad aceptada; caja QA o autorizacion para abrirla; monto inicial; productos/SKUs con stock controlado; autorizacion explicita para decremento de stock QA; y decision sobre anulacion.

El alcance de POS-E3 real sera ticket interno unicamente. Boleta, factura, comprobantes electronicos, series, correlativos, SUNAT, OSE y PSE siguen bloqueados.

## Confirmaciones pendientes antes de POS-E3 real

| Area | Dato requerido | Valor a completar | Estado |
| --- | --- | --- | --- |
| Entorno | local QA | local QA | PASS |
| Produccion | Confirmar que NO es produccion | Confirmado | PASS |
| Snapshot / rollback / trazabilidad | Snapshot, base descartable o ventas QA trazables aceptadas | `[pendiente]` | BLOCKED |
| Usuario ejecutor | `cajero@erp.local`, `admin@erp.local` o `supervisor@erp.local` | `[pendiente]` | PENDING |
| Caja QA | Ya abierta o autorizacion para abrir | `[ya abierta/autorizo abrir]` | BLOCKED |
| Monto inicial | Monto inicial de caja QA | `[pendiente]` | BLOCKED |
| Cierre / reconciliacion | Politica de cierre posterior | `[pendiente]` | BLOCKED |
| Almacen | Almacen controlado | Tienda 01 | PASS como candidato |
| Producto stock suficiente | SKU/id/nombre/stock | `[pendiente]` | BLOCKED |
| Producto stock bajo | SKU/id/nombre/stock | `[pendiente]` | BLOCKED |
| Precio simple | Producto con total facil de calcular | `[pendiente]` | BLOCKED |
| Stock QA | Confirmar que no es operativo real o que impacto QA es aceptado | `[pendiente]` | BLOCKED |
| Decremento stock | Autorizacion explicita | `[si/no]` | BLOCKED |
| Alcance | Ticket interno unicamente | `[confirmar]` | PENDING |
| Boleta/factura | No autorizado | No autorizado | PASS |
| Comprobantes/series/SUNAT/OSE/PSE | No autorizado | No autorizado | PASS |
| Pagos QA | Referencias `QA-POS-E3` | `[confirmar]` | PENDING |
| Anulacion | Ejecutar, postergar o bloquear | `[si/no/postergar]` | PENDING |

## Matriz de escenarios POS-E3

| Escenario | Objetivo | Requisitos | Evidencia | Estado inicial |
| --- | --- | --- | --- | --- |
| E3-01 | Venta simple ticket interno con efectivo exacto | Caja QA abierta, producto con stock suficiente | saleId, saleNumber, total, pago CASH exacto, stock antes/despues | BLOCKED |
| E3-02 | Venta ticket interno con efectivo y vuelto | Caja QA abierta, producto precio simple | paidAmount, changeAmount, expected cash | BLOCKED |
| E3-03 | Venta ticket interno con tarjeta y referencia QA | Referencia `QA-POS-E3-CARD-*` | metodo CARD, referencia, venta creada | BLOCKED |
| E3-04 | Venta ticket interno con transferencia si existe | Referencia `QA-POS-E3-TRF-*` | metodo TRANSFER, referencia | BLOCKED |
| E3-05 | Pago mixto solo si esta soportado y autorizado | Lineas CASH/CARD/TRANSFER segun soporte | pagos multiples y total cubierto | BLOCKED |
| E3-06 | Venta con descuento simple | Producto precio simple, descuento trazable | subtotal, descuento, total | BLOCKED |
| E3-07 | Venta con varios productos | Productos QA con stock suficiente | items, cantidades, total | BLOCKED |
| E3-08 | Validacion de stock antes/despues | Baseline de stock documentado | stock inicial, stock final, delta | BLOCKED |
| E3-09 | Validacion de caja esperada | Caja QA y pagos CASH documentados | expected cash, pagos CASH, diferencia esperada | BLOCKED |
| E3-10 | Anulacion de venta ticket interno | Usuario ADMIN/SUPERVISOR, caja abierta, sin comprobante | estado VOIDED, stock restaurado | BLOCKED hasta autorizacion |

## Evidencia requerida por venta

| Campo | Descripcion |
| --- | --- |
| Fecha/hora | Momento local QA de ejecucion |
| Usuario | Usuario QA ejecutor |
| Caja | ID/estado de caja QA |
| Monto inicial | Monto inicial de caja QA |
| Almacen | Tienda 01 |
| Producto | SKU/id/nombre/barcode si aplica |
| Stock antes | Cantidad antes de confirmar venta |
| Stock despues | Cantidad despues de venta o anulacion |
| Cantidad | Cantidad vendida |
| Precio unitario | Precio observado |
| Descuento | Descuento aplicado si corresponde |
| Total | Total esperado y total mostrado |
| Metodo de pago | CASH/CARD/TRANSFER/mixto |
| Referencia QA | Prefijo obligatorio `QA-POS-E3` cuando aplique |
| saleId | ID retornado por venta |
| saleNumber | Numero de venta |
| Estado de venta | COMPLETED o VOIDED si anula |
| Caja esperada | Impacto esperado en caja para pagos CASH |
| Capturas | Carrito, checkout, confirmacion, venta creada, stock/caja si aplica |

## Controles de seguridad

- Usar solo local QA confirmado.
- Mantener ticket interno seleccionado.
- Usar referencias con prefijo `QA-POS-E3`.
- Registrar stock antes de confirmar venta.
- Registrar stock despues de cada venta.
- Registrar caja antes y despues solo si la UI lo permite sin cerrar caja.
- No usar datos reales de clientes.
- No seleccionar boleta ni factura.
- No generar, firmar ni enviar comprobantes.
- No consumir series ni correlativos.
- No cerrar caja salvo fase posterior explicitamente autorizada.
- No anular ventas si no fue autorizado para E3.

## Criterios STOP

Detener la prueba inmediatamente si ocurre cualquiera de estos casos:

- El entorno parece produccion.
- Aparece boleta o factura por error durante el escenario de venta.
- Se intenta emitir comprobante electronico.
- Se muestra una serie real o correlativo fiscal.
- El sistema intenta enviar a SUNAT, OSE o PSE.
- La caja visible no corresponde a caja QA.
- El almacen no es Tienda 01 o no esta confirmado como QA/controlado.
- El producto o stock parece operativo real no autorizado.
- El stock antes no coincide con el baseline acordado.
- El total calculado no coincide con el total mostrado y no hay explicacion.
- Hay error inesperado despues de crear una venta.
- Se pierde trazabilidad de saleId, saleNumber, stock o caja.

## Pruebas bloqueadas

- Produccion.
- Boleta.
- Factura.
- Comprobante electronico.
- Consumo de serie o correlativo.
- SUNAT/OSE/PSE.
- Stock operativo real no autorizado.
- Caja operativa real no autorizada.
- Datos reales de clientes.
- Anulacion si no fue autorizada.
- Cierre de caja si no fue autorizado.
- POS-E4.

## Criterio para permitir POS-E3 real

POS-E3 real solo puede iniciar cuando el usuario confirme explicitamente:

- Snapshot, base descartable o trazabilidad aceptada.
- Usuario ejecutor.
- Caja QA existente o autorizacion para abrirla.
- Monto inicial de caja QA.
- Politica de cierre/reconciliacion.
- Almacen Tienda 01 como QA/controlado.
- Producto con stock suficiente.
- Producto con stock bajo.
- Producto con precio simple.
- Autorizacion para decremento de stock QA.
- Ticket interno unicamente.
- No boleta, no factura, no comprobantes, no series, no SUNAT/OSE/PSE.
- Pagos QA con referencias `QA-POS-E3`.
- Decision sobre anulacion.

## Prompt sugerido para POS-E3 real

```text
Inicia POS-E3 real: ventas controladas con ticket interno en local QA.

Confirmo:
- Entorno: local QA.
- NO es produccion.
- Snapshot/base descartable/trazabilidad: [snapshot/base descartable/ventas QA trazables aceptadas].
- Usuario ejecutor: [cajero@erp.local/admin@erp.local/supervisor@erp.local].
- Caja QA: [ya abierta id ... / autorizo abrir caja QA].
- Monto inicial caja QA: [monto].
- Politica de cierre/reconciliacion: [cerrar en E5/dejar abierta/otra].
- Almacen: Tienda 01.
- Producto con stock suficiente: [SKU/id/nombre/stock/precio].
- Producto con stock bajo: [SKU/id/nombre/stock/precio].
- Producto con precio simple: [SKU/id/nombre/precio].
- Autorizo decremento de stock QA: [si].
- Alcance: ticket interno unicamente.
- Boleta/factura: no autorizado.
- Comprobantes/series/SUNAT/OSE/PSE: no autorizado.
- Referencias de pago: usar prefijo QA-POS-E3.
- Pago mixto: [autorizado/no autorizado].
- Anulacion: [autorizada/no autorizada/postergar].

Ejecutar solo los escenarios E3 autorizados, registrar evidencia completa y detener ante cualquier criterio STOP.
```

## Confirmacion POS-E3.1

- No se ejecutaron ventas.
- No se confirmo Cobrar.
- No se creo venta.
- No se abrio caja.
- No se cerro caja.
- No se modifico caja.
- No se modifico stock.
- No se emitio comprobante.
- No se consumio serie.
- No se toco SUNAT/OSE/PSE real.
- No se uso datos reales de clientes.
- No se toco base de datos.
- No se modifico codigo funcional.
- No se inicio POS-E3 real.
- No se inicio POS-E4.
- No se hizo commit.
- No se hizo push.
- No se creo tag.

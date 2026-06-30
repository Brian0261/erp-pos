# POS-E2 No-Write Smoke Checklist

## Objetivo

Validar el flujo POS hasta antes de cualquier operacion transaccional. POS-E2 no debe crear ventas, abrir/cerrar caja, modificar stock ni emitir comprobantes.

## Precondiciones minimas

| Area | Requerido |
| --- | --- |
| Entorno | `local QA` o `staging` confirmado |
| Produccion | Confirmado que NO es produccion |
| Usuario | Login QA disponible |
| Almacen | Almacen QA seleccionado o visible |
| Productos | Productos QA disponibles para busqueda/carrito |
| Caja | Solo visualizar caja actual; no abrir ni cerrar |

## Checklist no-write

| Paso | Accion | Resultado esperado | Estado |
| --- | --- | --- | --- |
| 1 | Cargar POS | Pantalla carga sin error critico | PENDING |
| 2 | Ver caja actual | Estado de caja visible si existe | PENDING |
| 3 | Confirmar que no se abrira caja | No se usa `POST /cash-registers/open` | PENDING |
| 4 | Confirmar que no se cerrara caja | No se usa `POST /cash-registers/{id}/close` | PENDING |
| 5 | Seleccionar almacen QA | Almacen seleccionado sin guardar backend | PENDING |
| 6 | Buscar producto por texto | Resultados visibles o estado sin resultados | PENDING |
| 7 | Buscar o escanear por codigo | Producto encontrado o mensaje controlado | PENDING |
| 8 | Usar chips rapidos | Busqueda cambia segun chip | PENDING |
| 9 | Agregar producto al carrito | Carrito se actualiza localmente | PENDING |
| 10 | Quitar producto del carrito | Carrito se actualiza localmente | PENDING |
| 11 | Cambiar cantidad | Totales se recalculan localmente | PENDING |
| 12 | Aplicar descuento | Totales se recalculan localmente | PENDING |
| 13 | Probar stock insuficiente visual | Venta no se confirma | PENDING |
| 14 | Abrir checkout | Modal abre sin POST de venta | PENDING |
| 15 | Probar pago insuficiente | Mensaje de validacion al intentar finalizar | PENDING |
| 16 | Probar boleta incompleta | Validacion bloquea finalizacion | PENDING |
| 17 | Probar factura incompleta | Validacion bloquea finalizacion | PENDING |
| 18 | Cerrar checkout | Estado local se conserva si aplica | PENDING |
| 19 | Reabrir checkout | Pagos/comprobante se mantienen si aplica | PENDING |
| 20 | Recargar pagina si es seguro | Draft local se restaura o limpia segun caja/sesion | PENDING |
| 21 | Si aparece confirmacion `Venta real` | Cancelar | PENDING |

## Prohibiciones durante E2

- No confirmar Cobrar.
- No ejecutar `POST /sales`.
- No ejecutar `POST /billing/documents/from-sale/{saleId}`.
- No abrir caja.
- No cerrar caja.
- No anular ventas.
- No generar XML.
- No firmar comprobantes.
- No enviar comprobantes.
- No consumir series.
- No modificar stock.
- No tocar base de datos.
- No usar datos reales innecesarios.

## Evidencia sugerida

| Evidencia | Requerido |
| --- | --- |
| Entorno usado | Si |
| Usuario QA | Si |
| Almacen QA | Si |
| Producto/SKU/barcode usado | Si |
| Captura de carrito | Si |
| Captura de checkout | Si |
| Captura de validacion insuficiente | Si |
| Confirmacion de no venta creada | Si |

## Resultado

Resultado E2: `[PASS/PARTIAL/FAIL/BLOCKED]`.

Notas: `[completar durante E2]`.

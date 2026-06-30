# POS-E1.1 Transactional Readiness Pack

## Resultado

Estado documental: PASS.

Estado de habilitacion transaccional: BLOCKED hasta que el usuario confirme las precondiciones externas inevitables.

## Resumen ejecutivo

POS-E1 termino como BLOCKED/PARTIAL porque faltan confirmaciones externas que no se pueden inferir desde el repositorio: entorno, snapshot o rollback, usuarios, caja, almacen, productos, stock, series y emision segura.

POS-E1.1 crea este paquete documental para reducir la intervencion manual del usuario a las confirmaciones estrictamente necesarias por seguridad operativa, credenciales, datos reales, caja, stock, ventas y comprobantes.

D5 cerro la validacion UI/refactor del POS sin confirmar venta real. Fase E validara transacciones reales/controladas solo en entorno seguro.

No se debe ejecutar POS-E2, POS-E3, POS-E4 ni POS-E5 contra un entorno no confirmado. Produccion queda bloqueada salvo autorizacion explicita y controles adicionales.

## Diferencia entre D5, E1.1 y E2

| Fase | Proposito | Escritura backend | Venta confirmada | Resultado esperado |
| --- | --- | --- | --- | --- |
| POS-D5 | Cierre UI/refactor y smoke manual sin venta real | No | No | PASS de interfaz y flujo visual |
| POS-E1.1 | Readiness pack documental y precondiciones | No | No | Checklist y decisiones para desbloquear Fase E |
| POS-E2 | Smoke transaccional no-write en navegador | No | No | Validar flujo hasta antes de confirmar Cobrar |

## Confirmacion requerida por el usuario

Completar esta tabla antes de pedir POS-E2.

| Area | Dato requerido | Valor a completar | Estado |
| --- | --- | --- | --- |
| Entorno | Elegir `local QA` o `staging` | `[local QA/staging]` | PENDING |
| Seguridad | Confirmar que NO es produccion | `[si/no]` | PENDING |
| Base | Snapshot disponible | `[si/no/no aplica]` | PENDING |
| Base | Base descartable disponible | `[si/no/no aplica]` | PENDING |
| Base | Ventas QA trazables aceptadas si no hay rollback | `[si/no/no aplica]` | PENDING |
| Usuario | CAJERO QA disponible | `[usuario/forma de login]` | PENDING |
| Usuario | ADMIN o SUPERVISOR QA disponible | `[usuario/forma de login]` | PENDING |
| Caja | Caja QA dedicada | `[si/no/id si existe]` | PENDING |
| Caja | Monto inicial de prueba | `[monto]` | PENDING |
| Caja | Politica de cierre/reconciliacion | `[cerrar en E5/dejar abierta/otra]` | PENDING |
| Almacen | Almacen QA dedicado | `[nombre/id]` | PENDING |
| Almacen | Confirmar que no usa stock operativo real | `[si/no]` | PENDING |
| Producto | Producto QA con stock suficiente | `[sku/barcode/id/stock]` | PENDING |
| Producto | Producto QA con stock bajo | `[sku/barcode/id/stock]` | PENDING |
| Producto | Producto QA con precio simple | `[sku/barcode/id/precio]` | PENDING |
| Producto | Producto con codigo/SKU/barcode para busqueda | `[codigo]` | PENDING |
| Stock | Stock inicial registrado antes de ventas | `[si/no]` | PENDING |
| Stock | Reposicion o reversa posible | `[si/no/metodo]` | PENDING |
| Series | Serie boleta QA en LOCAL/BETA | `[id/serie/ambiente/currentNumber]` | PENDING |
| Series | Serie factura QA en LOCAL/BETA | `[id/serie/ambiente/currentNumber]` | PENDING |
| Emision | Confirmar que no se enviara a SUNAT/OSE/PSE real | `[si/no]` | PENDING |
| Emision | Ambiente de billing seguro | `[LOCAL/BETA]` | PENDING |
| Cliente QA | DNI de prueba | `[dni]` | PENDING |
| Cliente QA | Nombre cliente QA | `[nombre]` | PENDING |
| Cliente QA | RUC de prueba | `[ruc]` | PENDING |
| Cliente QA | Razon social QA | `[razon social]` | PENDING |
| Evidencia | Prefijo de identificacion | `QA-POS-E` | READY |
| Evidencia | Referencia de pago QA | `[QA-POS-E-...]` | PENDING |
| Evidencia | Capturas requeridas aceptadas | `[si/no]` | PENDING |

## Tabla de decision

| Condicion | Decision |
| --- | --- |
| Entorno no confirmado | BLOCKED para E2 y posteriores |
| Entorno parece produccion | BLOCKED para toda venta y smoke operativo |
| No hay snapshot, base descartable ni trazabilidad aceptada | Bloquear ventas controladas E3/E4/E5 |
| No hay caja QA o politica de caja | Bloquear ventas controladas E3/E5 |
| No hay productos QA o stock controlado | Bloquear ventas controladas E3/E4 |
| No hay series QA o emision segura | Bloquear E4 boleta/factura |
| Solo falta boleta/factura segura | Permitir E2 y evaluar E3 ticket interno; bloquear E4 |
| Todo confirmado como no productivo y controlado | Permitir POS-E2 |

## Que puede hacer OpenCode sin el usuario

- Revisar estado Git, historial y diffs.
- Revisar documentacion QA existente.
- Revisar contratos frontend y backend en solo lectura.
- Crear documentacion, checklists y prompts.
- Ejecutar build local si el repo esta limpio y no implica operaciones transaccionales.
- Preparar matriz de evidencias y criterios de decision.
- Reportar riesgos residuales y bloqueos.

## Que debe confirmar inevitablemente el usuario

| Confirmacion | Por que no puede inferirse desde el repo |
| --- | --- |
| Entorno no productivo | El repo no prueba a que ambiente apunta el navegador/proxy real |
| Snapshot, rollback o base descartable | Es una condicion operativa de la base activa |
| Credenciales CAJERO/ADMIN | Son secretos y permisos de acceso manual |
| Caja QA y monto inicial | Abrir o cerrar caja cambia datos reales |
| Almacen y productos QA | Usar stock incorrecto afecta inventario operativo |
| Series QA y correlativos | Crear comprobante DRAFT consume correlativo |
| Emision segura LOCAL/BETA | Evita SUNAT/OSE/PSE real y riesgo fiscal |
| Autorizacion para venta controlada | `POST /sales` crea venta y descuenta stock |

## Gates tecnicos confirmados desde el codigo

| Flujo | Evidencia | Implicancia QA |
| --- | --- | --- |
| Venta POS | `SalesService.create()` usa `POST /sales` | Confirmar Cobrar crea venta real |
| Checkout POS | `finalizeSale()` muestra confirmacion `Venta real` antes del POST | E2 debe cancelar/no confirmar Cobrar |
| Comprobante | `ElectronicDocumentService.createFromSale()` usa `POST /billing/documents/from-sale/{saleId}` | Boleta/factura es un segundo write |
| Falla comprobante | POS conserva la venta y muestra pendiente de emision | E4 debe capturar saleId aunque falle billing |
| Caja | `CashRegisterService.open/current/close` usa endpoints de caja | E1.1 no abre ni cierra caja |
| Draft | `PosStateService` usa `sessionStorage` | E2 puede escribir solo estado local de navegador |

## Matriz resumida E2-E6

| Fase | Objetivo | Requisito minimo | Escritura backend |
| --- | --- | --- | --- |
| POS-E2 | No-write transactional smoke | Entorno no productivo confirmado | No |
| POS-E3 | Ticket interno controlado | Snapshot/trazabilidad, caja QA, stock QA | Si, `POST /sales` |
| POS-E4 | Boleta/factura controlada | E3 listo, series QA LOCAL/BETA, emision segura | Si, venta y documento DRAFT |
| POS-E5 | Reconciliacion | Ventas/comprobantes QA ejecutados | Puede cerrar caja QA si autorizado |
| POS-E6 | Cierre documental | Evidencia E2-E5 | No, salvo documentacion autorizada |

## Evidencia requerida para fases con escritura

| Evidencia | Aplica a |
| --- | --- |
| Entorno y fecha/hora | E2-E6 |
| Usuario CAJERO/ADMIN usado | E2-E6 |
| Caja id, monto inicial y estado | E3-E5 |
| Almacen id/nombre | E2-E5 |
| Producto id/SKU/barcode | E2-E5 |
| Stock antes/despues | E3-E5 |
| Sale id y saleNumber | E3-E5 |
| Metodo y referencia de pago `QA-POS-E` | E3-E5 |
| Document id y fullNumber | E4-E5 |
| Serie, ambiente y correlativo antes/despues | E4-E5 |
| Capturas de mensajes de exito/error | E2-E6 |

## Pruebas permitidas sin venta

- Cargar POS.
- Ver caja actual sin abrir ni cerrar.
- Seleccionar almacen QA.
- Buscar por texto.
- Buscar o escanear por codigo.
- Usar chips rapidos.
- Agregar y quitar productos del carrito.
- Cambiar cantidades sin confirmar venta.
- Aplicar descuentos sin confirmar venta.
- Probar pagos insuficientes.
- Probar validaciones de boleta/factura incompleta.
- Abrir y cerrar checkout.
- Recargar y validar draft si el entorno es seguro.
- Cancelar la confirmacion si aparece `Venta real`.

## Pruebas bloqueadas hasta autorizacion transaccional

- Confirmar Cobrar.
- Ejecutar `POST /sales`.
- Abrir caja.
- Cerrar caja.
- Anular venta.
- Crear boleta o factura.
- Ejecutar `POST /billing/documents/from-sale/{saleId}`.
- Generar, firmar o enviar comprobante.
- Consumir correlativos.
- Modificar stock, base de datos o configuracion.
- Usar SUNAT/OSE/PSE real.

## Prompt sugerido para POS-E2

```text
Inicia POS-E2 No-write transactional smoke para InkToy ERP/POS.

Entorno confirmado: [local QA/staging].
Confirmo que NO es produccion: [si].
Base/snapshot/trazabilidad: [snapshot/base descartable/solo no-write].
Usuario QA: [usuario o forma de login].
Almacen QA: [nombre/id].
Productos QA para busqueda/carrito: [sku/barcode/id].
Series QA disponibles para validacion visual: [boleta/factura o no aplica].

Restricciones: no ejecutar ventas, no confirmar Cobrar, no abrir caja, no cerrar caja, no modificar stock, no emitir comprobantes, no consumir series, no usar SUNAT/OSE/PSE real, no tocar base de datos, no modificar codigo, no hacer commit, no push, no tag.

Validar solo carga POS, caja visible, busqueda, escaneo/codigo, chips, carrito, cantidades, descuentos, pagos insuficientes, validaciones de boleta/factura incompleta, abrir/cerrar checkout y draft/reload seguro. Si aparece confirmacion `Venta real`, cancelar.
```

## Criterio para desbloquear POS-E2

POS-E2 queda permitido solo si el usuario completa como minimo:

- Entorno elegido.
- Confirmacion explicita de que no es produccion.
- Usuario QA o forma de login.
- Almacen y productos QA para smoke no-write.
- Aceptacion de que no se confirmara Cobrar.

POS-E3 y POS-E4 requieren ademas snapshot, caja QA, stock controlado, datos de pago QA y autorizacion explicita para ventas controladas.

## Confirmacion POS-E1.1

- No se ejecutaron ventas.
- No se confirmo Cobrar.
- No se abrio caja.
- No se cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se toco base de datos.
- No se modifico codigo funcional.
- No se hizo commit.
- No se hizo push.
- No se creo tag.

# POS-E3.2 Operational Preconditions Checklist

## Resultado

Estado documental: PASS.

Estado de ejecucion POS-E3 controlled-write: BLOCKED.

Estado de POS-E4/POS-E5: BLOCKED.

Playwright solo se usara como apoyo no-write hasta nueva autorizacion explicita para controlled-write.

## Objetivo

POS-E3.2 consolida una checklist operativa para reunir y validar manualmente todas las precondiciones requeridas antes de autorizar una futura ejecucion E3 controlled-write con ticket interno.

Esta fase es exclusivamente documental.

## Estado actual

- El roadmap real sigue en Fase E.
- E1/E1.1 permanecen en PASS documental, pero la habilitacion transaccional sigue bloqueada.
- E2 no-write permanece en PASS.
- E3 sigue BLOCKED.
- E4/E5 siguen BLOCKED.
- No existen specs controlled-write.
- Los guards actuales siguen bloqueando mutaciones API salvo login en no-write.
- Backend confirma que crear venta requiere caja abierta, valida stock, guarda venta y registra salida de inventario.
- Billing, comprobantes electronicos, series, SUNAT, OSE y PSE siguen fuera de alcance seguro.

## Checklist de precondiciones obligatorias

Todas las precondiciones siguientes deben quedar confirmadas manualmente antes de autorizar E3.3 o POS-E3 controlled-write.

| Campo | Valor requerido | Valor confirmado | Evidencia | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Entorno QA no productivo | Local QA confirmado y no productivo | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Snapshot o trazabilidad aceptada | Snapshot, base descartable o aceptacion explicita de trazabilidad persistente | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Usuario QA ejecutor | Usuario QA autorizado para ejecutar la venta controlada | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Caja QA disponible | Caja QA ya abierta o autorizacion explicita para abrir caja QA | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Monto inicial de caja | Monto inicial documentado antes de la venta | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Almacen QA | Almacen QA/controlado confirmado | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| SKU o producto QA | Un solo producto QA identificado por SKU/id/nombre | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Stock inicial exacto | Cantidad exacta antes de la venta | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Precio esperado | Precio unitario exacto y esperado | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Cantidad a vender | Cantidad 1 confirmada | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Metodo de pago QA | Metodo QA permitido para la primera ejecucion | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Referencia QA | Referencia QA documentada si el metodo aplica | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Autorizacion para decrementar stock | Aprobacion explicita para afectar stock QA | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Politica de rollback/anulacion | Decision documentada sobre rollback, anulacion o postergacion | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |
| Prohibicion de boleta/factura/comprobantes/series/SUNAT/OSE/PSE | Confirmacion explicita de alcance restringido | `[pendiente]` | `[captura/nota]` | `[pendiente]` | PENDIENTE |

## Plantilla manual de completado

Usar esta plantilla para cualquier confirmacion adicional o reemplazo de la tabla anterior.

| Campo | Valor requerido | Valor confirmado | Evidencia | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| `[campo]` | `[requerido]` | `[confirmado]` | `[captura/enlace/nota]` | `[persona/rol]` | PENDIENTE / CONFIRMADO / BLOQUEADO |

## Guia de validacion manual

- `PENDIENTE`: el dato aun no fue confirmado o falta evidencia.
- `CONFIRMADO`: el dato fue validado manualmente y cuenta con evidencia suficiente.
- `BLOQUEADO`: existe una dependencia o restriccion que impide confirmar el dato.
- Si cualquier campo obligatorio queda en `PENDIENTE` o `BLOQUEADO`, E3 debe seguir bloqueado.

## Criterio Go/No-Go

Se puede autorizar E3.3 o POS-E3 controlled-write solamente cuando:

- Todos los campos obligatorios esten en `CONFIRMADO`.
- Exista evidencia manual verificable para entorno, caja, almacen, producto, stock, precio y metodo de pago.
- Exista aprobacion explicita para decrementar stock QA.
- Exista decision explicita de rollback/anulacion, incluso si la primera ejecucion la posterga.
- Exista confirmacion explicita de que el alcance es ticket interno unicamente y sin billing.

POS-E3 controlled-write debe seguir bloqueado cuando:

- Falte snapshot, base descartable o aceptacion formal de trazabilidad persistente.
- No exista usuario QA ejecutor confirmado.
- No exista caja QA abierta ni autorizacion explicita para abrirla.
- No exista monto inicial documentado.
- No exista producto QA unico con stock exacto conocido.
- No exista precio esperado validado.
- No exista autorizacion explicita para decrementar stock.
- No exista politica de rollback/anulacion.
- No exista prohibicion explicita de boleta, factura, comprobantes, series, SUNAT, OSE y PSE.

Lo que impide avanzar es cualquier precondicion faltante o sin evidencia suficiente, especialmente caja QA, stock exacto, autorizacion de impacto y delimitacion del alcance sin billing.

## Alcance maximo permitido para futura venta controlada

- Ticket interno unicamente.
- Una venta pequena.
- Un solo producto QA.
- Cantidad 1.
- Sin boleta.
- Sin factura.
- Sin comprobante electronico.
- Sin SUNAT, OSE o PSE.
- Sin consumo de series.
- Sin anulacion en la primera ejecucion salvo autorizacion posterior explicita.

## Riesgos

- Venta persistente en base QA.
- Decremento de stock persistente.
- Impacto en caja por apertura, total esperado o diferencia posterior.
- Pagos persistidos en la venta.
- Anulacion dependiente de permisos, caja abierta y estado de billing.
- Mezcla de datos QA con datos operativos si el entorno o producto no estan claramente aislados.

## Recomendacion final

- No iniciar E3 real hasta completar la checklist operativa y dejar toda la evidencia en estado `CONFIRMADO`.
- Si la checklist no se completa, mantener E3, E4 y E5 en `BLOCKED`.
- Si la checklist no se completa, continuar con Fase F polish visual o con trabajo del roadmap no transaccional.

## Confirmaciones de seguridad de POS-E3.2

- No se ejecutaron ventas.
- No se confirmo Cobrar ni finalizar venta.
- No se abrio caja.
- No se cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se toco SUNAT, OSE o PSE.
- No se modifico codigo funcional.
- No se modificaron specs, helpers, guards, fixtures, scripts ni configuracion Playwright.
- No se toco backend, base de datos, infraestructura ni Storefront/ecommerce.
- No se crearon archivos `.env`.
- No se guardaron credenciales.
- No se versiono storageState.
- No se hizo commit.
- No se hizo push.
- No se creo tag.

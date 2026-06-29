# POS-D3 Receipt UI In Checkout QA

## Objetivo

Mover solo la UI de comprobante y datos de cliente del POS al checkout modal, manteniendo estado, handlers, validaciones, payloads y logica funcional en `PosPageComponent`.

## Alcance

- Frontend Angular ERP/POS.
- Trabajo localizado en `frontend/src/app/features/sales`.
- Se reutiliza el checkout modal creado en POS-D1 y ampliado en POS-D2.
- Se mueve al modal solo la seccion de comprobante: tipo, serie, DNI, nombre cliente, RUC, razon social, direccion fiscal y mensajes visuales de validacion.
- Pagos siguen dentro del checkout modal.
- Pantalla principal queda sin formularios inline de pagos ni comprobante.
- Sin cambios en backend, endpoints, contratos, payloads, rutas, guards, Auth/JWT, infraestructura, migraciones ni Storefront/ecommerce.

## Archivos modificados

- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/components/pos-checkout-modal.component.ts`
- `docs/qa/POS_D3_RECEIPT_UI_IN_CHECKOUT_QA.md`

## Cambios realizados

- Se retiro el bloque inline de comprobante de la pantalla principal del POS.
- `PosCheckoutModalComponent` ahora recibe por `@Input` el estado visual de comprobante y validaciones existentes.
- `PosCheckoutModalComponent` renderiza dentro del modal la UI de ticket interno, boleta, factura, serie, DNI, nombre cliente, RUC, razon social y direccion fiscal.
- El modal emite eventos para actualizar tipo de comprobante, serie, datos de cliente y toggle de datos fiscales.
- `PosPageComponent` sigue ejecutando los handlers existentes: `setReceiptType()`, `setReceiptSeriesId()`, `setReceiptCustomerDocument()`, `setReceiptCustomerName()`, `setReceiptCustomerAddress()`, `toggleFiscalDetails()` y `blockInvalidNumericKeys()`.
- El modal sigue mostrando la UI de pagos movida en POS-D2.
- El modal sigue mostrando resumen de totales con `PosTotalsSummaryComponent`.
- El CTA final sigue emitiendo al padre y `PosPageComponent` sigue usando `finalizeSale()`.
- El boton principal `Cobrar` permite reabrir el modal aunque exista un error visual de comprobante, para que el usuario pueda corregirlo; el CTA final del modal y `finalizeSale()` mantienen el bloqueo por validacion.

## Confirmaciones de alcance

- Solo se movio la UI de comprobante y datos de cliente.
- Pagos siguen en el checkout modal.
- La pantalla principal ya no muestra pagos inline.
- La pantalla principal ya no muestra comprobante inline.
- Estado canonico de pagos sigue en `PosPageComponent`.
- Estado canonico de comprobante sigue en `PosPageComponent`.
- Estado canonico de venta, emision, draft, caja y mensajes sigue en `PosPageComponent`.
- `PosCheckoutModalComponent` sigue siendo presentacional.
- `PosCheckoutModalComponent` no llama servicios HTTP.
- `PosCheckoutModalComponent` no navega.
- `PosCheckoutModalComponent` no persiste draft.
- `PosCheckoutModalComponent` no construye payloads.
- No se cambio `finalizeSale()`.
- No se cambio el flujo de venta.
- No se cambio la creacion de venta.
- No se cambio la emision electronica.
- No se cambiaron validaciones actuales.
- El bloqueo por validacion de comprobante se mantiene en el CTA final del modal y en `finalizeSale()`.
- No se cambio el comportamiento de ticket, boleta ni factura.
- No se cambio el comportamiento cuando falla la emision de comprobante despues de crear venta.
- No se cambio el payload de venta.
- No se cambio el payload de comprobante.
- No se tocaron endpoints ni contratos.
- No se modifico la persistencia de draft.
- Backend no fue tocado.
- No se crearon migraciones.
- Infraestructura no fue tocada.
- Storefront/ecommerce no fue tocado.
- No se corrigio `npm test` en esta fase.
- No se hizo commit, push ni tag.

## Comandos ejecutados

| Momento | Comando | Resultado |
| --- | --- | --- |
| Estado inicial | `git status --short` | Working tree limpio. |
| Historial inicial | `git log --oneline -8` | POS-B1 `f0c785f`, POS-B2 `de737c5`, POS-B2.5 `6234ab2`, POS-C1 `febb8b6`, POS-D1 `e4aab2f` y POS-D2 `e334113` presentes. |
| Baseline | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm test` en `frontend` | Limitacion conocida: Angular CLI reporto `Unknown arguments: watch, browsers`. |

## Smoke runtime/manual

OpenCode no ejecuto smoke runtime/manual por falta de navegador interactivo en esta sesion.

El usuario ejecuto smoke manual en navegador con resultado PASS.

Smoke recomendado para validacion humana:

- Abrir POS y confirmar carga de pantalla. PASS.
- Confirmar carrito vacio. PASS.
- Agregar producto. PASS.
- Agregar multiples productos. PASS.
- Cambiar cantidad. PASS.
- Aplicar descuento. PASS.
- Quitar producto. PASS.
- Revisar total. PASS.
- Confirmar que pagos ya no estan inline. PASS.
- Confirmar que comprobante ya no esta inline. PASS.
- Abrir modal con Cobrar. PASS.
- Confirmar que pagos aparecen dentro del modal. PASS.
- Confirmar que comprobante aparece dentro del modal. PASS.
- Cambiar metodo de pago. PASS.
- Cambiar monto recibido. PASS.
- Revisar total pagado. PASS.
- Revisar vuelto. PASS.
- Seleccionar ticket interno. PASS.
- Seleccionar boleta. PASS.
- Ingresar DNI si aplica. PASS.
- Ingresar nombre cliente si aplica. PASS.
- Seleccionar factura. PASS.
- Ingresar RUC. PASS.
- Ingresar razon social. PASS.
- Seleccionar serie si aplica. PASS.
- Cerrar modal. PASS.
- Confirmar que pagos/comprobante no se pierden. PASS.
- Reabrir modal. PASS.
- Confirmar que pagos/comprobante se conservan. PASS.
- Confirmar que el modal permite corregir comprobante invalido. PASS.
- Confirmar que no se cambio flujo de venta. PASS.
- No confirmar venta real. PASS.

## Riesgos residuales

- Validacion automatizada de tests sigue limitada por la configuracion actual de Angular CLI.
- Smoke runtime no fue ejecutado desde OpenCode por falta de navegador interactivo.
- `PosCheckoutModalComponent` queda mas grande despues de D2/D3; conviene evaluar extraccion de subcomponentes presentacionales en una fase posterior, sin mover estado ni logica al modal.
- El acceso directo a configuracion de series no se traslado al modal para mantenerlo sin navegacion.

## Recomendacion de siguiente fase

Continuar con una fase de polish/cleanup controlada para compactar la pantalla principal y, si hace falta, extraer subcomponentes presentacionales del checkout modal sin cambiar flujo, payloads ni backend.

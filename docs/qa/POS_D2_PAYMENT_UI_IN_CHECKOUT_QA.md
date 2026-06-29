# POS-D2 Payment UI In Checkout QA

## Objetivo

Mover solo la UI de pagos del POS al checkout modal, manteniendo estado, handlers, validaciones y logica funcional en `PosPageComponent`.

## Alcance

- Frontend Angular ERP/POS.
- Trabajo localizado en `frontend/src/app/features/sales`.
- Se reutiliza el checkout modal creado en POS-D1.
- Se mueve al modal solo la seccion de pagos: metodo, monto, referencia, multiples lineas, agregar/quitar pago y resumen pagado/vuelto.
- Comprobante, DNI/RUC, razon social, direccion fiscal y validaciones de comprobante siguen en pantalla principal.
- Sin cambios en backend, endpoints, contratos, payloads, rutas, guards, Auth/JWT, infraestructura, migraciones ni Storefront/ecommerce.

## Archivos modificados

- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/components/pos-checkout-modal.component.ts`
- `docs/qa/POS_D2_PAYMENT_UI_IN_CHECKOUT_QA.md`

## Cambios realizados

- Se retiro el bloque inline de pagos de la pantalla principal del POS.
- `PosCheckoutModalComponent` ahora recibe `payments` por `@Input`.
- `PosCheckoutModalComponent` renderiza la UI de pagos dentro del modal.
- El modal emite eventos para agregar, quitar y editar pagos.
- `PosPageComponent` sigue ejecutando los handlers existentes: `addPaymentLine()`, `removePaymentLine()`, `setPaymentMethod()`, `setPaymentAmount()` y `setPaymentReference()`.
- El modal sigue mostrando resumen de totales con `PosTotalsSummaryComponent`.
- El CTA final sigue emitiendo al padre y `PosPageComponent` sigue usando `finalizeSale()`.

## Confirmaciones de alcance

- Solo se movio la UI de pagos.
- El bloque de pagos dejo de mostrarse inline en pantalla principal.
- Comprobante sigue visible en pantalla principal.
- Tipo de comprobante sigue visible en pantalla principal.
- Serie sigue visible en pantalla principal.
- DNI, nombre cliente, RUC, razon social y direccion fiscal siguen visibles en pantalla principal.
- No se creo `PosReceiptTypeSelectorComponent`.
- No se creo `PosCustomerDocumentFormComponent`.
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
| Historial inicial | `git log --oneline -7` | POS-B1 `f0c785f`, POS-B2 `de737c5`, POS-B2.5 `6234ab2`, POS-C1 `febb8b6` y POS-D1 `e4aab2f` presentes. |
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
- Confirmar que el bloque de pagos ya no esta inline en pantalla principal. PASS.
- Confirmar que comprobante sigue visible en pantalla principal. PASS.
- Abrir modal con Cobrar. PASS.
- Confirmar que pagos aparecen dentro del modal. PASS.
- Cambiar metodo de pago. PASS.
- Cambiar monto recibido. PASS.
- Revisar total pagado. PASS.
- Revisar vuelto. PASS.
- Agregar/quitar linea de pago. PASS.
- Cerrar modal. PASS.
- Confirmar que pagos no se pierden. PASS.
- Reabrir modal. PASS.
- Confirmar que los pagos se conservan. PASS.
- Confirmar que comprobante no se movio al modal. PASS.
- Confirmar que DNI/RUC/razon social no se movieron al modal. PASS.
- Confirmar que no se cambio flujo de venta. PASS.
- No confirmar venta real. PASS.

## Riesgos residuales

- Validacion automatizada de tests sigue limitada por la configuracion actual de Angular CLI.
- Smoke runtime no fue ejecutado desde OpenCode por falta de navegador interactivo.
- Comprobante aun permanece en pantalla principal por alcance deliberado de D2; moverlo queda para D3.
- El boton principal de pantalla principal conserva las validaciones existentes, incluido bloqueo por error de comprobante.

## Recomendacion de siguiente fase

Continuar con POS-D3 para mover solo la UI de comprobante y datos de cliente al checkout modal, manteniendo estado y handlers en `PosPageComponent`.

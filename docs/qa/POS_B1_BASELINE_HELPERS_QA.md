# POS-B1 Baseline Helpers QA

## Objetivo

Establecer baseline QA del POS y ejecutar una primera extraccion segura de modelos UI y helpers puros de calculo/normalizacion, sin cambios funcionales ni visuales.

## Alcance

- Frontend Angular ERP/POS.
- Modulo `features/sales`.
- Refactor interno de `pos-page.component.ts` para delegar tipos y calculos puros.
- Documentacion QA de la fase.

## Archivos modificados

- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/data/pos-ui.models.ts`
- `frontend/src/app/features/sales/utils/pos-calculations.ts`
- `docs/qa/POS_B1_BASELINE_HELPERS_QA.md`

## Modelos extraidos

- `PosCartItem`
- `PaymentLine`
- `PosReceiptType`

## Helpers extraidos

- `normalizePosNumber`
- `normalizePosQuantity`
- `calculatePosLineSubtotal`
- `calculatePosLineTotal`
- `calculatePosSubtotal`
- `calculatePosDiscountTotal`
- `calculatePosTotal`
- `calculatePosPaidTotal`
- `calculatePosChange`

## Confirmaciones de alcance

- No cambio la UX ni el layout visual del POS.
- No se movio pagos/comprobante.
- No se creo checkout modal.
- No se extrajeron componentes presentacionales.
- No se toco backend.
- No se cambiaron endpoints.
- No se cambiaron contratos ni payloads.
- No se crearon migraciones.
- No se toco infraestructura.
- No se toco Storefront/ecommerce.

## Comandos ejecutados

| Momento | Comando | Resultado |
| --- | --- | --- |
| Antes de modificar | `git status --short` | Sin salida; arbol limpio. |
| Baseline antes de modificar | `npm run build` en `frontend` | PASS. Bundle generado correctamente. |
| Despues de modificar | `npm run build` en `frontend` | PASS. Bundle generado correctamente. |
| Despues de modificar | `npm test` en `frontend` | No ejecutado por configuracion: Angular CLI reporto `Unknown arguments: watch, browsers`. |

## Smoke manual

No ejecutado en esta fase. No se levanto servidor local ni entorno runtime POS para evitar acciones operativas o venta real fuera de un entorno seguro preparado.

Checklist pendiente para siguiente fase runtime:

- Abrir POS con caja abierta.
- Buscar producto por nombre.
- Buscar por SKU/barcode si hay datos.
- Usar chip rapido.
- Agregar producto.
- Cambiar cantidad.
- Aplicar descuento.
- Quitar producto.
- Cancelar venta.
- Revisar totales.
- Revisar pagos.
- Revisar comprobante ticket interno.
- No confirmar venta real salvo entorno seguro de prueba.

## Riesgos residuales

- Los tests automatizados frontend no quedaron validados por configuracion actual del script `npm test`.
- No hubo smoke manual runtime; la validacion funcional queda limitada a build y refactor interno sin cambios de template.
- El POS sigue siendo un componente grande; esta fase solo prepara una separacion mas segura para fases posteriores.

## Recomendacion de siguiente fase

Continuar con POS-B2: extraer componentes presentacionales de bajo riesgo, empezando por bloques sin contrato propio como resultados, carrito item y resumen de totales, manteniendo el estado canonico en `PosPageComponent`.

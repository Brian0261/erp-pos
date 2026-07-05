# POS Cart Density And Hierarchy Polish QA

## Fase

POS cart density and hierarchy polish.

## Resultado

PASS.

## Archivos Modificados

- `frontend/src/app/features/sales/components/pos-cart-item.component.ts`
- `frontend/src/app/features/sales/components/pos-cart-panel.component.ts`
- `frontend/src/app/features/sales/components/pos-full-cart-modal.component.ts`

## Resumen

- Panel lateral `Carrito` mas compacto, con nombre de producto dominante y metadata secundaria legible.
- Fila operativa inferior con `Cant.`, `Dscto.`, `SUBTOTAL` y `Quitar` alineada de forma estable.
- `Cancelar venta` y `Quitar` con menor peso visual, sin cambiar textos ni handlers.
- Modal `Carrito completo` alineado visualmente con el panel, con lectura mas tabular pero sin forzar una sola linea rigida.
- Microajuste final: se elimino la compensacion manual que empujaba `SUBTOTAL` hacia abajo y se estabilizo la alineacion con `align-self` / `align-content` centrados.

## Diagnostico Del Desfase

- El desfase entre `SUBTOTAL` y `Quitar` se debia a `padding-top` extra en el bloque de subtotal combinado con autoalineacion a `end`.
- La solucion fue eliminar esa compensacion manual y centrar la alineacion del subtotal, del boton `Quitar` y de los campos auxiliares.

## Contratos E2E Preservados

- `Carrito vacío`
- `Quitar`
- `Cancelar venta`
- `Ver carrito completo`
- `.cart-item`
- `.quantity-stepper`
- Orden de inputs numericos: cantidad primero, descuento segundo
- Dialogo `Carrito completo`
- `Total actual`
- `Cerrar`

## Validaciones

- `npm run build`: PASS.
- `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write`: PASS.
- `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write:headed`: PASS.
- `git diff --check`: sin errores, solo advertencias LF -> CRLF.

## Alcance

- No se toco backend, DB, Auth/JWT, guards, rutas, caja real, ventas transaccionales, stock real, comprobantes, layout global, sidebar ni Storefront.
- No se toco la logica funcional del carrito ni el flujo de cobro.

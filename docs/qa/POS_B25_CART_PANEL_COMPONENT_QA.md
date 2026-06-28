# POS-B2.5 Cart Panel Component QA

## Objetivo

Extraer el panel principal del carrito del POS como componente standalone presentacional, manteniendo sin cambios el comportamiento funcional y visual actual.

## Alcance

- Frontend Angular ERP/POS.
- Trabajo limitado a `frontend/src/app/features/sales`.
- Extraccion acotada de `PosCartPanelComponent`.
- Sin cambios de backend, contratos, payloads, checkout ni reordenamiento UX.

## Componente extraido

- `PosCartPanelComponent`

El componente renderiza el bloque visual del carrito principal y reutiliza `PosCartItemComponent`. Recibe datos por `@Input` y emite acciones por `@Output`; no llama servicios, no persiste draft, no navega y no conoce contratos backend.

## Archivos modificados

- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/components/pos-cart-panel.component.ts`
- `docs/qa/POS_B25_CART_PANEL_COMPONENT_QA.md`

## Confirmaciones de alcance

- La UI no cambio.
- Pagos/comprobante no se movieron.
- Datos de cliente/DNI/RUC/razon social no se movieron.
- Confirmacion final no se movio.
- No se creo checkout modal.
- Fase C no se inicio.
- Backend no fue tocado.
- Endpoints, contratos y payloads no cambiaron.
- No se crearon migraciones.
- No se toco infraestructura.
- No se toco Storefront/ecommerce.
- No se corrigio `npm test` en esta fase.
- No se hizo commit, push ni tag.

## Smoke Manual

OpenCode intento ejecutar el smoke runtime, pero quedo bloqueado por falta de interaccion de navegador en esta sesion.

El usuario valido manualmente el POS en navegador con resultado PASS.

Validaciones manuales realizadas:

- Carga correcta del ERP/POS.
- Login ADMIN o CAJERO correcto.
- Pantalla Punto de venta / POS correcta.
- Carrito vacio visible.
- Busqueda por nombre correcta.
- Busqueda por SKU/barcode correcta si habia dato disponible.
- Chip rapido correcto si habia coincidencias disponibles.
- Agregar producto al carrito correcto.
- Agregar multiples productos correcto.
- Cambiar cantidad correcto.
- Aplicar descuento correcto.
- Quitar producto correcto.
- Subtotales y total correctos.
- "Ver carrito completo" correcto.
- Modal de carrito completo abre y cierra correctamente.
- Pagos/comprobante siguen en el mismo lugar.
- Checkout modal no existe.
- Fase C no iniciada.
- No se confirmo venta real.

## Comandos ejecutados

| Momento | Comando | Resultado |
| --- | --- | --- |
| Estado inicial | `git status --short` | Sin salida; arbol limpio. |
| Historial inicial | `git log --oneline -5` | POS-B1 y POS-B2 presentes: `f0c785f`, `de737c5`. |
| Baseline | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm test` en `frontend` | Limitacion conocida: Angular CLI reporto `Unknown arguments: watch, browsers`. |

## Riesgos residuales

- La validacion automatizada sigue limitada porque `npm test` no corre por configuracion actual del script.
- OpenCode no pudo ejecutar el smoke runtime por falta de navegador interactivo en esta sesion.
- El componente padre sigue concentrando busqueda, pagos, comprobantes, venta, emision electronica y draft.
- Los estilos del panel se duplicaron localmente para preservar el render con encapsulacion Angular.

## Recomendacion de siguiente fase

Continuar con Fase C solo cuando se autorice explicitamente: reordenamiento UX de pantalla principal para dar mas espacio al carrito, sin mover todavia pagos/comprobante a checkout salvo una fase posterior dedicada.

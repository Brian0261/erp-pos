# POS-B2 Presentational Components QA

## Objetivo

Reducir tamaño y acoplamiento de `pos-page.component.ts` mediante extraccion acotada de componentes presentacionales de bajo riesgo, manteniendo sin cambios el comportamiento funcional y visual del POS.

## Alcance

- Frontend Angular ERP/POS.
- Trabajo limitado a `frontend/src/app/features/sales`.
- Extraccion de componentes standalone presentacionales.
- Sin cambios de backend, contratos, payloads ni layout UX.

## Componentes extraidos

- `PosTotalsSummaryComponent`
- `PosCartItemComponent`

## Archivos modificados

- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/components/pos-totals-summary.component.ts`
- `frontend/src/app/features/sales/components/pos-cart-item.component.ts`
- `docs/qa/POS_B2_PRESENTATIONAL_COMPONENTS_QA.md`

## Confirmaciones de alcance

- La UI del POS no cambio.
- Pagos/comprobante no se movieron.
- No se creo checkout modal.
- No se extrajo `PosCartPanelComponent` para evitar mover logica del panel en esta fase.
- Backend no fue tocado.
- Endpoints, contratos y payloads no cambiaron.
- No se crearon migraciones.
- No se toco infraestructura.
- No se toco Storefront/ecommerce.
- No se corrigio `npm test` en esta fase.

## Comandos ejecutados

| Momento | Comando | Resultado |
| --- | --- | --- |
| Estado inicial | `git status --short` | Sin salida; arbol limpio. |
| Historial inicial | `git log --oneline -3` | Ultimo commit confirmado: `f0c785f refactor(pos): extract calculation helpers and ui models`. |
| Baseline | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm run build` en `frontend` | PASS. |
| Post-cambio | `npm test` en `frontend` | Limitacion conocida: Angular CLI reporto `Unknown arguments: watch, browsers`. |

## Smoke manual

No ejecutado en esta fase. No se levanto runtime local del POS ni se confirmo venta real fuera de un entorno seguro preparado.

Checklist pendiente para siguiente fase runtime:

- Abrir POS con caja abierta.
- Ver carrito vacio.
- Agregar producto.
- Agregar multiples productos.
- Cambiar cantidad.
- Aplicar descuento.
- Quitar producto.
- Revisar subtotales.
- Revisar total.
- Revisar que pagos/comprobante siguen donde estaban.
- No confirmar venta real salvo entorno seguro de prueba.

## Riesgos residuales

- La validacion automatizada sigue limitada porque `npm test` no corre por configuracion actual del script.
- No hubo smoke runtime del POS.
- `PosCartPanelComponent` sigue dentro de `PosPageComponent`; el panel completo continua acoplado a estado y acciones del padre.
- La duplicacion local de estilos en componentes hijos debe mantenerse alineada con `pos-page.component.ts` en futuras fases visuales.

## Recomendacion de siguiente fase

Continuar con POS-C o una subfase B3 pequena segun el riesgo aceptado:

- opcion conservadora: extraer `PosCartPanelComponent` solo si se mantiene como contenedor presentacional del listado/acciones sin mover logica de negocio;
- opcion roadmap UX: iniciar reorganizacion visual de pantalla principal con mas espacio para carrito, manteniendo pagos/comprobante en su lugar por ahora.

# QA-FE-RISK-1A — Conciliación monetaria del carrito POS

Fecha de cierre funcional: 2026-10-10. El CI funcional fue satisfactorio; el
cierre formal depende de que también pase el CI del commit documental.

## Defecto y reproducción

Se reprodujo una diferencia entre la suma de netos por línea y el total del
carrito al reducir la cantidad de una línea que tenía un descuento superior al
nuevo subtotal efectivo.

Escenario original:

| Línea | Precio unitario | Cantidad inicial | Descuento inicial | Neto inicial | Estado final al bajar A a 1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Producto A | S/ 10.00 | 2 | S/ 15.00 | S/ 5.00 | cantidad 1, descuento S/ 10.00, neto S/ 0.00 |
| Producto B | S/ 5.00 | 1 | S/ 0.00 | S/ 5.00 | cantidad 1, descuento S/ 0.00, neto S/ 5.00 |

Al reproducir la reducción de cantidad, antes de la corrección, se observó una
diferencia de S/ 5.00 entre importes de línea y total agregado. La causa fue la
aplicación inconsistente del descuento entre la línea y el cálculo agregado
tras cambiar cantidad. Tras reconciliar la línea A, netos y total suman
S/ 5.00 y la diferencia es S/ 0.00.

## Corrección y límites

- El descuento se limita a `0..subtotal efectivo` de la línea editada, sin
  modificar descuentos de otros productos.
- El límite de stock se aplica antes de reconciliar descuento; se persisten
  ambos valores efectivos juntos.
- Al restaurar un borrador legado, los descuentos negativos, no finitos o
  superiores al subtotal se normalizan y el estado reparado se persiste.
- Con stock cero no se elimina la fila ni se acepta una cantidad inválida; el
  checkout permanece bloqueado.
- Un aviso accesible comunica ajustes sin sobrescribir mensajes de error o
  advertencias críticas, también en «Carrito completo».
- Los importes se validan antes de confirmar y nuevamente después de la
  confirmación asíncrona.
- Se conserva el payload actual de venta y sus contratos HTTP. No hubo cambio
  backend, persistencia del servidor ni de reglas fiscales.

## Evidencia de pruebas local

Evidencia local previamente aprobada y reutilizada durante el cierre, sin
repetición de QA:

- Spec de reproducción original más siete escenarios adicionales: **8/8 PASS**.
- Suite unitaria Angular: **22/22 PASS**.
- Build Angular: **PASS**.
- E2E focal de concurrencia de series: **6/6 PASS**.
- E2E no-write: **1 PASS, 2 SKIPPED** por falta de credenciales QA verificadas.
  Los dos casos omitidos no se cuentan como aprobados.
- `git diff --check`: **PASS**, con warnings informativos de normalización
  LF/CRLF en Windows.
- Sin operaciones comerciales reales ni requests HTTP inesperados.
- Escenario final: neto A S/ 0.00 + neto B S/ 5.00 = total S/ 5.00; diferencia
  S/ 0.00.

## Revisión y commit funcional

- Preflight: `master`, HEAD y `origin/master`
  `0a7f7262668738619d82fa62ae8d08d60c146871`, ahead/behind `0/0`, sin tag.
- Los únicos cambios eran los dos componentes POS y el nuevo spec de
  reproducción/regresión. Ocho tests `it` activos; no se detectaron `xit`,
  `fit` ni markers de tests pendientes.
- Commit funcional: `6fff339c9afb5f1355c8050a61725337d294b8ef`
  (`fix(pos): reconcile discounts after quantity changes`). Push normal a
  `origin/master` satisfactorio. Sin reescritura de historial ni tag.

## CI funcional remoto

- Workflow [`ci` #38071154879](https://github.com/Brian0261/erp-pos/actions/runs/38071154879).
- Evento `push`, rama `master`, SHA exacto
  `6fff339c9afb5f1355c8050a61725337d294b8ef`, estado `completed`, conclusión
  `success`.
- Frontend: instalación PASS; unitarios **22/22 PASS**; build PASS; E2E focal
  de series **6/6 PASS**.
- Backend: job `backend` PASS; `./mvnw -B clean verify`, **642 tests, 0
  failures, 0 errors, 0 skipped**, `BUILD SUCCESS`.
- Esta evidencia solo corresponde al commit funcional. El cierre formal de
  QA-FE-RISK-1A requiere también verificar el workflow `ci` del commit
  documental; su resultado no se anticipa aquí.

## Riesgos pendientes — fuera de alcance

Esta corrección no valida ni resuelve:

- consistencia del vuelto y pagos mixtos;
- precisión decimal y política general de redondeo;
- cantidades fraccionarias;
- revaloración de precios;
- reglas fiscales y comprobantes.

No declarar estos temas resueltos. Deben tener análisis y autorización
separados antes de cualquier cambio.

## Cierre

La corrección monetaria POS tiene **CI funcional satisfactorio**. El cierre
formal sigue pendiente hasta que el commit documental sea publicado y su
workflow `ci` termine `completed / success`, seguido de verificación de Git
limpio y sincronizado. No se inicia QA-FE-2, 4D-2C ni otra fase en este
documento.

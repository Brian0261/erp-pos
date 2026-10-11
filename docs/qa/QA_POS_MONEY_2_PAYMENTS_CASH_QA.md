# QA-POS-MONEY-2 — Pagos mixtos, vuelto y conciliación de caja

Estado funcional: **PASS remoto**. El cierre formal requiere publicar esta
actualización documental y verificar el CI del commit documental.

## Alcance y resultado

Se corrigió la conciliación entre pagos mixtos, saldo pendiente, vuelto y
efectivo neto esperado en caja. El backend valida que el efectivo recibido
cubra el saldo pendiente, limita el vuelto al efectivo recibido y concilia el
efectivo neto de caja sin contabilizar el vuelto como ingreso. No se establece
una política monetaria general de redondeo.

El cambio funcional se limitó a los diez archivos autorizados de backend,
frontend y pruebas. No se alteraron migraciones ni se realizaron ventas,
cobros, cierres o movimientos de caja reales.

## Evidencia de QA local reutilizada

La evidencia local previamente aprobada se reutilizó durante el cierre; no se
repitieron pruebas:

- Backend focal: **43/43 PASS**.
- `PosMoneyIntegrationTest`: **11/11 PASS** en PostgreSQL/Testcontainers.
- Frontend focal: **18/18 PASS**.
- Suite unitaria Angular: **32/32 PASS**.
- Build Angular: **PASS**.
- E2E focal: **6/6 PASS**.
- Backend `./mvnw clean test`: **664/664 PASS**.
- E2E no-write: **1 PASS, 2 SKIPPED** por falta de credenciales QA verificadas.
  Los casos omitidos no se cuentan como aprobados.

La integración utilizó PostgreSQL 16 aislado con Testcontainers y datos
sintéticos. Verificó persistencia ordenada de pagos, conciliación, rechazos sin
escrituras parciales en pagos/stock/movimientos y rollback tras una respuesta
simulada válida. Sin tráfico u operaciones de negocio reales.

## Commit funcional y CI remoto

- Base: rama `master`, `HEAD == origin/master ==
  e69bae8ffc822af47055f3702c0a22007d1e3bfc`; árbol inicialmente limpio salvo
  los diez archivos autorizados; sin tag.
- Commit funcional: `b2e4f2fc27f21ce39dd926886057cc3a7405603e` —
  `fix(pos): reconcile mixed payments, change and cash closing`.
- Push normal a `master`, sin amend, rebase, force push ni tag.
- Workflow [`ci` #38102775218](https://github.com/Brian0261/erp-pos/actions/runs/38102775218):
  evento `push`, rama `master`, SHA exacto, `completed / success`.
- Backend: `./mvnw -B clean verify`, **664 tests**, 0 failures, 0 errors,
  0 skipped; `BUILD SUCCESS`. `PosMoneyIntegrationTest`: **11 tests**, 0
  failures, 0 errors, 0 skipped.
- Frontend: unitarios **32/32 PASS**, build **PASS**, E2E focal de series
  **6/6 PASS**.

## Riesgos pendientes y límites

Esta fase no valida ni resuelve la política monetaria general de redondeo,
cantidades fraccionarias, revaloración de precios, impuestos, reglas fiscales
ni comprobantes. Estos puntos requieren análisis y autorización separados.

## Cierre formal

El commit funcional y su CI están satisfactorios. La fase solo puede declararse
formalmente cerrada después de publicar la actualización documental autorizada
y comprobar que el workflow `ci` del SHA documental termina `completed / success`,
con `master` sincronizada, working tree limpio y sin tag. No iniciar QA-FE-2,
4D-2C ni otra fase dentro de este documento.

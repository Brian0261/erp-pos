# 4D-2B-2 Angular concurrency-token adoption QA

## Alcance

Subfase frontend-only para adoptar `version` y `ETag` en la administración de
series tributarias. No modifica backend, contratos REST existentes, seguridad,
POS, caja, stock, fiscal provider ni infraestructura.

## Cambios verificados

- `BillingSeriesResponse` expone `version` como dato de solo lectura.
- `BillingSeriesService` centraliza el formato `"billing-series-{id}-v{version}`.
- `getById`, `update` y `deactivate` observan la respuesta completa y capturan
  el header `ETag` junto con el body.
- `update` y `deactivate` envían exactamente un header `If-Match`.
- La pantalla deriva el token desde la fila cargada; no hace un GET adicional
  antes de mutar ni duplica el formato del ETag.
- `412 Precondition Failed` detiene la operación, no muestra éxito, invalida
  el formulario/token obsoleto y recarga la lista una sola vez.
- No existe reintento automático ni cambio optimista de filas.

## Validación

- `npm run build`: PASS.
- Playwright focal con APIs completamente simuladas: **3 passed**.
  - actualización obsoleta;
  - desactivación obsoleta;
  - reactivación obsoleta.
- Cada caso verificó una sola mutación, `If-Match` basado en `id + version`,
  respuesta `412`, ausencia de mensaje de éxito y una sola recarga.
- No existe runner unitario Angular configurado en `frontend` (no hay target
  `test` ni dependencias Karma/Jasmine); por ello la cobertura ejecutable de
  esta subfase se mantiene en el E2E focal simulado y el build.

## Exclusiones

- No se modificó backend ni se agregaron migraciones.
- No se modificaron interceptores JWT, guards ni permisos.
- No se inició 4D-2B-3 ni 4D-2C.
- No se hizo commit, push ni tag.

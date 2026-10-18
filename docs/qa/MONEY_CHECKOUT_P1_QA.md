# MONEY-CHECKOUT-P1 — cierre QA local

**Resultado: PASS_LOCAL — MONEY_CHECKOUT_P1_DOCS_READY.** P1-A, P1-B y la
corrección UX final se validaron localmente según la evidencia previa indicada
abajo. Este documento consolida esos resultados; no ejecuta ni repite QA. No
equivale a integración en `master`, CI remoto, revisión, merge o autorización de
producción.

## Estado y alcance

- Rama `feat/money-checkout-p1`; base `0548931f01239735c6fad58da4ed4710cfca51fb`.
- La implementación cubre precisión decimal del checkout Angular, confirmación
  de precio/total, checkout backend transaccional, conversión confirmada de
  cotizaciones y deduplicación persistente de operaciones con V27.
- La copia adaptada del test backend de MONEY-QA-0 permanece separada de los
  originales; respaldos y Angular D original se preservan y Angular D queda
  excluido del alcance de integración.

## Contrato y garantías documentadas

- Las solicitudes de venta incluyen `operationId`, `confirmedTotal` y
  `confirmedUnitPrice` por línea. La API backend revalida los importes contra
  datos actuales autoritativos; no confía en los importes calculados por el
  cliente.
- Campos confirmatorios requeridos ausentes o inválidos: HTTP 400. Precisión
  comercial no admitida: HTTP 422. Cambio de precio que requiere reconfirmación:
  HTTP 409 con código `PRICE_CONFIRMATION_REQUIRED` y datos de comparación.
  La interfaz muestra la diferencia para revisión explícita y permite confirmar
  una nueva solicitud; no confirma silenciosamente el precio nuevo.
- La operación de checkout realiza validación y escrituras comerciales dentro
  de una transacción: no debe dejar una venta parcialmente creada si falla una
  validación o escritura participante. Los registros de inventario, pagos y
  venta usan el límite transaccional de checkout implementado.
- V27 agrega una identidad persistente por actor autenticado y `operationId`,
  vinculada a un hash canónico del contenido. Un reintento idéntico recupera el
  resultado existente; el mismo ID con contenido distinto genera conflicto.
  Si una purga elimina la venta, se conserva un tombstone y no se permite
  reutilizar la identidad para crear otra venta.
- La conversión de cotización envía los precios/cantidades/descuentos
  confirmados. El backend bloquea y valida la cotización y transforma la
  operación en checkout transaccional; no se debe tratar el precio propuesto
  anteriormente como autorización de precio vigente.
- El cliente conserva la identidad pendiente para reintentar la misma
  operación tras una respuesta incierta. Si se pierde el almacenamiento local
  del navegador, esta experiencia no ofrece recuperación administrativa
  automática; un tombstone requiere gestión administrativa.

## Evidencia local previamente obtenida

Los resultados siguientes se reutilizan de las ejecuciones anteriores; no se
volvieron a ejecutar durante este cierre documental.

| Etapa | Evidencia reportada |
|---|---|
| P1-A | Angular: 59 PASS; build PASS; reproducción D PASS. |
| P1-B | Backend focal: 147 PASS; Angular: 90 PASS; validación V27/Flyway con PostgreSQL aislado PASS; build PASS; E2E autenticado no-write aislado PASS. |
| Corrección UX final | Angular: 57 PASS, incluidos 12 nuevos; build PASS; `git diff --check` PASS. Comparación con 1, 5 y 100 productos y viewports 1366x768, 1024x768, 390x844 y 683x384: PASS. |

Los conteos pertenecen a etapas y ejecuciones diferentes: no deben sumarse como
una única suite, ni presentarse como cobertura integral de todo el ERP/POS.
No se hizo validación visual manual ni prueba del zoom nativo del navegador; no
se probó en producción.

## Límites y riesgos residuales

- El despliegue debe coordinar frontend, backend y V27. Clientes REST antiguos
  que omitan los campos confirmatorios requeridos no son compatibles con el
  nuevo contrato.
- La recuperación de respuesta incierta depende de conservar `operationId` en
  el navegador. La pérdida de esos datos no tiene recuperación administrativa
  automática; una operación tombstone no admite reutilización de identidad.
- La evidencia local no establece resultado de CI remoto, revisión de PR,
  comportamiento de producción ni cierre de GitHub Flow.

## Estado de cierre

`PASS — MONEY_CHECKOUT_P1_DOCS_READY` y `READY_FOR_MONEY_CHECKOUT_P1_COMMIT_APPROVAL`.
Pendientes: aprobación independiente del commit local y, después, los gates
separados de push, PR, CI, revisión y merge. No marcar MONEY-CHECKOUT-P1 como
`CLOSED` ni como lista para producción en esta etapa.

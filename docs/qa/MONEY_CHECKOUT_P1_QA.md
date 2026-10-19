# MONEY-CHECKOUT-P1 — cierre QA local

**Estado vigente: PASS — MONEY_CHECKOUT_P1_FINAL_QA_LOCAL.** La corrección P2
de recuperación de comprobantes y el hardening de vinculación de identidad
también se validaron localmente según la evidencia registrada en esta página.
Este documento consolida resultados de ejecuciones distintas y no las presenta
como una única suite. No equivale a integración en `master`, CI remoto, revisión,
merge o autorización de producción.

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

## Correcciones posteriores y evidencia final local

### Recuperación P2 de comprobantes

La corrección P2 conserva la intención original del comprobante (tipo, serie y
datos del cliente) junto con la operación pendiente. La recuperación consulta
el resultado existente y no reenvía automáticamente la creación de un
comprobante cuyo resultado sea incierto. La validación P2 anterior reportó
104 pruebas PASS; ese conteo corresponde a su propia ejecución y no se suma a
las pruebas finales descritas abajo.

### Hardening correctivo de P1-B

- La credencial se vincula a la solicitud mediante `HttpContextToken`; el
  interceptor valida que la identidad autenticada siga correspondiendo a la
  credencial fijada para esa operación.
- Un cambio de sesión o de usuario detiene la solicitud protegida y preserva
  la operación pendiente para recuperación con su usuario original.
- Los resultados inciertos y las respuestas `401/403` no provocan reenvíos
  automáticos; el estado pendiente se conserva para revisión/recuperación.
- Los mensajes operativos distinguen la venta registrada, el borrador del
  comprobante y su estado electrónico, sin equiparar un documento localizado
  con aceptación fiscal.

### QA final focal de Angular

- `pos-page.component.spec.ts`: 25 PASS, 0 FAIL, 0 SKIPPED.
- Regresión focal integrada de ocho specs: 144 PASS, 0 FAIL, 0 SKIPPED.
- Se conservaron las 127 assertions originales del spec y se añadieron ocho
  comprobaciones específicas del contexto de identidad; las expectations de
  negocio existentes permanecen.
- Build Angular: PASS en la validación anterior ya acreditada; no se repitió
  para esta corrección limitada a pruebas.
- `git diff --check`: PASS, con advertencias informativas de normalización
  LF/CRLF de Windows.

Los resultados de la suite P2, las dos ejecuciones focales y las etapas P1-A,
P1-B y UX pertenecen a corridas diferentes. No deben sumarse ni describirse
como una sola ejecución.

## Límites y riesgos residuales

- El despliegue debe coordinar frontend, backend y V27. Clientes REST antiguos
  que omitan los campos confirmatorios requeridos no son compatibles con el
  nuevo contrato.
- La recuperación de respuesta incierta depende de conservar `operationId` en
  el navegador. La pérdida de esos datos no tiene recuperación administrativa
  automática; una operación tombstone no admite reutilización de identidad.
- La recuperación local de comprobantes depende del almacenamiento del
  navegador y del usuario original. Logout o pérdida del almacenamiento pueden
  impedir retomar directamente la operación; no se ha implementado una
  recuperación durable centralizada.
- Las operaciones inciertas pueden requerir conciliación administrativa y
  seguimiento operativo. La continuidad administrativa ante esos pendientes
  sigue pendiente.
- Las validaciones fiscales productivas, la aceptación fiscal y la integración
  con proveedores reales requieren pruebas y controles independientes; esta
  evidencia no las acredita.
- La evidencia local no establece resultado de CI remoto, revisión de PR,
  comportamiento de producción ni cierre de GitHub Flow.

## Estado de cierre

`PASS — MONEY_CHECKOUT_P1_FINAL_QA_LOCAL`

`READY_FOR_P1_FINAL_CLOSURE`

El inventario local contiene 14 archivos de implementación/pruebas pendientes
(9 modificados y 5 nuevos), además de este documento en la actualización actual.
El staging sigue vacío y las correcciones finales no tienen commit ni push.
Pendientes: autorización independiente para commit; push autorizado de la rama;
checks actualizados del PR #6; revisión y resolución de la conversación P2;
autorización de squash merge; y verificación posterior de `master`.
No marcar MONEY-CHECKOUT-P1 como `CLOSED` ni como `POS READY FOR PRODUCTION` en
esta etapa.

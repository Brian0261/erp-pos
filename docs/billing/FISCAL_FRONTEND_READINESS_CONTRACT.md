# Fiscal Frontend Readiness Contract - Fase 3B-4/3D-A

## Proposito

Definir el contrato de readiness para una futura UI fiscal. 3D-A implementa solo consulta backend de disponibilidad de evidencias, sin tocar frontend.

## Alcance

- 3D-A es backend-only.
- Crea solo `GET /api/v1/billing/documents/{documentId}/evidence-readiness`.
- No modifica frontend.
- No cambia reglas funcionales del backend.

## Matriz de Estados

| Estado | Lectura operativa | Acciones futuras sugeridas |
| --- | --- | --- |
| `DRAFT` | Documento creado desde venta, aun editable por flujo fiscal interno. | `GENERATE_XML`, `VIEW_HISTORY` |
| `GENERATED` | XML generado, listo para firma. | `SIGN`, `VIEW_XML`, `VIEW_HISTORY` |
| `SIGNED` | XML firmado, listo para envio normal. | `SEND`, `VIEW_XML`, `VIEW_HISTORY` |
| `SENT` | Enviado o pendiente de confirmacion externa. | `VIEW_HISTORY`, `VIEW_ATTEMPTS` |
| `ACCEPTED` | Aceptado por el provider. | `VIEW_XML`, `VIEW_HISTORY`, `VIEW_ATTEMPTS` |
| `REJECTED` | Rechazado por el provider. | `VIEW_HISTORY`, `VIEW_ATTEMPTS` |
| `ERROR` | Fallo fiscal interno/provider con posible recuperacion. | `RETRY_SEND` solo si el backend marca elegible; `VIEW_HISTORY`, `VIEW_ATTEMPTS` |
| `CANCELLED` | Comprobante cancelado/bloqueado. | `VIEW_HISTORY`, `VIEW_ATTEMPTS` |

## Reglas de Retry Readiness

- El retry solo se muestra si el backend lo marca elegible.
- La UI no debe inferir elegibilidad solo por `status`.
- `ERROR` recuperable puede mostrar `RETRY_SEND`.
- `ERROR` no recuperable bloquea `RETRY_SEND`.
- `SIGNED` usa envio normal, no retry.
- `SENT/PENDING` bloquea retry.
- `OBSERVED` no es reintentable.
- `ACCEPTED`, `REJECTED` y `CANCELLED` bloquean retry.

## Mensajes Operativos Recomendados

- `ERROR` recuperable: "El envio fallo por una condicion recuperable. Puede reintentarse manualmente."
- `ERROR` no recuperable: "El envio no puede reintentarse. Revise la causa fiscal o de configuracion."
- `SENT/PENDING`: "El comprobante esta pendiente de confirmacion externa. No se reintenta manualmente."
- `ACCEPTED`: "El comprobante fue aceptado por el provider."
- `REJECTED`: "El comprobante fue rechazado. No es reintentable."
- `OBSERVED`: "El comprobante fue aceptado con observaciones. No requiere retry manual."
- `SIGNED`: "Use el envio normal. El retry manual no aplica desde firmado."

## Roles y Permisos Futuros

- `ADMIN`: puede ejecutar retry manual.
- `SUPERVISOR`: puede ejecutar retry manual en LOCAL/BETA; PROD futuro requiere politica adicional.
- `CAJERO`: solo consulta/readiness/historial, sin retry.
- `ALMACENERO`: sin acceso fiscal operativo.

## Auditoria Visible Futura

- `actor`
- `traceId`
- `attemptNumber`
- `operation`
- `result`
- `errorCategory`
- `recoverable`
- `providerStatus`
- `providerMessage` sanitizado
- `startedAt`
- `finishedAt`
- `simulated`

## Evidence Metadata Futura

- El backend ya registra metadata interna de `SIGNED_XML` y `PROVIDER_RESPONSE_METADATA` sin payloads.
- La UI futura puede mostrar si existe XML firmado y si existe metadata provider, sin descargar nada.
- La UI futura puede mostrar si el flujo está simulado en LOCAL/BETA.
- La UI no debe descargar ni renderizar evidencia desde readiness.
- La UI no debe mostrar storage keys tecnicos, rutas locales, secret refs, tokens, certificados ni payloads.
- La UI no debe presentar CDR/PDF/QR como disponibles si solo existe metadata futura.
- La UI no debe habilitar retry desde frontend todavía.
- La UI no debe inferir elegibilidad de retry solo por el estado visual.
- El detalle de evidencias debe venir de un contrato backend futuro y sanitizado.
- 3D-A expone readiness provider-agnostic, no metadata detallada ni contenido.
- `downloadAllowed=false` para todas las evidencias.
- `allowedActions=[]` porque no existe ninguna accion de evidencia operativa.
- `REGISTERED` se calcula conservadoramente como `NOT_READY` sin persistir cambios.
- Un checksum existente no implica integridad `VERIFIED`.
- No se calcula `CORRUPTED` sin evidencia real de fallo de integridad.
- No existe endpoint REST de metadata detallada, descarga ni cambios frontend.
- 3C-4A solo documenta arquitectura de storage futuro; la UI no debe asumir descargas ni disponibilidad fisica.
- Si en el futuro existe storage real, la UI seguira mostrando solo resumen seguro hasta que una API de descarga auditada sea aprobada.

## Datos que Nunca Deben Exponerse

- payloads completos
- XML completo por readiness
- CDR completo por readiness
- headers
- tokens
- passwords
- secret refs
- rutas locales
- certificados
- request/response completos del provider

## Limitaciones Pendientes

- Readiness backend implementado; metadata detallada y descarga siguen diferidas.
- Frontend fiscal UX diferido.
- Attempts read-only endpoint diferido.
- 3C-4B modelo/migracion avanzada diferida.
- 3C-4C puerto + adapters no productivos cerrado.
- 3C-4D-1 filesystem sintetico LOCAL/BETA cerrado y desconectado.
- 3C-4E S3/GCS PROD diferida.
- 3C-4F descarga/API/auditoria diferida.
- V25 y access audit diferidos.
- 3B-3B endpoint REST protegido diferida.
- Polling/consulta real diferido.
- PSE/OSE/SUNAT real diferido.

# VENTAS-RD-0 — hardening de ventas y facturación

## Estado

`PASS_LOCAL`, pendiente de integración Git. No está `MERGED` ni `CLOSED`. Base `74b751e98e4fad3300d7a95148b0c77e1a8dbfb7`. Código, pruebas y documentación están destinados a la misma PR.

## Objetivo y alcance

0A conserva pagos históricos al actualizar y anular ventas. 0B aplica autorización por recurso a lecturas y escrituras documentales. H1 elimina la dependencia del `SecurityContext` posterior al envío externo. Se excluyen migraciones, cambios REST/DTO, frontend, Storefront, reconstrucción de históricos, reenvíos automáticos y validación fiscal productiva.

## Decisiones

### 0A — pagos históricos

La actualización compara el conjunto de pagos existente por identidad y valor antes de modificar cabecera o partidas. Rechaza pagos alterados, añadidos, eliminados o duplicados. Conserva IDs, `createdAt`, importes, métodos y referencias. Los pagos se crean al insertar una venta, sin recrear hijos en actualizaciones.

### 0B — autorización documental

Se combinan control de rol en la operación y control del objeto. Para `CAJERO`, el propietario se determina por `sales.created_by`, no por el creador del comprobante. Roles combinados que incluyan CAJERO mantienen la restricción. Se aplica a listados, detalle, items, XML, historial, evidencia y readiness, además de generación XML, firma y envío según sus permisos. Firmar y enviar requiere `ADMIN` o `SUPERVISOR`.

### H1 — finalización fiscal

Las pruebas sintéticas reprodujeron una denegación al perderse o cambiarse el `SecurityContext` después de llamar al proveedor, aunque la preparación autorizada ya había persistido `SENT/STARTED`. No se observó en producción.

La autorización de inicio comprueba rol y propietario antes de registrar el intento. Luego el orquestador interno pasa a los finalizadores de paquete la preparación durable. Estos correlacionan intento, documento, operación, actor y hash del XML antes de escribir, sin consultar la identidad ambiental posterior. Una finalización contradictoria no sobrescribe el resultado persistido.

## Integridad preservada

Preparación y finalización usan transacciones distintas de la llamada al proveedor. Se preservan bloqueos, rollback, idempotencia, auditoría del actor original, contratos fiscales, caja, stock y datos históricos. No se reconstruyen históricos ni se reenvían automáticamente intentos inciertos.

## QA acreditada

Ejecuciones Maven offline con PostgreSQL aislado de Testcontainers, fixtures sintéticos, ambiente fiscal `LOCAL` y proveedor simulado. Los comandos se ejecutaron desde `backend` en PowerShell.

| Ejecución | Comando | Resultado |
|---|---|---|
| 0A y consultas 0B | `.\mvnw.cmd -o -B '-Dtest=VentasRd0PaymentHistoryIntegrationTest,VentasRd0DocumentReadAuthorizationIntegrationTest' test` | 25 pruebas; 0 fallos; PASS |
| Regresión anterior a H1 | `.\mvnw.cmd -o -B '-Dtest=SalesApplicationServiceTest,BillingApplicationServiceTest,PosMoneyIntegrationTest,SaleItemIdentitySnapshotIntegrationTest,PosRecoveryCoordinationIntegrationTest,BillingEvidenceReadinessIntegrationTest' verify` | 233 pruebas; 0 fallos; PASS |
| Reproducción sintética H1 | `.\mvnw.cmd -o -B '-Dtest=FiscalPostSendContextIntegrationTest' test` | 6/6 fallos esperados antes de corregir |
| H1 corregido | `.\mvnw.cmd -o -B '-Dtest=FiscalPostSendContextIntegrationTest' test` | 17 pruebas; 0 fallos; PASS |
| Regresión focal posterior | `.\mvnw.cmd -o -B '-Dtest=BillingApplicationServiceTest,VentasRd0DocumentWriteAuthorizationIntegrationTest,FiscalSendTransactionBoundaryIntegrationTest,VentasRd0DocumentReadAuthorizationIntegrationTest' verify` | 177 pruebas; 0 fallos; empaquetado PASS |

Los resultados corresponden a ejecuciones separadas, con casos repetidos entre ejecuciones, y no se suman como casos únicos. H1 se reprodujo solo con pruebas sintéticas, no en producción. Los logs en `backend/target` son evidencia local, no enlaces públicos. No hay CI remoto ni proveedor fiscal real acreditado.

## Riesgos y límites

Un fallo de persistencia posterior al efecto externo todavía puede dejar `SENT/STARTED`. Ese estado requiere reconciliación conservadora y no habilita reenvío ciego. No se acredita despliegue productivo. La evidencia aplica a la base Git indicada.

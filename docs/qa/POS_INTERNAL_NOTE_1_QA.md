# POS-INTERNAL-NOTE-1A — snapshots de identidad y lectura aditiva

Fecha: 2026-10-27. Resultado: **PASS — A_READY_FOR_REVIEW** (local).
Base: `master`, `4756669c69f4f974fe46a8e37956be337ed78501`; HEAD sin cambios.
Este resultado no cierra la fase ni autoriza staging, commit, push, PR, merge o despliegue.

## Alcance implementado

- `SaleItem` agrega nombre/SKU capturados y conserva el constructor anterior para históricos/callers existentes.
- `SalesApplicationService.create` copia exclusivamente `name` y `sku` de la proyección que checkout ya obtiene bajo lock.
  No agrega consultas ni cambia validaciones, orden de locks, importes, hash, identidad o transacción.
- Entidad y mapper insertan los snapshots una sola vez. `mergeItem` no los reemplaza y las columnas ORM tienen `updatable=false`.
- V29 agrega `product_name_snapshot VARCHAR(180) NULL` y `sku_snapshot VARCHAR(60) NULL`, sin default ni backfill.
- `SaleItemResponse` añade `productNameSnapshot: string|null`, `skuSnapshot: string|null` y `quantityText: string`.
  El último utiliza exclusivamente `BigDecimal.toPlainString()`. Los campos anteriores mantienen tipo y semántica;
  `productName`, `sku` y `barcode` continúan siendo el enriquecimiento actual cuando corresponde.
- La ampliación se aplica a las respuestas que reutilizan el DTO existente; no hay rutas nuevas ni cambios de autorización.
- Los históricos conservan snapshots nulos. No se reconstruye identidad original desde el catálogo.

## Restricción compatible con datos históricos

V3 y `ProductEntity` requieren nombre/SKU no nulos y permiten longitudes 180/60. La API de catálogo exige
`NotBlank`, pero SQL admite cadenas vacías/espacios y checkout no introduce esa validación de identidad.
Por ello V29 exige únicamente coherencia de nulabilidad de la pareja; no añade `trim` ni un CHECK de no vacío.
Esto evita rechazar productos históricos que el flujo previo acepta y conserva literalmente lo capturado.
No se agregan restricciones, campos ni snapshots de otros atributos.

## Entorno y aislamiento

- Java 17.0.18; Maven wrapper del repositorio; Spring Boot 3.5.14.
- PostgreSQL **16.14**, imagen `postgres:16-alpine`, Testcontainers efímeros con puertos aleatorios.
- Integración: datasource y Flyway se vinculan al contenedor del soporte HTTP existente.
- Migración: contenedor propio `withReuse(false)`, etiqueta `inktoy.qa.scope=pos-internal-note-1a`.
- Datos y actores exclusivamente sintéticos/seed del contenedor. Sin bases compartidas, `.env`, clientes o producción.
- Spring/MockMvc no inicia un servidor operativo. No se ejecutan Docker Compose ni llamadas a proveedores.
- Inventario Testcontainers anterior/posterior idéntico; el contenedor preexistente no se modificó ni retiró.

## Comandos y resultados

Ejecutados desde `backend`, con `JAVA_HOME` del proceso apuntando al JDK 17 indicado. Sin `clean`, para conservar
artefactos/evidencia anteriores de `target`; el compilador recompiló los cambios y los tests seleccionados.

1. `./mvnw.cmd "-Dtest=SaleItemIdentitySnapshotIntegrationTest,SaleItemIdentitySnapshotMigrationTest" verify`
   - Exit 1: 25 ejecutadas, 24 PASS, 0 FAIL, 1 ERROR, 0 SKIPPED.
   - Error del montaje del spy de concurrencia: stubbing atravesó el proxy `MANDATORY` sin transacción.
   - Corrección solo de esa prueba: `AopTestUtils.getUltimateTargetObject`, patrón ya existente en el repositorio.
   - Migración: 1 PASS; su fuente y el código funcional no cambiaron después. Evidencia reutilizada.
2. `./mvnw.cmd "-Dtest=SaleItemIdentitySnapshotIntegrationTest" verify`
   - Exit 0, **BUILD SUCCESS**, 24 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED; 28.414 s de Maven.
   - Incluye la concurrencia corregida; no se modificó código funcional para acomodar la prueba.

Evidencia final consolidada: **25 casos distintos PASS; 0 FAIL/ERROR/SKIPPED pendientes**.
No se suman intentos repetidos. No es una ejecución de la suite backend completa ni CI remoto.

| Evidencia válida | PASS | FAIL | ERROR | SKIPPED |
| --- | ---: | ---: | ---: | ---: |
| `SaleItemIdentitySnapshotIntegrationTest` — segunda ejecución | 24 | 0 | 0 | 0 |
| `SaleItemIdentitySnapshotMigrationTest` — primera ejecución, reutilizada | 1 | 0 | 0 | 0 |

Artefactos locales ignorados, no publicados:

- `backend/target/note-1a-verify.log` (primer intento y migración válida).
- `backend/target/note-1a-integration-verify.log` (verify focal final).
- `backend/target/surefire-reports/TEST-com.erppos.backend.integration.SaleItemIdentitySnapshotIntegrationTest.xml`.
- `backend/target/surefire-reports/TEST-com.erppos.backend.integration.SaleItemIdentitySnapshotMigrationTest.xml`.

## Cobertura nueva acreditada

| Escenario | Casos | Evidencia/resultado |
| --- | ---: | --- |
| Venta, cambio posterior de nombre/SKU y replay | 1 | Identidad original intacta; enriquecimiento actual conserva su significado; hash/efectos iguales; un solo lockCatalog |
| Conversión de cotización | 1 | Captura identidad al convertir mediante checkout compartido, no al crear cotización; una venta |
| Anulación y replay posterior | 1 | Mismas líneas, snapshots e importes; sin duplicar efectos del replay |
| Lectura/anulación histórica fraccionaria | 1 | `0.125` y snapshots nulos preservados; lectura sin escrituras |
| Rollback posterior a persistir líneas | 1 | Se observan dos snapshots dentro de la transacción; fallo posterior revierte líneas, pagos, stock y movimientos; PREPARED/hash conservados |
| Edición concurrente de catálogo | 1 | `pg_blocking_pids` identifica al checkout como blocker del editor; tras commit catálogo cambia, snapshots no |
| Vacío, espacios y longitudes máximas | 3 | No aparecen nuevas reglas de producto; valores exactos capturados, incluidos nombre de 180 caracteres y SKU de 60 |
| Inmutabilidad ORM | 1 | Intentos de sobrescribir identidad capturada o completar identidad histórica nula no se persisten |
| GET y caja cerrada | 1 | Mismos campos previos/tipos y enriquecimiento actual; tres adiciones correctas; pagos/vuelto originales; lectura sin efectos |
| Cantidad exacta de lectura | 6 | `1.000`, `1.250`, `0.125`, `0.001`, `1000.000`, `9999999999999.999`; string igual al valor SQL, quantity sigue siendo número |
| Permisos y cache-control | 7 | ADMIN, SUPERVISOR y propietario 200; cajero ajeno 422; ALMACENERO 403; anónimo 401; inexistente 404; todos no-store |
| V28→V29 | 1 | Solo una migración aplicada, 29 validadas; filas previas e importes idénticos; históricos nulos; sin tablas nuevas |

El extremo de cantidad es un fixture SQL histórico de lectura; no afirma que checkout actual acepte tres decimales.
V29 también verifica rechazo de parejas parciales (23514), longitudes excesivas (22001) y aceptación de vacío/espacios.
La matriz de seguridad comprueba que los errores no incluyen items, pagos ni snapshots.
Las pruebas de rollback y concurrencia son nuevas y específicas de la captura; no repiten campañas monetarias o recuperación A.

## Diff e inventario

- Seis archivos funcionales existentes modificados: dominio `SaleItem`, entidad `SaleItemEntity`, `SaleMapper`,
  `SalesApplicationService`, DTO `SaleItemResponse` y `SalesController`.
- Cuatro archivos nuevos: V29, las dos clases focales anteriores y este documento.
- Sin cambios a otros archivos funcionales, frontend, dependencias, seguridad global, infraestructura o migraciones anteriores.
- `git diff --check`: sin errores; aviso de normalización LF→CRLF del DTO, sin cambio funcional.
- Staging vacío; sin operaciones Git de escritura, ramas/worktrees nuevos ni despliegues.

## Límites y siguiente gate

Los snapshots faltantes no se pueden recuperar retroactivamente. La protección de actualización es del ORM/flujo;
no se introduce un trigger que impida cambios SQL administrativos. Un escritor backend antiguo seguirá dejando nulos:
la garantía de captura corresponde a la versión nueva. No se han aplicado migraciones fuera de Testcontainers.

POS-INTERNAL-NOTE-1B no iniciada; sin PDF, impresión, cambios UX o instalación de pdfmake.
Siguiente gate: revisión humana del diff/QA de A. Commit, publicación, PR, merge y B requieren sus autorizaciones independientes.

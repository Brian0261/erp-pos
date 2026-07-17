# CORE-ADR-004: Integracion futura con MiFact JSON

Fecha de baseline: 2026-07-17
Estado: aceptado para documentacion y contratos; no autoriza una integracion HTTP.

## Contexto y problema

InkToy necesita preparar una emision fiscal interoperable sin convertir los detalles
publicos de un proveedor en conceptos del dominio. La auditoria 4B reviso el material
publico de MiFact, pero no autorizo llamadas a su demo ni una implementacion.

El contrato publico no incluye OpenAPI, JSON Schema, esquema de `errors`, limites de
evidencia, semantica HTTP completa ni una idempotency key publica. Por ello una
respuesta HTTP exitosa no demuestra aceptacion tributaria y un timeout no demuestra
que el proveedor no haya procesado el documento.

## Decision

Se adopta MiFact JSON como candidato de integracion fiscal futura y se congela un
baseline documental conservador. La futura integracion separara el snapshot fiscal
canonico, DTO externo, mapper de request, mapper de response, mapper de estados y
mapper de evidencias. El dominio no conoce campos `COD_*`, `MNT_*`, `TXT_*`, numeros
de estado MiFact, DTOs, token ni URLs del proveedor.

Solo se permiten implementaciones incrementales despues de 4D, que debe endurecer la
seam del proveedor y las transacciones antes de cualquier cliente HTTP.

## Alternativas descartadas

- **TXT/FTP/carpeta de MiFact:** corresponde al repositorio legacy `txtmifact` y no
  al canal principal JSON de InkToy.
- **API RUC/DNI como dependencia fiscal:** `api-ruc-dni` es auxiliar y no debe ser
  precondicion de emitir comprobantes.
- **Acoplar MiFact al dominio:** haria permanentes campos y errores no estables del
  proveedor.
- **Retry ciego de emision:** podria duplicar una emision o consumir otro correlativo.
- **Cliente HTTP antes de 4D:** mantendria riesgos de transaccion, timeout y bloqueo
  de correlativos sin resolver.

## Baseline inspeccionado

| Repositorio | Rama | Commit | Uso de la revision |
| --- | --- | --- | --- |
| `mifact/apijson` | `master` | `0aeb39be8731bdf8853ec05af1bdf86565478e7f` | Fuente publica contractual principal. |
| `mifact/txtmifact` | `master` | `3133c80ab5951e26920c4bd07b0a6c1614fc8742` | Alternativa legacy descartada. |
| `mifact/api-ruc-dni` | `master` | `696d9bf3cb44afd55eeb72c421498e8249e3e2bf` | Servicio auxiliar fuera del MVP fiscal. |

Los detalles trazables por archivo, hoja y campo estan en
`docs/billing/MIFACT_PUBLIC_CONTRACT_BASELINE.md`.

## Correlativos y query-before-retry

InkToy es la fuente de verdad de serie y correlativo. MiFact recibe una identidad ya
asignada; la misma identidad se conserva al emitir, consultar, recuperar evidencia y
reintentar. Una futura correccion debe incluir unicidad por ambiente.

El flujo obligatorio es:

1. Preparar identidad y hash de payload.
2. Registrar el attempt.
3. Ejecutar una sola emision.
4. Ante timeout o resultado ambiguo, registrar estado desconocido.
5. Consultar usando la misma identidad.
6. Reconciliar el resultado terminal y recuperar evidencia cuando corresponda.
7. Reenviar solo por decision manual y evidencia de ausencia o no procesamiento.

Nunca se reserva otro correlativo por un timeout ni se aplica retry HTTP generico a una
emision.

## Estados, secretos y evidencias

Estado MiFact, estado SUNAT, estado InkToy, attempt e integridad/disponibilidad de
evidencia son dimensiones distintas. `103` no es aceptacion limpia y `108` no es baja
completada. `errors` representa fallo aunque HTTP sea exitoso.

El token es secreto por viajar dentro del JSON. Debe existir una referencia de secreto
por emisor y ambiente, resolverse solo en memoria e incorporarse en la frontera de
transporte. Se excluye de dominio, persistencia, hashes, logs y tracing. LOCAL, BETA y
PROD permanecen separados; PROD falla cerrado sin resolver productivo.

XML y CDR se trataran de forma conservadora como ZIP Base64 hasta contract tests o una
demo autorizada. PDF se tratara como Base64. La materializacion futura exige validacion
Base64, limites, MIME y magic bytes, ZIP seguro contra zip bomb, SHA-256 independiente,
content length, put-if-absent, no overwrite y transicion a `AVAILABLE` solo despues de
escritura y verificacion. `codigo_hash` del proveedor no sustituye el SHA-256 del objeto;
`cadena_para_codigo_qr` es texto fuente y `url` no se sigue ni expone automaticamente.

## Riesgos y consecuencias

Los flags publicados como `"true"`/`"false"` se consideran strings hasta validacion.
Los catalogos pueden contener erratas y se encapsularan detras del adapter. Ejemplos con
comentarios no son JSON estricto. No hay idempotencia publica ni limites de evidencia
documentados. Estas incertidumbres obligan a fixtures sanitizados, contract tests locales
y una fase de consulta/reconciliacion antes de produccion.

## Roadmap actualizado

1. 4C: ADR, baseline y fixtures.
2. 4D: provider seam y hardening transaccional.
3. 5A: configuracion no secreta y resolver demo.
4. 5B: cliente HTTP MiFact aislado.
5. 5C: contract tests locales.
6. 6: snapshot fiscal, DTOs y mapper.
7. 7: emision, consulta, reconciliacion e idempotencia.
8. 8A/8B: evidencias demo.
9. 8C: S3 productivo.
10. 9: nota de credito y baja.
11. 10: frontend fiscal.
12. 11: QA demo.
13. 12: produccion controlada.

Gates: 4D precede al cliente HTTP; 2C precede a PROD; 3C-4E precede al storage
productivo; 3C-4F precede a descarga productiva. 3B-3B permanece diferida.

## Revision del ADR

Este ADR se revisa solo ante un cambio observable de los repositorios MiFact, un contract
test incompatible, una diferencia demostrada en demo autorizada o un cambio de proveedor.

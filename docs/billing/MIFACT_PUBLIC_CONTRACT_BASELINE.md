# MiFact JSON: baseline publico trazable

Fecha de baseline: 2026-07-17. Este documento consolida la inspeccion read-only de 4B;
no sustituye contract tests, no autoriza una llamada demo y no contiene secretos ni datos
publicados de emision.

## Fuentes revisadas

| Repositorio / commit | Archivo o hoja | Afirmacion externa | Decision conservadora / prueba futura |
| --- | --- | --- | --- |
| `mifact/apijson` `0aeb39be8731bdf8853ec05af1bdf86565478e7f` | `README.md` y ejemplos JSON | Operaciones: `SendInvoice`, `LowInvoice`, `GetEstatusInvoice`, `GetInvoice`, `SendMailInvoice`. | Modelarlas solo como capacidades futuras provider-neutral; validar request/response en 5C. |
| mismo repositorio / commit | `integracionConJson_FV_BV_NC_ND/DocumentacionFV_BV_NC_ND_Json.xlsx`, hojas `estructura JSON`, `RespuestaJSON` | La emision usa emisor, receptor, comprobante, totales, impuestos, items y flags. | Crear snapshot canonico y mapper; no filtrar nombres MiFact al dominio. |
| mismo repositorio / commit | mismo workbook, hojas `01`, `03`, `04`, `05`, `06`, `07`, `09`, `10`, `25`, `51`, `53` | Catalogos publicos para documento, unidades, pais, tributo, identidad, afectacion, notas, producto, operacion y descuento. | Encapsular catalogos en adapter; revisar editorialmente antes de cada uso. |
| mismo repositorio / commit | `README.md`, ejemplos de respuesta y hoja `RespuestaJSON` | Estados: `101` proceso, `102` aceptado, `103` aceptado con observaciones, `104` rechazado, `105` anulado, `108` baja pendiente. | Separar estado MiFact, SUNAT, InkToy, attempt y evidencia. |
| mismo repositorio / commit | `RespuestaJSON` | Campos: `errors`, `estado_documento`, `sunat_responsecode`, `sunat_description`, `sunat_note`, `xml_enviado`, `cdr_sunat`, `pdf_bytes`, `codigo_hash`, `cadena_para_codigo_qr`, `ticket_sunat`, `url`. | Sanitizar, no loguear body; validar formatos y limites mediante tests. |
| mismo repositorio / commit | ejemplos de emision | El token viaja en JSON y serie/correlativo vienen del cliente. | Secreto en frontera de transporte; InkToy conserva ownership de correlativos. |
| mismo repositorio / commit | `integracionConJson_GuiaRemision/DocumentacionGuiaRemisionRemitenteJson.xlsx`, todas las hojas | Contrato separado de guia remitente. | Fuera del MVP de comprobantes; no reutilizar sin fase explicita. |
| mismo repositorio / commit | `integracionConJson_GuiaRemision/DocumentacionGuiaRemisionTransportistaJson.xlsx`, todas las hojas | Contrato separado de guia transportista. | Fuera del MVP de comprobantes. |
| mismo repositorio / commit | `integracionConJson_RetencionesPercepciones/DocumentacionTecnica_Valores.xlsx`, todas las hojas | Metodos y catalogos de retencion/percepcion. | Fuera del MVP; no contaminar el mapper de factura/boleta. |
| `mifact/apijson` beta historico | workbooks historicos FV/BV/NC/ND y guia | Diferencias de campos, incluido correo (`TXT_CORREO_ENVIO` frente a `MailEnvio`) y variantes de emisor. | `master` es baseline; compatibilidad se prueba en 5C. |
| `mifact/txtmifact` `3133c80ab5951e26920c4bd07b0a6c1614fc8742` | README y `estructura txt_fv_bv_nd_nd.xlsx`, todas las hojas | Flujo TXT/FTP/carpeta legacy. | Descartado como canal principal. |
| `mifact/api-ruc-dni` `696d9bf3cb44afd55eeb72c421498e8249e3e2bf` | README | Consulta auxiliar de identificacion. | No es precondicion de emision fiscal. |

## Payload y respuesta: lectura minima

El workbook principal asocia la emision con identidad y direccion de emisor/receptor,
fecha, tipo, serie, correlativo, moneda, totales por categoria, tributos, descuentos,
detraccion, notas, flags, UBL/anexo, tipo de operacion e items con producto, unidad,
cantidad, descripcion, precios, afectacion y tasas. Tambien documenta referencias,
cuotas y anticipos. Esto supera el payload fiscal actual de InkToy y exige snapshot y
mapper futuros; no se resuelve en 4C.

`xml_enviado` y `cdr_sunat` se manejan como ZIP Base64 hasta evidencia contractual;
`pdf_bytes` como Base64. `codigo_hash` es un dato de proveedor, no un checksum SHA-256 de
storage InkToy. `cadena_para_codigo_qr` es texto fuente. `url` es no confiable y no se
sigue ni devuelve automaticamente.

## Ambiguedades y contradicciones

| Hallazgo | Impacto | Decision conservadora |
| --- | --- | --- |
| No hay OpenAPI, JSON Schema ni releases formales. | El README y Excel no son contrato ejecutable. | Crear fixtures derivados y contract tests locales antes de red. |
| `errors` no define forma estable. | Un HTTP exitoso puede contener fallo. | Cualquier `errors` presente es fallo hasta mapping probado. |
| Semantica HTTP y limites de evidencia incompletos. | No hay retry o descarga segura generica. | Query-before-retry y limites propios fail-closed. |
| Flags aparecen como strings `"true"` / `"false"`. | Booleanos JSON podrian ser incompatibles. | Representarlos como strings hasta 5C. |
| Algunos ejemplos llevan comentarios. | No son JSON estricto. | Los fixtures InkToy son JSON valido sin comentarios. |
| Catalogos tienen errores editoriales; por ejemplo, etiquetas de notas y un typo de ubigeo. | Copiar catalogos propaga fallos. | Encapsular y revisar por adapter. |
| `master` y beta no coinciden por completo, incluido correo. | Un mapper puede asumir campos inexistentes. | Baseline `master`; pruebas versionadas futuras. |
| No existe idempotency key publica. | Timeout puede dejar estado desconocido. | Consultar con la misma identidad antes de una decision manual. |

## Politicas que quedan fijadas

- No se registra ni persiste token, body completo, XML, CDR, PDF, headers o credenciales.
- `102` puede ser aceptacion; `103` conserva observaciones; `104` es rechazo; `101` es
  pendiente y `108` no es anulacion completada.
- InkToy no reasigna serie ni correlativo ante timeout.
- La evidencia se materializa solo con Base64, MIME, magic bytes, ZIP, size y SHA-256
  independiente validados, usando put-if-absent y no overwrite.
- La fuente se revisa solo si cambia visiblemente, falla un contrato o una demo autorizada
  demuestra una diferencia.

# Phase 2S.9C Binary Image Import Local QA

## Objetivo

Validar localmente el flujo backend + frontend de importacion masiva de imagen principal ecommerce mediante Excel + ZIP, antes de pensar en staging.

## Fases Previas

- `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts cerrado y pusheado.
- `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX cerrado y pusheado.

## Endpoints Backend

- `GET /api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/template`
- `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview`
- `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file`

Multipart esperado:
- `workbook`: `.xlsx`
- `archive`: `.zip`

## Ruta Frontend

- `/ecommerce-admin/perfiles/imagenes/importar-zip` — importacion Excel + ZIP.
- `/ecommerce-admin/perfiles/imagenes/importar` — importacion por URL (intacta).

## Validaciones Automaticas

### Backend compile

```text
.\mvnw -DskipTests compile
```

Resultado: BUILD SUCCESS.

### Backend tests focalizados

```text
.\mvnw "-Dtest=EcommercePrimaryImageBinaryImportIntegrationTest,EcommercePrimaryImageUrlImportIntegrationTest,EcommerceCatalogApplicationServiceTest" test
```

Resultado: 43 tests, 0 failures, 0 errors, BUILD SUCCESS.

Cobertura:
- Template binary import responde en test de integracion.
- Ruta URL import sigue cubierta por test de integracion.
- Preview valido Excel + ZIP sin persistir ni subir storage.
- Preview invalido con SKU duplicado, `imageFile` faltante/no encontrado, extension/contenido invalido, ZIP traversal, backslash/absolutas/drive letters.
- Confirmacion validada solo con `EcommerceImageStoragePort` mock, sin AWS/S3 real.

### Frontend build

```text
npm run build
```

Resultado: BUILD SUCCESS.

### Verificacion frontend

- Rutas `/ecommerce-admin/perfiles/imagenes/importar` y `/ecommerce-admin/perfiles/imagenes/importar-zip` presentes.
- Servicio frontend usa:
  - `binary-import/template`
  - `binary-import/preview`
  - `binary-import/confirm-file`
  - multipart `workbook` y `archive`

## Validacion Manual en Navegador

### Evidencia reportada por operador

- La pantalla Importar Excel + ZIP carga correctamente.
- El Excel y el ZIP fueron leidos correctamente.
- El preview mostro 3 filas validas con advertencias y 0 rechazadas.
- Los filtros, detalle de fila, advertencias y resumen funcionan.
- Al confirmar en local, las filas no se aplicaron porque el storage ecommerce no esta configurado.
- Mensaje observado: `Ecommerce image storage is not configured.`
- Resultado seguro: no se subieron imagenes ni se modificaron datos.
- La pantalla Importar imagenes por URL sigue disponible.
- La pantalla Importar perfiles sigue disponible.

### Limitacion aceptada

La confirmacion real con subida a storage queda pendiente para 2S.9D staging smoke.

## Resultado

**PASS local con limitacion**

- Backend compile: OK.
- Backend tests focalizados: 43/43 OK.
- Frontend build: OK.
- Navegacion y rutas: OK.
- Preview local: OK.
- Confirmacion local: bloqueada de forma segura por storage no configurado.
- No se subieron imagenes.
- No se modificaron datos en local.
- Regresion de pantallas URL/perfiles: OK.

## Pendiente para 2S.9D

- Staging smoke con storage configurado.
- Confirmacion real con subida a S3/CloudFront.
- Validacion de imagen visible en Storefront staging.

## Archivos Documentales

- `docs/qa/PHASE2S9C_BINARY_IMAGE_IMPORT_LOCAL_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

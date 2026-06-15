# Phase 2S.8E AWS Staging Smoke QA

## Objetivo

Validar manualmente en staging real el flujo completo de upload de imagen principal ecommerce: Angular Admin -> Backend -> S3 privado -> CloudFront publico. Esta fase cierra documentalmente la cadena 2S.8A/2S.8B/2S.8D con evidencia de infraestructura AWS real.

## Nota Sobre Autoria De La Validacion

Toda la evidencia de esta fase fue reportada manualmente por el operador en AWS Lightsail. Opencode no tiene acceso directo a Lightsail, AWS Console, S3, CloudFront, IAM ni al `.env` real del servidor. Por lo tanto:

- Opencode NO ejecuto el smoke real.
- Opencode NO verifico directamente la infraestructura cloud.
- Opencode NO valido URLs, buckets, distributions ni credenciales reales.
- Cualquier resultado de infraestructura se registra como "validacion manual reportada por el operador".

## Alcance Validado

- Lightsail staging actualizado desde `origin/master`.
- Backend, frontend Angular y PostgreSQL levantados con Docker Compose.
- Flyway aplicado hasta V18 inclusive.
- Endpoint de login responde 200.
- Endpoint de health responde 200.
- Puertos seguros: Caddy 80/443 publico, Angular solo en 127.0.0.1:4200, backend 8080 no publico, PostgreSQL 5432 no publico.
- Upload manual de imagen principal desde Angular Admin funciona.
- Imagen principal se sube y se sirve desde CloudFront.
- Flujo validado: Angular Admin staging -> Backend staging -> S3 privado -> CloudFront publico.

## Infraestructura Usada

| Componente | Detalle |
|---|---|
| Hosting | AWS Lightsail |
| Orquestacion | Docker Compose |
| Reverse proxy | Caddy (80/443) |
| Frontend Angular | 127.0.0.1:4200 (no publico) |
| Backend Spring Boot | 8080 (no publico) |
| PostgreSQL | 5432 (no publico) |
| Storage | S3 privado `inktoy-ecommerce-images-staging` |
| Region | us-east-1 |
| Prefix S3 | `staging/ecommerce` |
| CDN | CloudFront con CNAME `cdn-staging.inktoy.pe` |
| Dominio staging | `staging.inktoy.pe` |
| Swap | 2 GB (para builds Docker en instancia de 2 GB RAM) |

## Variables De Configuracion (solo nombres, sin valores secretos)

Backend:
- `ECOMMERCE_IMAGE_STORAGE_PROVIDER`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `ECOMMERCE_IMAGE_S3_BUCKET`
- `ECOMMERCE_IMAGE_S3_PREFIX`
- `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`
- `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`
- `CORS_ALLOWED_ORIGINS`

Storefront (no desplegado aun en Lightsail en esta fase):
- `STOREFRONT_IMAGE_ALLOWED_DOMAINS`

Las credenciales AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) existen solo en el `.env` real del servidor y no deben aparecer en ningun archivo del repo.

## Resultado Del Smoke

| Paso | Resultado | Fuente |
|---|---|---|
| Login staging 200 | OK | Reporte manual del operador |
| Health staging 200 | OK | Reporte manual del operador |
| Flyway V18 aplicada | OK | Reporte manual del operador |
| Upload manual desde Angular Admin | OK | Reporte manual del operador |
| Imagen servida desde CloudFront | OK | Reporte manual del operador |
| Puertos seguros | OK | Reporte manual del operador |

URL de imagen reportada (patron):
- `https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/{productId}/profiles/{profileId}/main/{slug}-{checksum}.{ext}`

## Detalle Tecnico Observado

La ruta generada contiene el segmento duplicado `/staging/ecommerce/ecommerce/...`. Esto ocurre porque el prefijo configurado es `staging/ecommerce` y el codigo de `buildStorageKey` ya agrega `ecommerce/products/...` como parte del key. El resultado es funcional y la imagen se sirve correctamente desde CloudFront, pero queda como detalle tecnico a revisar antes de endurecer URLs finales. No es un bloqueo para el MVP de upload manual.

## No Validado En Esta Fase

| Item | Estado |
|---|---|
| Storefront Next.js desplegado en Lightsail | No desplegado aun |
| Render end-to-end Storefront staging -> CloudFront | No validado |
| Acceso S3 directo anonimo devuelve 403 | No evidenciado explicitamente |
| Importacion masiva por URL publica | Fuera de alcance |
| Excel + ZIP de imagenes | Fuera de alcance |
| Galeria multiple | Fuera de alcance |
| Presigned URL | Fuera de alcance |
| Activacion de indexacion | No activada |

## Riesgos Pendientes

- Confirmar y registrar evidencia de que el acceso S3 directo anonimo devuelve 403.
- Revisar la ruta duplicada `/staging/ecommerce/ecommerce/...` antes de produccion. Esto puede requerir ajustar el prefijo S3 o el naming del storage key.
- Mantener todas las credenciales AWS exclusivamente en el `.env` del servidor, nunca en repo, logs, screenshots o tickets.
- Formalizar o documentar los overrides de staging para docker-compose, puertos y `env_file`.
- Diseñar consistencia DB/S3 para cargas masivas: si S3 sube pero DB falla, el objeto queda orphan en S3.
- El Storefront Next.js aun no esta desplegado en Lightsail; el render end-to-end de imagenes en staging queda pendiente hasta esa fase.

## Exclusiones Confirmadas

- No se modifico codigo backend.
- No se modifico codigo frontend Angular.
- No se modifico Storefront Next.js.
- No se modifico Flyway.
- No se modifico docker-compose.
- No se crearon recursos AWS nuevos.
- No se conecto a AWS/Lightsail desde opencode.
- No se incluyeron access keys, secrets, tokens ni passwords.
- No se hizo commit ni push.
- No se activó indexacion.
- No se implemento ZIP, importacion masiva, galeria, presigned URL, structured data, Merchant Center, carrito, checkout ni pagos.

## Proximo Paso Recomendado

- **2S.8F** -- Importacion masiva de imagen principal por URL publica.
- Luego **2S.9** -- Excel + ZIP de imagenes.

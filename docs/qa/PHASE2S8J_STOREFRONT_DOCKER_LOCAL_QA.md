# Phase 2S.8J Storefront Docker Local QA

## Objetivo

Agregar soporte Docker local para Storefront Next.js sin desplegarlo todavia en Lightsail y sin romper el stack actual de PostgreSQL, backend y Angular Admin.

## Alcance Implementado

- `storefront/Dockerfile` para Next.js standalone.
- `storefront/.dockerignore` para excluir dependencias, builds, caches y `.env` reales.
- Servicio `storefront` en `docker-compose.yml`.
- Profile dedicado `storefront` para evitar que se levante por defecto en Lightsail con `docker compose up -d`.
- Puerto Storefront local: `127.0.0.1:3000:3000`.
- Admin Angular se mantiene en `127.0.0.1:4200:80`.
- Backend queda ligado a loopback y PostgreSQL queda solo en la red interna Docker para no exponerse publicamente desde Docker Compose local.

## Configuracion Storefront Docker

- `STOREFRONT_API_BASE_URL=http://backend:8080` para consumo server-side por red interna Docker.
- `STOREFRONT_PUBLIC_BASE_URL=http://localhost:3000` como valor local no sensible.
- `STOREFRONT_INDEXING_ENABLED=false` para mantener staging/local sin indexacion.
- `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe` para permitir imagenes importadas desde el CDN staging.
- Las variables de Storefront se pasan como build args y runtime env porque `images.remotePatterns` se calcula desde `next.config.ts` durante build y el helper seguro tambien valida en runtime.

## Comandos De Uso Local

```bash
docker compose config
docker compose build storefront
docker compose --profile storefront up -d storefront
docker compose ps
```

## Validaciones Requeridas

| Comando | Resultado esperado |
|---|---|
| `docker compose config` | Configuracion valida |
| `docker compose build storefront` | Imagen Storefront construida |
| `docker compose --profile storefront up -d storefront` | Storefront levantado explicitamente |
| `docker compose ps` | `storefront` up, postgres/backend/frontend sin regresion |
| `docker compose logs storefront --tail=120` | Sin errores de arranque Next.js |
| `curl -I http://localhost:3000/` | HTTP 200 |
| `curl -I http://localhost:4200/` | HTTP 200 |
| `git diff --check` | Sin errores de whitespace |

## Validaciones Ejecutadas

| Comando | Resultado |
|---|---|
| `docker compose config` | OK; salida completa suprimida para no imprimir valores de `.env` real |
| `docker compose build storefront` | OK; imagen `erp-pos-storefront` construida |
| `docker compose --profile storefront up -d storefront` | OK tras dejar PostgreSQL solo en red interna Docker |
| `docker compose up -d frontend` | OK; reaplico binding `127.0.0.1:4200:80` al contenedor existente |
| `docker compose ps` | OK; storefront `127.0.0.1:3000`, frontend `127.0.0.1:4200`, backend `127.0.0.1:8080`, postgres sin puerto host |
| `docker compose logs storefront --tail=120` | OK; Next.js 16.2.7 listo |
| `curl -I http://localhost:3000/` | OK; HTTP 200 |
| `curl -I http://localhost:4200/` | OK; HTTP 200 |

## Checklist Funcional Manual

- Abrir `http://localhost:3000/`.
- Confirmar que Storefront Docker responde.
- Confirmar que el producto publicado aparece.
- Confirmar que la imagen importada desde `cdn-staging.inktoy.pe` se renderiza.
- Confirmar que no aparece error de Next/Image por dominio no permitido.
- Abrir `http://localhost:4200/`.
- Confirmar que Angular Admin sigue respondiendo.
- Confirmar que no se toco Lightsail ni Caddy.

## Smoke Visual Manual Reportado Por Operador

- `http://localhost:3000/` carga correctamente.
- `http://localhost:3000/productos` carga correctamente.
- `http://localhost:3000/productos/cuaderno-a4` carga correctamente.
- El producto publicado aparece en Storefront Docker.
- La imagen importada se muestra correctamente en Storefront Docker.
- No aparece fallback de imagen.
- No aparece error de Next/Image por dominio no permitido.
- Admin Angular sigue funcionando en `http://localhost:4200/`.
- No se detectaron errores visuales relevantes.

## Exclusiones Confirmadas

- No se desplego Storefront en Lightsail.
- No se modifico Caddyfile ni configuracion real del servidor.
- No se tocaron AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.
- No se modificaron backend ni contratos API.
- No se modifico logica Storefront ni `next.config.ts`.
- No se implemento ZIP, carga binaria masiva, presigned URLs, galeria, Merchant Center, structured data, indexacion, carrito, checkout ni pagos.
- No se tocaron ERP/POS, stock, inventario, unidades, costos ni precios ERP.

## Riesgos Pendientes

- Cambios en `STOREFRONT_IMAGE_ALLOWED_DOMAINS` requieren rebuild/restart para alinear `next.config.ts` y runtime.
- PostgreSQL no publica puerto host; para inspeccion directa usar herramientas dentro de la red Docker o un override local no commiteado.
- El despliegue Lightsail requiere una fase separada para Caddy/routing y smoke staging.
- 2S.9 debe esperar hasta que Storefront Docker local tenga smoke basico de imagen validado.

## Resultado

- 2S.8J deja preparado soporte Docker local para Storefront.
- Smoke CLI Docker local aprobado.
- Smoke visual manual en navegador aprobado por operador.
- Pendiente: fase separada para despliegue Lightsail/Caddy antes de considerar staging publico de Storefront.

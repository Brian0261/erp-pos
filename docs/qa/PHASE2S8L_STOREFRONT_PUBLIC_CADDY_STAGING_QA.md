# PHASE 2S.8L - Storefront Public Caddy Staging QA

## Objetivo

Cerrar documentalmente la exposicion publica de Storefront staging por HTTPS en un host separado, manteniendo el Admin Angular existente sin afectaciones.

## Alcance

- Storefront publicado en `https://storefront-staging.inktoy.pe`.
- Admin Angular mantiene `https://staging.inktoy.pe`.
- Storefront sigue usando `127.0.0.1:3000` localmente detras de Caddy.
- Indexacion permanece desactivada.

## Pasos manuales realizados

- Se verifico la resolucion DNS de `storefront-staging.inktoy.pe`.
- Se respaldo el `Caddyfile` antes de cambios locales del operador.
- Se valido la configuracion de Caddy.
- Se recargo Caddy.
- Se ejecuto smoke HTTP sobre Storefront y Admin.
- Se realizo smoke visual en navegador sobre Storefront publico.

## Evidencia

- DNS: `storefront-staging.inktoy.pe` resuelve a `52.205.169.234`.
- Caddy: backup creado, `caddy validate` OK, `systemctl reload caddy` OK, servicio activo.
- Storefront HTTPS:
  - `https://storefront-staging.inktoy.pe/` HTTP 200
  - `https://storefront-staging.inktoy.pe/productos` HTTP 200
  - `https://storefront-staging.inktoy.pe/productos/cuaderno-a4` HTTP 200
- Admin actual:
  - `https://staging.inktoy.pe/` HTTP 200
- `robots.txt`:
  - `User-Agent: *`
  - `Disallow: /`
- Validacion visual:
  - Home OK
  - `/productos` OK
  - `/productos/cuaderno-a4` OK
  - Producto `Cuaderno A4` visible
  - Imagen principal importada visible
  - Sin fallback de imagen
  - Sin error de API
  - Sin error de Next/Image
  - Admin Angular no afectado
- Logs recientes:
  - `docker compose logs storefront --since=5m` sin errores
  - `journalctl` de Caddy sin entradas en los ultimos 5 minutos

## Resultado

PASS.

## Confirmaciones

- Admin Angular no fue afectado.
- Indexacion desactivada.

## Limitaciones

- No es produccion.
- No hay indexacion activa.
- No se implemento checkout ni pagos.
- No se toco codigo funcional ni configuracion versionada desde opencode.

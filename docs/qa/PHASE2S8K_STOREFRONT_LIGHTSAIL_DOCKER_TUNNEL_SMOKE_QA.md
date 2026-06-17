# PHASE 2S.8K - Storefront Lightsail Docker Tunnel Smoke QA

## Objetivo

Validar visualmente en Lightsail staging que Storefront Docker levanta correctamente con el profile `storefront`, responde por loopback y renderiza el producto publicado con su imagen importada mediante un tunel SSH, sin configurar acceso publico Caddy en esta fase.

## Alcance validado

- Commit desplegado en Lightsail: `f87f401 chore(storefront): add Docker local support`.
- Git en Lightsail sobre `master` alineado con `origin/master`.
- Servicios Docker verificados:
  - backend en `127.0.0.1:8080:8080`
  - frontend Angular en `127.0.0.1:4200:80`
  - storefront en `127.0.0.1:3000:3000`
  - PostgreSQL interno y healthy
- Respuesta HTTP valida en Storefront y rutas publicadas.
- Render visual correcto del producto `Cuaderno A4` con imagen principal importada.

## Comandos principales usados

```bash
git status --short --branch
git log --oneline -3
docker compose ps
docker compose logs storefront --since=15m
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/productos
curl -I http://127.0.0.1:3000/productos/cuaderno-a4
```

Tunel SSH usado desde Windows:

```bash
ssh -i "C:\Users\USUARIO\Downloads\LightsailDefaultKey-us-east-1.pem" -L 3001:127.0.0.1:3000 ubuntu@52.205.169.234
```

## Evidencia manual

- Se abrio Storefront via `http://localhost:3001/`.
- Se valido `http://localhost:3001/productos`.
- Se valido `http://localhost:3001/productos/cuaderno-a4`.
- Home OK.
- `/productos` OK.
- `/productos/cuaderno-a4` OK.
- Producto `Cuaderno A4` visible.
- Imagen principal importada visible.
- Sin fallback de imagen.
- Sin error de API.
- Sin error de Next/Image por dominio no permitido.

## Resultado

PASS.

## Limitacion explicita

- No se configuro host publico ni Caddy para Storefront en esta fase.
- La validacion se realizo por loopback con tunel SSH hacia `127.0.0.1:3000`.

## Recomendacion

- Tratar la configuracion de Caddy/host publico como una fase separada si se decide exponer Storefront staging publicamente.
- No avanzar a cambios de exposicion publica sin una validacion explicita de enrutamiento y aislamiento respecto al Admin Angular.

# Deployment Local

## Requisitos

- Docker + Docker Compose
- Java 17 (opcional para ejecucion sin Docker)
- Node (solo frontend)

## Levantar stack local

```powershell
docker compose up --build -d
```

## Verificar backend

```powershell
docker compose logs backend --tail=120
```

## Endpoints clave de validacion local

- `GET /api/v1/health`
- `GET /api/v1/health/db`
- `GET /api/v2/products`
- `GET /api/v2/inventory/stocks`
- `GET /api/v1/reports/sales?from=&to=`
- `GET /api/v1/reports/inventory-movements?limit=`
- `GET /api/v1/integrations/outbox-events`

## Detener

```powershell
docker compose down
```


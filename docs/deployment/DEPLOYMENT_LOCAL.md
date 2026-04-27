# Deployment Local

## Requisitos

- Docker + Docker Compose
- Java 17 (opcional para ejecucion sin Docker)
- Node (solo frontend, no requerido para backend Sprint 8)

## Levantar stack local

```powershell
docker compose up --build -d
```

## Verificar backend

```powershell
docker compose logs backend --tail=120
```

## Endpoints clave Sprint 8

- `GET /api/v1/health`
- `GET /api/v1/health/db`
- `GET /api/v1/reports/sales?from=&to=`
- `GET /api/v1/integrations/outbox-events`

## Detener

```powershell
docker compose down
```


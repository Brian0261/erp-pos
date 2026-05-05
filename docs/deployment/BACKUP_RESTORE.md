# Backup y Restore (Local)

## Backup de PostgreSQL

```powershell
docker exec -t erp-pos-postgres pg_dump -U inktoy_user_local -d inktoy_name_local > backup_inktoy_name_local.sql
```

## Restore de PostgreSQL

```powershell
Get-Content .\backup_inktoy_name_local.sql | docker exec -i erp-pos-postgres psql -U inktoy_user_local -d inktoy_name_local
```

## Recomendaciones

- Ejecutar backup antes de pruebas de migraciones.
- Versionar backups de datos de prueba por fecha.
- No usar backups locales para produccion.


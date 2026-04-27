# Backup y Restore (Local)

## Backup de PostgreSQL

```powershell
docker exec -t erp-pos-postgres pg_dump -U erp_user -d erp_pos > backup_erp_pos.sql
```

## Restore de PostgreSQL

```powershell
Get-Content .\backup_erp_pos.sql | docker exec -i erp-pos-postgres psql -U erp_user -d erp_pos
```

## Recomendaciones

- Ejecutar backup antes de pruebas de migraciones.
- Versionar backups de datos de prueba por fecha.
- No usar backups locales para produccion.


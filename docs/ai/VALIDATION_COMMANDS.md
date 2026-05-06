# Validation Commands - InkToy ERP/POS

## Regla general

Usar validacion proporcional al alcance. Para tareas solo documentales, evitar builds largos salvo necesidad estricta.

## Validacion backend

```powershell
cd backend
mvn clean test
mvn clean verify
```

Nota: segun entorno local, tambien se puede usar `./mvnw.cmd` en Windows.

## Validacion frontend

```powershell
cd frontend
npm run build
```

## Validacion Docker

```powershell
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs backend --tail=150
docker compose logs frontend --tail=150
```

## Checklist manual minimo

1. Login ADMIN.
2. Login CAJERO.
3. Login ALMACENERO.
4. Login SUPERVISOR.
5. Dashboard carga correctamente.
6. Logout funciona y redirige.
7. Rutas protegidas redirigen correctamente cuando no corresponde.
8. No respuestas 500 inesperadas.
9. No errores CORS.
10. No errores criticos de consola.

## Comandos Git recomendados

```powershell
git status
git diff --stat
```

## Cierre minimo para cualquier tarea

1. Ejecutar `git status`.
2. Ejecutar `git diff --stat`.
3. Reportar exactamente que se modifico y que no se modifico.

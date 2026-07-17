# QA documental: baseline publico MiFact JSON (4C)

## Alcance

Validacion documental y de test-resources, sin cliente HTTP, llamadas externas, codigo
Java, migraciones ni configuracion funcional.

## Checklist

- ADR registra decision, alternativas, SHAs, riesgos, secretos, evidencias y roadmap.
- Baseline identifica repositorio, commit, archivo/hoja, conclusion, ambiguedad y futura
  prueba para cada afirmacion externa relevante.
- Contrato provider-neutral cubre `submit`, `query`, `retrieveEvidence`, `cancel` y
  `capabilities`, sin interfaz Java.
- Fixtures son derivados, minimos, JSON estricto y cubren `101`, `102`, `103`, `104`.
- Fixtures no incluyen tokens funcionales, identificaciones, series, correlativos,
  clientes, URLs productivas, certificados ni evidencia Base64 decodificable.
- `downloadAllowed` no se habilita; no se implementa storage, retry, 4D ni frontend.

## Validacion ejecutada

Los siete fixtures bajo `backend/src/test/resources/fixtures/billing/mifact/` se parsean
con `ConvertFrom-Json`. La revision Git debe confirmar que no existen cambios en
`backend/src/main`, migraciones, frontend o `.env`.

## Riesgos pendientes

- Confirmar semantica HTTP, forma de `errors`, formatos reales de evidencia y limites en
  contract tests locales posteriores.
- Resolver antes de 5B los riesgos transaccionales y de timeout identificados para 4D.
- Mantener query-before-retry y el correlativo InkToy como controles obligatorios.

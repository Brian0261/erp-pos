# Borrador conceptual de contrato provider-neutral para MiFact

Este borrador describe una frontera futura; no crea interfaces Java, endpoints REST ni
cliente HTTP. El dominio solo usa identidad fiscal, snapshot canonico, estados internos y
metadatos seguros. Token, URL y nombres de campo del proveedor permanecen en transporte.

## Reglas comunes

- La autorizacion del usuario ERP se aplica fuera de esta frontera; el adapter usa una
  referencia de secreto resuelta en memoria por emisor y ambiente.
- El token no se incluye en logs, tracing, hashes, persistencia ni errores expuestos.
- No hay retry automatico de `submit`; timeout o ambiguedad pasan a estado desconocido y
  obligan a `query` con la misma identidad.
- Ninguna respuesta anuncia una descarga; las evidencias son metadata hasta fases futuras.
- Errores provider se sanitizan y se clasifican sin asumir semantica HTTP completa.

## `submit`

| Aspecto | Contrato futuro |
| --- | --- |
| Entrada | Identidad InkToy inmutable, snapshot fiscal canonico, hash de payload y contexto de ambiente. |
| Salida | Estado provider-neutral, codigo/mensaje sanitizados, correlacion segura y metadata de evidencia si existe. |
| Estado | Aceptado, observado, rechazado, pendiente, desconocido o error clasificado; no colapsa `103`. |
| Errores | Validacion, configuracion, comunicacion, timeout, rechazo provider y ambiguedad. |
| Idempotencia | Una emision por identidad; ante ambiguedad se usa `query`, no reenvio generico. |
| Seguridad/evidencia | Token solo en transporte; body nunca en logs; evidencia aun no se materializa. |
| Diferido | HTTP, DTO MiFact, mapper, reintento manual, auditoria de descarga y storage real. |

## `query`

| Aspecto | Contrato futuro |
| --- | --- |
| Entrada | Misma identidad fiscal y ambiente, nunca un correlativo nuevo. |
| Salida | Estado provider/SUNAT normalizado, datos sanitizados y referencia de evidencia opcional. |
| Estado/errores | Puede resolver pendiente o desconocido; timeout sigue siendo ambiguo. |
| Idempotencia | Consulta repetible y sin nueva emision. |
| Seguridad/evidencia | No expone URL ni contenido; no sigue `url` automaticamente. |
| Diferido | Polling, scheduler y comportamiento de red. |

## `retrieveEvidence`

| Aspecto | Contrato futuro |
| --- | --- |
| Entrada | Identidad y tipo de evidencia autorizado por politica interna. |
| Salida | Bytes o stream solo dentro de una frontera controlada, checksum y metadata. |
| Estado/errores | Not ready, missing, revoked, integrity failed o provider unavailable. |
| Idempotencia | Recuperacion no muta correlativo ni estado tributario. |
| Seguridad/evidencia | Base64, limites, MIME, magic bytes, ZIP seguro y SHA-256 independiente antes de `AVAILABLE`. |
| Diferido | Storage real, V25, access audit, descarga y endpoint de contenido. |

## `cancel`

| Aspecto | Contrato futuro |
| --- | --- |
| Entrada | Identidad y motivo interno validado. |
| Salida | Estado de solicitud y correlacion sanitizada. |
| Estado/errores | `108` se interpreta como solicitud pendiente, no baja completada. |
| Idempotencia | Consulta/reconciliacion antes de repetir una baja ambigua. |
| Seguridad/evidencia | Sin body ni secretos en auditoria. |
| Diferido | Notas, baja real, reglas SUNAT y UI. |

## `capabilities`

Describe de manera explicita los tipos de documento, ambientes y operaciones que el
adapter soporta. Una capacidad no declarada falla cerrado. Quedan diferidos la deteccion
en red, cambios dinamicos de proveedor y toda configuracion funcional.

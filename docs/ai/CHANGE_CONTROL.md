# Change Control - InkToy ERP/POS

## Objetivo

Estandarizar cambios tecnicos para reducir regresiones y mantener trazabilidad en etapa pre-piloto.

## Reglas de control de cambios

1. Trabajar por cambios pequenos, verificables y reversibles.
2. No mezclar deudas tecnicas distintas en una sola intervencion.
3. No mezclar backend/frontend cuando el requerimiento no lo exige.
4. No mezclar cambios funcionales con cambios cosmeticos sin acuerdo previo.
5. Mantener foco en alcance explicitamente solicitado.
6. En POS, documentar cambios de persistencia frontend, validacion de almacén y ajustes visuales de búsqueda/botones como nota operativa breve cuando impacten la experiencia de caja.
7. En POS, registrar como mejora UX el reemplazo de confirm nativo por modal propio al cobrar, sin alterar la logica transaccional.
8. En Inventario, documentar mejoras UX de Ajustes de stock cuando incorporen autocomplete server-side, layout estable, confirmacion propia y reset limpio post-success sin tocar backend.
9. En Catalogo, documentar cambios de Productos cuando la busqueda multi-token, filtros reorganizados y tabla compacta mejoren la experiencia sin cambiar endpoints.
 10. En Inventario, documentar la fase 1 del autocomplete compartido cuando se cree `ProductAutocompleteComponent` y se migre primero solo Transferencias, dejando Stock/Stock inicial/Ajustes para fases posteriores.
 11. En Inventario/Kardex, documentar cambios de auditoria cuando el endpoint se enriquezca con nombres operativos, el frontend use paginacion server-side, un solo Limpiar y tabla alineada sin tocar el contrato base `/api/v1/inventory/kardex`.
12. En Inventario, documentar la consolidacion del autocomplete compartido cuando `Stock` use `filterMode=true`, `disabled` reactivo y limpieza visual final sin textos redundantes bajo Producto.
13. En Compras, documentar el rediseño UX/UI de Proveedores cuando la pantalla pase a tabla principal con drawer/modal local para crear/editar y confirmaciones del sistema para estados.
14. En Compras, documentar el rediseño completo de Órdenes de compra en 5 fases cuando el flujo pase de listado → nueva → edición → detalle → recepción con tablas operativas, ProductAutocompleteComponent, sanitización de cantidades/costos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
 15. En Cotizaciones, documentar el rediseño completo en 5 fases cuando el flujo pase de listado → nueva → edición → detalle → conversión con tabla compacta, ProductAutocompleteComponent, `syncSelectedToInput` opt-in en edición, sanitización de cantidades/descuentos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
 16. En Facturacion, documentar la mejora empresarial del Detalle de comprobante electronico cuando se muestren nombre real + SKU + codigo de barras en la tabla de items, historial descendente, XML colapsable y cards key-value, sin ProductService lookup frontend, sin DB/Flyway, sin cambios de endpoints ni POS.

## Tipos de commit sugeridos (cuando se autorice commit)

- fix:
- feat:
- style:
- docs:
- test:
- chore:

Nota: esta guia define tipos recomendados, pero ningun agente debe commitear automaticamente.

## Flujo obligatorio antes de implementar

1. Revisar estado git:
   - git status
2. Leer contexto vigente:
   - README
   - docs/ai/\*
   - docs/qa relevantes
   - docs/adr relevantes
3. Proponer plan breve con alcance y riesgos.
4. Implementar solo el alcance limitado acordado.
5. Validar segun matriz de comandos/documentacion.
6. Reportar resultado con evidencia y riesgos residuales.

## Reglas de rollback

1. Cada cambio debe poder revertirse de forma aislada.
2. Evitar cambios masivos no atomicos.
3. Si se detecta regresion, priorizar rollback del bloque recien introducido.
4. No aplicar rollback destructivo global sin autorizacion explicita.

## Criterios para actualizar documentacion QA

Actualizar docs/qa cuando ocurra al menos uno de estos casos:

1. Cambio funcional en modulo o flujo de usuario.
2. Correccion de bug CRITICAL/HIGH/MEDIUM.
3. Ajuste de seguridad, permisos o rutas protegidas.
4. Cambio de comportamiento observable en Docker/runtime.
5. Nuevo protocolo operativo de validacion (ejemplo: anti-cache).

Nota operativa: cambios de catalogo que agregan endpoints nuevos o reglas de reserva deben reflejarse tambien en matrices y decisiones antes de cerrar la tarea.
Nota operativa: cambios en Stock que alteren el filtro de Producto deben reflejar lookup/autocomplete, criterio de seleccion por `productId` y smoke minimo en matrices/checklist.
Nota operativa: cambios en Stock que adopten `filterMode` deben reflejarse en matrices/checklist con comportamiento de filtro editable, `Buscar` manual y sin acciones redundantes bajo el autocomplete.
Nota operativa: cambios en Proveedores que reorganicen crear/editar deben reflejar tabla principal, drawer/modal local, validacion visual estable y smoke minimo en matrices/checklist.
Nota operativa: cuando Unidades cierre acciones de frontend, reflejarlo en matrices y checklist sin abrir nuevos documentos.
Nota operativa: en Almacenes, registrar `PATCH /api/v1/warehouses/{id}/status` y la semantica de `DELETE` como alias de desactivacion en matrices y decisiones.

## Criterios para crear tag estable

Solo crear tag cuando se cumpla todo:

1. Build backend y frontend exitosos.
2. Docker Compose operativo (servicios arriba y saludables).
3. Smoke QA minimo por roles completado.
4. Sin hallazgos CRITICAL/HIGH abiertos.
5. Documentacion tecnica y QA actualizada.
6. Aprobacion explicita del responsable tecnico.

## Politica de seguridad operativa

1. No cargar datos reales sin autorizacion explicita.
2. No exponer credenciales reales.
3. No ejecutar comandos destructivos sobre git o base de datos sin aprobacion.
4. No hacer commit/push/tag automatico desde agentes.

# AUTO-E7.0 Controlled-Write Readiness QA

## Resultado

Estado: BLOCKED.

## Motivo del bloqueo

Controlled-write sigue bloqueado porque faltan precondiciones operativas para permitir una venta controlada segura en local QA. El flujo no-write esta estable, pero eso no autoriza avanzar a escritura transaccional.

## Precondiciones faltantes

- Snapshot, base descartable o trazabilidad aceptada.
- Caja QA confirmada o autorizacion explicita para abrirla.
- Usuario QA ejecutor confirmado.
- Producto/SKU QA con stock conocido.
- Stock inicial esperado documentado.
- Autorizacion explicita para decrementar stock.
- Metodo de pago QA definido.
- Politica de rollback/anulacion definida.
- Prohibicion clara de boleta/factura/comprobantes/series/SUNAT/OSE/PSE.

## Riesgos de controlled-write

- Creacion persistente de venta.
- Decremento real de stock.
- Impacto en caja por pagos y cambio.
- Anulacion que modifica stock y estado de venta.
- Emision de comprobantes o consumo de series si se abre alcance por error.
- Persistencia de datos de negocio en la base local QA.

## Alcance minimo recomendado para una futura AUTO-E7.1

- Ticket interno solamente.
- Una venta pequena.
- Un producto QA controlado con stock conocido.
- Caja QA controlada.
- Sin boleta/factura.
- Sin comprobante electronico.
- Sin series.
- Preferiblemente sin anulacion en la primera subfase.

## Acciones permitidas solo con autorizacion explicita

- `POST /api/v1/sales` para ticket interno controlado.
- `GET /api/v1/cash-registers/current` para evidencia.
- Lecturas de stock, producto y venta para trazabilidad.
- `POST /api/v1/cash-registers/open` solo si se autoriza abrir caja QA.

## Acciones prohibidas

- `POST /api/v1/sales/{id}/void` en la primera subfase.
- `POST /api/v1/cash-registers/{id}/close`.
- `POST /api/v1/billing/documents/from-sale/{saleId}`.
- `POST /api/v1/billing/documents/{id}/generate-xml`.
- `POST /api/v1/billing/documents/{id}/sign`.
- `POST /api/v1/billing/documents/{id}/send`.
- Escrituras en billing series/company-profile.
- Escrituras de inventario initial-stock/adjustments/transfers.
- Boleta, factura, SUNAT, OSE, PSE.

## Variables de seguridad recomendadas

- `E2E_ALLOW_WRITES=true`
- `E2E_ALLOW_CONTROLLED_SALES=true`
- `E2E_ALLOW_BILLING_RISK=false`
- `E2E_QA_USER`
- `E2E_QA_PASSWORD`
- `E2E_CONTROLLED_WAREHOUSE_ID`
- `E2E_CONTROLLED_SKU`
- `E2E_CONTROLLED_EXPECTED_STOCK`
- `E2E_CONTROLLED_PAYMENT_METHOD`
- `E2E_CONTROLLED_PAYMENT_REFERENCE_PREFIX=QA-E2E`

## Anulacion y rollback

No se recomienda incluir anulacion en la primera subfase. Debe dejarse para otra subfase, porque agrega complejidad operativa y requiere reglas de caja, stock y estado de venta mas estrictas.

## Confirmaciones de seguridad

- No se ejecutaron ventas.
- No se abrio caja.
- No se cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se toco base de datos.
- No se toco backend.
- No se toco infraestructura.
- No se toco Storefront/ecommerce.

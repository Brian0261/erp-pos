# ADR-0002: Facturacion electronica MVP con adapter mock/sandbox

## Contexto

El ERP/POS requiere emitir boleta y factura electronica desde ventas para validar flujo end-to-end del negocio.
En este MVP aun no se incluye integracion productiva con SUNAT/OSE/PSE porque:

- incrementa fuertemente el riesgo operativo y de compliance en una fase temprana;
- depende de certificados, homologaciones y contratos externos;
- alarga tiempos de entrega y reduce foco en validacion funcional del core POS.

## Decision

Implementar en Sprint 7 una base backend de facturacion electronica con arquitectura hexagonal:

- configuracion tributaria por ambiente (`LOCAL`, `BETA`, `PROD`);
- series y correlativos transaccionales;
- comprobantes boleta/factura desde ventas completadas;
- generacion XML UBL para MVP;
- firma mediante estrategia de ambiente:
  - `NoopXmlSignerAdapter` para `LOCAL`/`BETA`;
  - `PfxXmlSignerAdapter` como estructura preparada para `PROD`;
- envio mediante `MockElectronicBillingProviderAdapter` que simula `ACCEPTED` o `REJECTED`;
- persistencia de XML generado y firmado;
- historial de estados del comprobante;
- puerto `ElectronicBillingProviderPort` para desacoplar proveedor real futuro.

## Alternativas evaluadas

1. Integrar SUNAT/OSE productivo en MVP.
   - Descartada por riesgo, costo y dependencia externa en esta etapa.

2. No implementar facturacion en MVP.
   - Descartada porque impide validar ciclo comercial y trazabilidad de comprobantes.

3. Implementar acoplamiento directo al proveedor real sin puerto.
   - Descartada porque rompe mantenibilidad y dificulta pruebas y cambio de proveedor.

## Consecuencias

- Se valida pronto la logica de negocio de emision, XML, firma y estados sin bloqueo externo.
- El equipo puede probar seguridad por roles y manejo de errores de facturacion.
- Se requiere un sprint posterior para conexion real SUNAT/OSE/PSE.

## Justificacion

La decision reduce riesgo y mantiene velocidad del MVP, conservando una arquitectura preparada para evolucion:

- el dominio de facturacion queda estable;
- la infraestructura externa queda aislada por puertos/adaptadores;
- migrar de mock a proveedor real implica reemplazar/adicionar adapters, no reescribir casos de uso.


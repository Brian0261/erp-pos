import { convertToParamMap } from "@angular/router";
import { BillingSummary } from "./data/sales.models";
import { documentView, filtersFromContext, salesContext, saleStatusLabel } from "./sales-presentation";
describe("Sales presentation truth and context", () => {
  const summary = (status = "DRAFT", environment = "PROD") => ({ hasElectronicDocument: true, documentId: 9,
    documentType: "RECEIPT", fullNumber: "B-SYN-9", status, environment }) as BillingSummary;
  it("separates registered and voided sales without guessing unknown states", () => {
    expect(saleStatusLabel("COMPLETED")).toBe("Registrada"); expect(saleStatusLabel("VOIDED")).toBe("Anulada");
    expect(saleStatusLabel("PENDING")).toBe("Estado no disponible");
  });
  it("only represents an explicit consistent empty summary as absence", () => {
    expect(documentView({ hasElectronicDocument: false, documentId: null, documentType: null, fullNumber: null, status: null, environment: null }).kind).toBe("absent");
    expect(documentView(undefined).kind).toBe("unverified");
    expect(documentView({ ...summary(), hasElectronicDocument: false }).kind).toBe("unverified");
    expect(documentView({ ...summary(), documentId: null }).kind).toBe("unverified");
  });
  const labels: Record<string,string> = { DRAFT: "Borrador · no emitido", GENERATED: "XML generado", SIGNED: "Firmado",
    SENT: "Envío registrado · consultar resultado", ACCEPTED: "Aceptado", REJECTED: "Rechazado",
    ERROR: "Error de procesamiento · revisar", CANCELLED: "Documento anulado" };
  for (const [status,label] of Object.entries(labels)) for (const environment of ["LOCAL","BETA","PROD"]) {
    it("distinguishes " + status + " in " + environment + " without promoting fiscal results", () => {
      const view = documentView(summary(status,environment));
      expect(view.type).toBe("Boleta electrónica"); expect(view.number).toBe("B-SYN-9"); expect(view.knownStatus).toBeTrue();
      expect(view.status).toContain(label);
      expect(view.environment).toContain(environment === "PROD" ? "Producción" : environment === "LOCAL" ? "Local · pruebas" : "Beta · pruebas");
      if (status === "ACCEPTED" && environment !== "PROD") expect(view.tone).not.toBe("success");
      if (status !== "ACCEPTED") expect(view.status).not.toContain("Aceptado");
    });
  }
  it("does not invent type, number, environment or an unknown status", () => {
    const view = documentView({ ...summary(), documentType: null, fullNumber: null, status: "toString" as never, environment: null });
    expect(view.type).toBe("Tipo no disponible"); expect(view.number).toBe("Número no disponible");
    expect(view.environment).toBe("Ambiente no disponible"); expect(view.knownStatus).toBeFalse();
  });
  it("round trips only the supported filters, preserving zero writes and no foreign return URLs", () => {
    const filters = { from: "2026-10-01", to: "2026-10-31", status: "VOIDED" as const, cashRegisterSessionId: 7, createdBy: "qa" };
    expect(filtersFromContext(convertToParamMap(salesContext(filters)))).toEqual(filters);
    const parsed = filtersFromContext(convertToParamMap({ returnUrl: "https://invalid.test", salesStatus: "PREPARED", salesCash: "-1", salesFrom: "garbage" }));
    expect(parsed.status).toBeUndefined(); expect(parsed.cashRegisterSessionId).toBeUndefined(); expect(parsed.from).toBeUndefined();
    expect(salesContext(parsed)["returnUrl"]).toBeUndefined();
  });
});

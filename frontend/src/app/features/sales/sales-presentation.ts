import { ParamMap, Params } from "@angular/router";
import { BillingSummary, SalesListContext } from "./data/sales.models";
import { salesQueryFromUrl, salesQueryParams } from "./sales-list-query";

export type DocumentTone = "neutral" | "success" | "warning" | "danger";
export interface DocumentView {
  kind: "absent" | "present" | "unverified";
  type: string;
  number: string;
  status: string;
  environment: string;
  tone: DocumentTone;
  knownStatus: boolean;
}
const statuses: Record<string, [string, DocumentTone]> = {
  DRAFT: ["Borrador · no emitido", "neutral"],
  GENERATED: ["XML generado", "neutral"],
  SIGNED: ["Firmado", "neutral"],
  SENT: ["Envío registrado · consultar resultado", "warning"],
  ACCEPTED: ["Aceptado", "success"],
  REJECTED: ["Rechazado", "danger"],
  ERROR: ["Error de procesamiento · revisar", "warning"],
  CANCELLED: ["Documento anulado", "neutral"],
};
export function saleStatusLabel(status: string): string {
  return status === "COMPLETED" ? "Registrada" : status === "VOIDED" ? "Anulada" : "Estado no disponible";
}
function documentEnvironment(environment: BillingSummary["environment"] | undefined): string | undefined {
  return environment === "LOCAL" ? "Local · pruebas" : environment === "BETA" ? "Beta · pruebas" : environment === "PROD" ? "Producción" : undefined;
}

export function documentView(summary: BillingSummary | null | undefined): DocumentView {
  const unknown: DocumentView = { kind: "unverified", type: "Información documental no verificable",
    number: "", status: "Estado no disponible", environment: "", tone: "warning", knownStatus: false };
  if (!summary || typeof summary.hasElectronicDocument !== "boolean") return unknown;
  if (!summary.hasElectronicDocument) {
    if ([summary.documentId, summary.documentType, summary.fullNumber, summary.status, summary.environment].some(value => value !== null)) return unknown;
    return { ...unknown, kind: "absent", type: "Sin documento electrónico registrado", status: "", tone: "neutral" };
  }
  if (!Number.isSafeInteger(summary.documentId) || summary.documentId! <= 0) return unknown;
  const state = typeof summary.status === "string" && Object.hasOwn(statuses, summary.status) ? statuses[summary.status] : undefined;
  const verifiedEnvironment = documentEnvironment(summary.environment);
  return { kind: "present",
    type: summary.documentType === "INVOICE" ? "Factura electrónica" : summary.documentType === "RECEIPT" ? "Boleta electrónica" : "Tipo no disponible",
    number: typeof summary.fullNumber === "string" && summary.fullNumber.trim() ? summary.fullNumber : "Número no disponible",
    status: state ? state[0] + (["ACCEPTED", "REJECTED"].includes(summary.status!) ? " · " + (verifiedEnvironment ?? "ambiente no disponible") : "") : unknown.status,
    environment: verifiedEnvironment ?? "Ambiente no disponible",
    tone: summary.status === "ACCEPTED" && summary.environment !== "PROD" ? "neutral" : state?.[1] ?? "warning",
    knownStatus: !!state,
  };
}

export function listDocumentView(summary: BillingSummary | null | undefined): {
  primary: string; secondary: string; tone: DocumentTone;
} {
  const document = documentView(summary);
  if (document.kind === "absent") {
    return { primary: "Nota de venta", secondary: "No fiscal · Sin comprobante electrónico", tone: "neutral" };
  }

  const unverified = { primary: "Información documental no verificable", tone: "warning" as const };
  if (document.kind !== "present" || !summary) return { ...unverified, secondary: "Estado no disponible" };

  const type = summary.documentType === "RECEIPT" ? "Boleta" : summary.documentType === "INVOICE" ? "Factura" : undefined;
  const number = typeof summary.fullNumber === "string" && summary.fullNumber.trim() ? summary.fullNumber : undefined;
  const environment = documentEnvironment(summary.environment);
  if (!type || !number || !environment || !document.knownStatus || !summary.status) {
    const missing = [!type && "Tipo no disponible", !number && "Número no disponible",
      !document.knownStatus && "Estado no disponible", !environment && "Ambiente no disponible"];
    return { ...unverified, secondary: missing.filter(Boolean).join(" · ") };
  }

  const status = summary.status === "SENT" ? "Resultado por verificar" : statuses[summary.status][0];
  return { primary: `${type} · ${number}`, secondary: `${status} · ${environment}`, tone: document.tone };
}

export function documentReadError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  return status === 401 ? "Sesión vencida. Inicia sesión para verificar la documentación."
    : status === 403 || status === 422 ? "No tienes permiso para consultar la documentación de esta venta."
    : "No se pudo verificar el estado documental. Reintenta la consulta.";
}
export function salesContext(filters: SalesListContext): Params {
  return salesQueryParams(filters);
}
export function filtersFromContext(params: ParamMap): SalesListContext {
  try {
    return Object.fromEntries(Object.entries(salesQueryFromUrl(params))
      .filter(([key, value]) => value !== undefined && !(key === "page" && value === 0) && !(key === "size" && value === 20)));
  } catch {
    // The list validates the original URL before issuing a request.
  }
  const date = (name: string) => {
    const value = params.get(name);
    // Preserve invalid input so the list can explain it instead of issuing an unbounded query.
    return value || undefined;
  };
  const status = params.get("salesStatus");
  const cash = Number(params.get("salesCash"));
  return { from: date("salesFrom"), to: date("salesTo"),
    status: status === "COMPLETED" || status === "VOIDED" ? status : undefined,
    cashRegisterSessionId: Number.isSafeInteger(cash) && cash > 0 ? cash : undefined,
    createdBy: params.get("salesUser")?.trim() || undefined };
}

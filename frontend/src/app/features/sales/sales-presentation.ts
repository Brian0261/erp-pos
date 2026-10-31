import { ParamMap, Params } from "@angular/router";
import { BillingSummary, SalesFilters } from "./data/sales.models";

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
export function documentView(summary: BillingSummary | null | undefined): DocumentView {
  const unknown: DocumentView = { kind: "unverified", type: "Información documental no verificable",
    number: "", status: "Estado no disponible", environment: "", tone: "warning", knownStatus: false };
  if (!summary || typeof summary.hasElectronicDocument !== "boolean") return unknown;
  if (!summary.hasElectronicDocument) {
    if ([summary.documentId, summary.documentType, summary.fullNumber, summary.status, summary.environment].some(value => value != null)) return unknown;
    return { ...unknown, kind: "absent", type: "Sin documento electrónico registrado", status: "", tone: "neutral" };
  }
  if (!Number.isSafeInteger(summary.documentId) || summary.documentId! <= 0) return unknown;
  const state = typeof summary.status === "string" && Object.hasOwn(statuses, summary.status) ? statuses[summary.status] : undefined;
  const verifiedEnvironment = summary.environment === "LOCAL" ? "Local · pruebas" : summary.environment === "BETA" ? "Beta · pruebas" : summary.environment === "PROD" ? "Producción" : undefined;
  return { kind: "present",
    type: summary.documentType === "INVOICE" ? "Factura electrónica" : summary.documentType === "RECEIPT" ? "Boleta electrónica" : "Tipo no disponible",
    number: typeof summary.fullNumber === "string" && summary.fullNumber.trim() ? summary.fullNumber : "Número no disponible",
    status: state ? state[0] + (["ACCEPTED", "REJECTED"].includes(summary.status!) ? " · " + (verifiedEnvironment ?? "ambiente no disponible") : "") : unknown.status,
    environment: verifiedEnvironment ?? "Ambiente no disponible",
    tone: summary.status === "ACCEPTED" && summary.environment !== "PROD" ? "neutral" : state?.[1] ?? "warning",
    knownStatus: !!state,
  };
}
export function documentReadError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  return status === 401 ? "Sesión vencida. Inicia sesión para verificar la documentación."
    : status === 403 || status === 422 ? "No tienes permiso para consultar la documentación de esta venta."
    : "No se pudo verificar el estado documental. Reintenta la consulta.";
}
export function salesContext(filters: SalesFilters): Params {
  return Object.fromEntries(Object.entries({
    salesFrom: filters.from, salesTo: filters.to, salesStatus: filters.status,
    salesCash: filters.cashRegisterSessionId, salesUser: filters.createdBy,
  }).filter(([, value]) => value !== undefined && value !== ""));
}
export function filtersFromContext(params: ParamMap): SalesFilters {
  const date = (name: string) => {
    const value = params.get(name);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
  };
  const status = params.get("salesStatus");
  const cash = Number(params.get("salesCash"));
  return { from: date("salesFrom"), to: date("salesTo"),
    status: status === "COMPLETED" || status === "VOIDED" ? status : undefined,
    cashRegisterSessionId: Number.isSafeInteger(cash) && cash > 0 ? cash : undefined,
    createdBy: params.get("salesUser")?.trim() || undefined };
}

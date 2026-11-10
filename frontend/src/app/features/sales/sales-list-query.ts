import { ParamMap, Params } from "@angular/router";
import { commercialDateAt, isCommercialDate } from "../../shared/utils/commercial-date";
import {
  BillingDocumentStatus, SALES_PAGE_SIZES, SalesListContext, SalesListItem, SalesListPage, SalesListQuery, SalesPageSize,
} from "./data/sales.models";

export const MAX_SALES_PAGE = 100_000;
export const DOCUMENT_STATUS_OPTIONS: ReadonlyArray<readonly [BillingDocumentStatus, string]> = [
  ["DRAFT", "Borrador"], ["GENERATED", "XML generado"], ["SIGNED", "Firmado"], ["SENT", "Enviado"],
  ["ACCEPTED", "Aceptado"], ["REJECTED", "Rechazado"], ["ERROR", "Error"], ["CANCELLED", "Anulado"],
];

const paramsByField = {
  saleNumber: "salesNumber", saleNumberPrefix: "salesPrefix", from: "salesFrom", to: "salesTo",
  status: "salesStatus", cashRegisterSessionId: "salesCash", createdBy: "salesUser",
  hasElectronicDocument: "salesHasDocument", documentStatus: "salesDocumentStatus",
  page: "salesPage", size: "salesSize",
} as const;

type QueryField = keyof typeof paramsByField;
type QueryInput = Partial<Record<QueryField, string | number | boolean | null>>;

export class SalesQueryError extends Error {
  constructor(readonly field: QueryField, message: string) { super(message); }
}

export function salesQueryParams(query: SalesListContext): Params {
  return Object.fromEntries((Object.keys(paramsByField) as QueryField[])
    .filter(field => query[field] !== undefined && query[field] !== ""
      && !(field === "page" && query.page === 0) && !(field === "size" && query.size === 20))
    .map(field => [paramsByField[field], query[field]]));
}

export function salesQueryFromUrl(params: ParamMap): SalesListQuery {
  const raw: QueryInput = {};
  for (const field of Object.keys(paramsByField) as QueryField[]) {
    const values = params.getAll(paramsByField[field]);
    if (values.length > 1) throw new SalesQueryError(field, "Hay un filtro repetido en el enlace. Revisa o limpia los filtros.");
    if (values.length) raw[field] = values[0];
  }
  return validateSalesQuery(raw);
}

export function validateSalesQuery(raw: QueryInput): SalesListQuery {
  function text(field: QueryField, min: number, max: number, message: string): string | undefined {
    const value = String(raw[field] ?? "").trim();
    if (!value) return undefined;
    const count = Array.from(value).length;
    if (count < min || count > max || /[\u0000-\u001f\u007f-\u009f]/.test(value)) throw new SalesQueryError(field, message);
    return value;
  }
  function integer(field: QueryField, min: number, max: number, message: string): number | undefined {
    const rawValue = raw[field];
    if (rawValue == null) return undefined;
    const value = Number(rawValue);
    if (!/^\d+$/.test(String(rawValue)) || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new SalesQueryError(field, message);
    }
    return value;
  }
  function date(field: "from" | "to") {
    const value = raw[field];
    if (value == null || value === "") return undefined;
    if (typeof value !== "string" || !isCommercialDate(value)) {
      throw new SalesQueryError(field, "Ingresa fechas válidas con formato YYYY-MM-DD.");
    }
    return value;
  }
  const saleNumber = text("saleNumber", 1, 40, "El número de venta debe tener entre 1 y 40 caracteres válidos.");
  const saleNumberPrefix = text("saleNumberPrefix", 3, 40, "El prefijo debe tener entre 3 y 40 caracteres válidos.");
  if (saleNumber && saleNumberPrefix) throw new SalesQueryError("saleNumber", "Elige una búsqueda exacta o por prefijo.");
  const from = date("from"), to = date("to");
  if (from && to && from > to) throw new SalesQueryError("to", "La fecha Desde no puede ser mayor que la fecha Hasta.");
  const status = raw.status || undefined;
  if (status !== undefined && status !== "COMPLETED" && status !== "VOIDED") throw new SalesQueryError("status", "Estado comercial no válido.");
  const presence = raw.hasElectronicDocument;
  if (presence != null && presence !== "" && ![true, false, "true", "false"].includes(presence as string | boolean)) {
    throw new SalesQueryError("hasElectronicDocument", "Presencia documental no válida.");
  }
  const hasElectronicDocument = presence == null || presence === "" ? undefined : presence === true || presence === "true";
  const documentStatus = DOCUMENT_STATUS_OPTIONS.find(([code]) => code === raw.documentStatus)?.[0];
  if (raw.documentStatus && !documentStatus) throw new SalesQueryError("documentStatus", "Estado documental no válido.");
  if (hasElectronicDocument === false && documentStatus) {
    throw new SalesQueryError("documentStatus", "El estado documental requiere un comprobante.");
  }
  const page = integer("page", 0, MAX_SALES_PAGE, "Página no válida.") ?? 0;
  const size = integer("size", 20, 100, "El tamaño debe ser 20, 50 o 100.") ?? 20;
  if (!SALES_PAGE_SIZES.some(value => value === size)) throw new SalesQueryError("size", "El tamaño debe ser 20, 50 o 100.");
  return { page, size: size as SalesPageSize, saleNumber, saleNumberPrefix, from, to, status, hasElectronicDocument,
    documentStatus, cashRegisterSessionId: integer("cashRegisterSessionId", 1, Number.MAX_SAFE_INTEGER, "Ingresa una sesión de caja válida."),
    createdBy: text("createdBy", 1, 120, "El usuario admite hasta 120 caracteres válidos.") };
}

export function decodeSalesPage(value: unknown, query: SalesListQuery): SalesListPage {
  if (!value || typeof value !== "object") throw new Error("Invalid sales page");
  const page = value as Partial<SalesListPage>;
  const { totalItems, totalPages, items } = page;
  if (page.page !== query.page || page.size !== query.size || typeof totalItems !== "number"
    || !Number.isSafeInteger(totalItems) || totalItems < 0 || totalPages !== Math.ceil(totalItems / query.size)
    || !Array.isArray(items) || items.length !== Math.max(0, Math.min(query.size, totalItems - query.page * query.size))) {
    throw new Error("Invalid sales page");
  }
  const ids = new Set<number>();
  for (const item of items as SalesListItem[]) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || ids.has(item.id)
      || typeof item.saleNumber !== "string" || !item.saleNumber.trim()
      || typeof item.soldAt !== "string" || !Number.isFinite(Date.parse(item.soldAt))
      || (item.status !== "COMPLETED" && item.status !== "VOIDED")
      || !Number.isFinite(item.totalAmount)) throw new Error("Invalid sale row");
    ids.add(item.id);
  }
  return { items, totalItems, totalPages, page: query.page, size: query.size };
}

export type SalesPeriod = "today" | "week" | "month";

export function salesPeriodDates(period: SalesPeriod, instant: string): { from: string; to: string } {
  const today = commercialDateAt(instant);
  if (!today) throw new Error("Invalid instant");
  const day = new Date(today + "T00:00:00Z");
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (period === "week") {
    day.setUTCDate(day.getUTCDate() - 6);
    return { from: iso(day), to: today };
  }
  if (period === "month") {
    day.setUTCMonth(day.getUTCMonth() + 1, 0);
    return { from: today.slice(0, 8) + "01", to: iso(day) };
  }
  return { from: today, to: today };
}

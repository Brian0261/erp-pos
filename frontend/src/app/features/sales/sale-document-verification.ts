import type { ElectronicDocumentResponse } from "../billing/data/billing.models";
import { isCommercialDate } from "../../shared/utils/commercial-date";
import { DOCUMENT_STATUS_OPTIONS } from "./sales-list-query";

const knownStates = new Set(DOCUMENT_STATUS_OPTIONS.map(([status]) => status));

export function latestSaleDocument(rows: ElectronicDocumentResponse[], saleId: number): ElectronicDocumentResponse | null {
  if (!Array.isArray(rows)) throw new Error("Invalid document list");
  let latest: ElectronicDocumentResponse | null = null;
  let latestInstant = "";
  for (const row of rows) {
    const timestamp = typeof row?.createdAt === "string"
      ? /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)(?:\.(\d{1,9}))?Z$/.exec(row.createdAt) : null;
    if (!row || row.saleId !== saleId || !Number.isSafeInteger(row.id) || row.id <= 0 || !timestamp
      || !isCommercialDate(timestamp[1].slice(0, 10))) throw new Error("Invalid document identity");
    // Compare the full Instant precision, then the same ID tie break used by the sales summary.
    const instant = timestamp[1] + "." + (timestamp[2] ?? "").padEnd(9, "0");
    if (!latest || instant > latestInstant || (instant === latestInstant && row.id > latest.id)) {
      latest = row;
      latestInstant = instant;
    }
  }
  if (latest && (!knownStates.has(latest.status) || !["INVOICE", "RECEIPT"].includes(latest.documentType)
    || !["LOCAL", "BETA", "PROD"].includes(latest.environment))) throw new Error("Invalid document state");
  return latest;
}

export function blocksInternalVoid(document: ElectronicDocumentResponse | null): boolean {
  return document !== null && !["REJECTED", "ERROR", "CANCELLED"].includes(document.status);
}

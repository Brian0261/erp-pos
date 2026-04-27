export type OutboxEventStatus = "PENDING" | "PUBLISHED" | "FAILED";

export type OutboxEventType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "STOCK_CHANGED"
  | "SALE_COMPLETED"
  | "SALE_VOIDED"
  | "PURCHASE_RECEIVED"
  | "QUOTE_CONVERTED"
  | "ELECTRONIC_DOCUMENT_ACCEPTED";

export interface OutboxEventResponse {
  id: number;
  eventType: OutboxEventType;
  aggregateType: string;
  aggregateId: string;
  payloadJson: string;
  status: OutboxEventStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface OutboxFilters {
  status?: OutboxEventStatus | null;
  eventType?: OutboxEventType | null;
}

export const OUTBOX_EVENT_STATUSES: OutboxEventStatus[] = [
  "PENDING",
  "PUBLISHED",
  "FAILED",
];

export const OUTBOX_EVENT_TYPES: OutboxEventType[] = [
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "STOCK_CHANGED",
  "SALE_COMPLETED",
  "SALE_VOIDED",
  "PURCHASE_RECEIVED",
  "QUOTE_CONVERTED",
  "ELECTRONIC_DOCUMENT_ACCEPTED",
];

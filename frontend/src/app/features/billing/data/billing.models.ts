export type BillingEnvironment = "LOCAL" | "BETA" | "PROD";

export type ElectronicDocumentType = "INVOICE" | "RECEIPT";

export type ElectronicDocumentStatus =
  | "DRAFT"
  | "GENERATED"
  | "SIGNED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "ERROR"
  | "CANCELLED";

export type BillingXmlFileType = "GENERATED" | "SIGNED";

export interface CompanyBillingProfileRequest {
  ruc: string;
  legalName: string;
  fiscalAddress: string;
  environment: BillingEnvironment;
  certificateSecretRef?: string | null;
  certificatePasswordSecretRef?: string | null;
  providerSecretRef?: string | null;
  certificateAlias?: string | null;
  secretProvider?: string | null;
  active?: boolean | null;
}

export interface CompanyBillingProfileResponse {
  id: number;
  ruc: string;
  legalName: string;
  fiscalAddress: string;
  environment: BillingEnvironment;
  certificateConfigured: boolean;
  providerConfigured: boolean;
  certificateAlias: string | null;
  secretProvider: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSeriesRequest {
  documentType: ElectronicDocumentType;
  series: string;
  currentNumber: number;
  environment: BillingEnvironment;
  active?: boolean | null;
}

export interface BillingSeriesResponse {
  id: number;
  documentType: ElectronicDocumentType;
  series: string;
  currentNumber: number;
  environment: BillingEnvironment;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateElectronicDocumentFromSaleRequest {
  documentType: ElectronicDocumentType;
  billingSeriesId: number;
  customerName?: string | null;
  customerDocument?: string | null;
}

export interface ElectronicDocumentItemResponse {
  id: number;
  productId: number;
  productName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface ElectronicDocumentResponse {
  id: number;
  saleId: number;
  billingSeriesId: number;
  documentType: ElectronicDocumentType;
  status: ElectronicDocumentStatus;
  environment: BillingEnvironment;
  series: string;
  number: number;
  fullNumber: string;
  customerName: string;
  customerDocument: string | null;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  xmlGeneratedAt: string | null;
  signedAt: string | null;
  sentAt: string | null;
  providerTicket: string | null;
  providerMessage: string | null;
  createdAt: string;
  updatedAt: string;
  items: ElectronicDocumentItemResponse[];
}

export interface ElectronicDocumentHistoryResponse {
  id: number;
  previousStatus: ElectronicDocumentStatus | null;
  newStatus: ElectronicDocumentStatus;
  message: string | null;
  changedAt: string;
  changedBy: string;
}

export interface BillingXmlResponse {
  id: number;
  fileType: BillingXmlFileType;
  fileName: string;
  mimeType: string;
  content: string;
  createdAt: string;
}

export interface ElectronicDocumentFilters {
  status?: ElectronicDocumentStatus | null;
  type?: ElectronicDocumentType | null;
  saleId?: number | null;
  from?: string | null;
  to?: string | null;
}

export const BILLING_ENVIRONMENTS: BillingEnvironment[] = [
  "LOCAL",
  "BETA",
  "PROD",
];

export const ELECTRONIC_DOCUMENT_TYPES: ElectronicDocumentType[] = [
  "RECEIPT",
  "INVOICE",
];

export const ELECTRONIC_DOCUMENT_STATUSES: ElectronicDocumentStatus[] = [
  "DRAFT",
  "GENERATED",
  "SIGNED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "ERROR",
  "CANCELLED",
];

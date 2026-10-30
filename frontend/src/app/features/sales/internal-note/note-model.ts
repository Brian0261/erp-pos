import { SaleResponse } from "../data/sales.models";

export const NOTE_CONFIG = {
  tradeName: "InkToy",
  heading: "NOTA DE VENTA",
  contact: "",
  thanks: "Gracias por tu compra.",
  logo: "assets/images/brand/logo-inktoy.png",
  color: "#000000",
  font: "Roboto",
  quickFormat: "a4" as NoteFormat | null,
} as const;
export const NOTE_PROFILES = {
  a4: { label: "A4", width: 595.28, height: 841.89, margin: 42.52 },
  ticket80: { label: "Ticket · papel 80 mm / útil 72 mm", width: 226.77, height: 566.93, margin: 11.34 },
  ticket58: { label: "Ticket · papel 58 mm / útil 50 mm", width: 164.41, height: 566.93, margin: 11.34 },
} as const;
export type NoteFormat = keyof typeof NOTE_PROFILES;
export interface NoteLine { name: string; source: string; quantity: string; price: string; discount: string; hasDiscount: boolean; total: string }
export interface InternalNote {
  id: number; number: string; status: "COMPLETED" | "VOIDED"; date: string; voidedDate: string | null;
  lines: NoteLine[];
  subtotal: string; discount: string; total: string; paid: string; change: string;
  payments: { method: string; amount: string }[];
}
const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
function money(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Importe persistido no disponible.");
  return currency.format(value);
}
// Explicit allow list. References, credentials, void reasons and billing/customer details never enter the document.
export function toInternalNote(sale: SaleResponse): InternalNote {
  if (!Number.isSafeInteger(sale.id) || sale.id <= 0 || !["COMPLETED", "VOIDED"].includes(sale.status)) {
    throw new Error("La venta no tiene un estado documental válido.");
  }
  return {
    id: sale.id, number: sale.saleNumber, status: sale.status,
    date: new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(sale.soldAt)) + " · Lima",
    voidedDate: sale.voidedAt ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(sale.voidedAt)) + " · Lima" : null,
    lines: sale.items.map(item => {
      if (typeof item.quantityText !== "string" || !/^\d+(?:\.\d+)?$/.test(item.quantityText)) {
        throw new Error("Cantidad exacta no disponible. Actualiza la venta e inténtalo de nuevo.");
      }
      const captured = item.productNameSnapshot != null;
      const skuCaptured = item.skuSnapshot != null;
      if (captured !== skuCaptured) throw new Error("La identidad histórica recibida está incompleta.");
      return { name: (captured ? item.productNameSnapshot : item.productName)?.trim() ? (captured ? item.productNameSnapshot! : item.productName!) : "Descripción no disponible",
        source: captured ? "" : "Histórico: nombre del catálogo actual; descripción original no disponible.",
        quantity: item.quantityText.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""), price: money(item.unitPrice), discount: money(item.discountAmount), hasDiscount: item.discountAmount !== 0, total: money(item.lineTotal) };
    }),
    subtotal: money(sale.subtotalAmount), discount: money(sale.discountAmount), total: money(sale.totalAmount),
    paid: money(sale.paidAmount), change: money(sale.changeAmount),
    payments: sale.payments.map(p => ({ method: ({ CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" })[p.paymentMethod], amount: money(p.amount) })),
  };
}
export function noteFilename(note: InternalNote, format: NoteFormat): string {
  return `InkToy-Nota-${note.number.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0,80)}-${format}${note.status === "VOIDED" ? "-ANULADA" : ""}.pdf`;
}

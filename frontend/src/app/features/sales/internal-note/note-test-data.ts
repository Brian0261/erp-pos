import { SaleResponse } from "../data/sales.models";
/** Synthetic fixture; never sent to a commercial endpoint. */
export function noteSale(count = 3, voided = false): SaleResponse {
  return { id: 81, saleNumber: "V-SYN-0081", status: voided ? "VOIDED" : "COMPLETED", cashRegisterSessionId: 7, warehouseId: 3,
    soldAt: "2026-10-28T02:20:00Z", createdBy: "cajero.sintetico", voidedAt: voided ? "2026-10-28T03:20:00Z" : null,
    voidedByUserId: null, voidReason: "NEVER_EXPORT_PRIVATE_REASON", subtotalAmount: 160.25, discountAmount: 10.25, totalAmount: 150,
    paidAmount: 160, changeAmount: 10,
    items: Array.from({ length: count }, (_,i) => ({ id: i+1, productId: i+1, productName: "CATÁLOGO MODIFICADO", sku: "CURRENT", barcode: "NEVER_EXPORT_BARCODE",
      productNameSnapshot: `Artículo ${String(i+1).padStart(3,"0")} · Cuaderno de diseño edición especial, lápices de color y útiles para ilustración — colección Ñandú`,
      skuSnapshot: `INK-SYN-${String(i+1).padStart(3,"0")}`, quantityText: i === 0 ? "0.125" : "1.250", quantity: 999,
      unitPrice: 20.05, discountAmount: 1.05, lineTotal: 24.01 })),
    payments: [{ id: 1, paymentMethod: "CASH", amount: 100, reference: "NEVER_EXPORT_BANK_REFERENCE", createdAt: "" },
      { id: 2, paymentMethod: "CARD", amount: 60, reference: "NEVER_EXPORT_BANK_REFERENCE", createdAt: "" }],
  };
}

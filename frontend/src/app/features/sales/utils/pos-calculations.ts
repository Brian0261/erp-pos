import { PaymentLine, PosCartItem } from "../data/pos-ui.models";

export function normalizePosNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export function normalizePosQuantity(value: unknown): number {
  const parsed = Math.floor(normalizePosNumber(value));
  return parsed > 0 ? parsed : 1;
}

export function calculatePosLineSubtotal(item: PosCartItem): number {
  return normalizePosNumber(item.salePrice) * normalizePosNumber(item.quantity);
}

export function calculatePosLineTotal(item: PosCartItem): number {
  return Math.max(
    calculatePosLineSubtotal(item) - normalizePosNumber(item.discountAmount),
    0,
  );
}

export function calculatePosSubtotal(cart: PosCartItem[]): number {
  return cart.reduce((acc, item) => acc + calculatePosLineSubtotal(item), 0);
}

export function calculatePosDiscountTotal(cart: PosCartItem[]): number {
  return cart.reduce(
    (acc, item) => acc + normalizePosNumber(item.discountAmount),
    0,
  );
}

export function calculatePosTotal(cart: PosCartItem[]): number {
  return Math.max(calculatePosSubtotal(cart) - calculatePosDiscountTotal(cart), 0);
}

export function calculatePosPaidTotal(payments: PaymentLine[]): number {
  return payments.reduce(
    (acc, payment) => acc + normalizePosNumber(payment.amount),
    0,
  );
}

export function calculatePosChange(cart: PosCartItem[], payments: PaymentLine[]): number {
  const total = calculatePosTotal(cart);
  const electronicPaid = calculatePosElectronicPaidTotal(payments);
  if (electronicPaid > total) {
    return 0;
  }
  const cashPaid = payments
    .filter(payment => payment.paymentMethod === "CASH")
    .reduce((sum, payment) => sum + Math.max(normalizePosNumber(payment.amount), 0), 0);
  return Math.min(cashPaid, Math.max(cashPaid - (total - electronicPaid), 0));
}

export function calculatePosElectronicPaidTotal(payments: PaymentLine[]): number {
  return payments
    .filter(payment => payment.paymentMethod === "CARD" || payment.paymentMethod === "TRANSFER")
    .reduce((sum, payment) => sum + Math.max(normalizePosNumber(payment.amount), 0), 0);
}

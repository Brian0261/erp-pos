import { PaymentLine, PosCartItem } from "../data/pos-ui.models";
import { checkedMoney, decimalText, moneyCents, quantityHundredths, scaledNumber, stockMillis, PosDecimalError } from "./pos-decimal";

export function normalizePosNumber(value: unknown): number {
  if (value === "" || value === null || value === undefined) return NaN;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return parsed;
}

export function normalizePosQuantity(value: unknown, policy: unknown): number {
  return scaledNumber(quantityHundredths(value, policy));
}

function posLineGrossCents(item: PosCartItem): bigint {
  const price = moneyCents(item.salePriceInput ?? item.salePrice, "Precio");
  const quantity = quantityHundredths(item.quantityInput ?? item.quantity, item.quantityPolicy);
  const gross = checkedMoney((price * quantity + 50n) / 100n);
  if (price > 0n && gross === 0n) throw new PosDecimalError("El subtotal positivo es inferior a un céntimo; aumenta la cantidad.");
  return gross;
}
export function posLineCents(item: PosCartItem): { gross: bigint; discount: bigint; net: bigint } {
  const gross = posLineGrossCents(item);
  const discount = moneyCents(item.discountInput ?? item.discountAmount, "El descuento");
  if (discount > gross) throw new PosDecimalError("El descuento no puede superar el subtotal del producto.");
  return { gross, discount, net: gross - discount };
}

export function posTotalCents(cart: PosCartItem[]): bigint {
  return checkedMoney(cart.reduce((sum, item) => sum + posLineCents(item).net, 0n));
}
export function posPaidCents(payments: PaymentLine[], electronicOnly = false): bigint {
  return checkedMoney(payments.reduce((sum, payment) => {
    if (!["CASH", "CARD", "TRANSFER"].includes(payment.paymentMethod)) throw new PosDecimalError("Método de pago no válido.");
    const cents = moneyCents(payment.amountInput ?? payment.amount, "El pago");
    return sum + (electronicOnly && payment.paymentMethod === "CASH" ? 0n : cents);
  }, 0n));
}
/** Invalid inputs remain invalid; presentation must not turn them into zero. */
function view(calculate: () => bigint): number {
  try { return scaledNumber(calculate()); } catch { return NaN; }
}
export function calculatePosLineSubtotal(item: PosCartItem): number {
  return view(() => posLineGrossCents(item));
}
export function calculatePosLineTotal(item: PosCartItem): number { return view(() => posLineCents(item).net); }
export function calculatePosSubtotal(cart: PosCartItem[]): number {
  return view(() => checkedMoney(cart.reduce((sum, item) => sum + posLineGrossCents(item), 0n)));
}
export function calculatePosDiscountTotal(cart: PosCartItem[]): number {
  return view(() => checkedMoney(cart.reduce((sum, item) => sum + moneyCents(item.discountInput ?? item.discountAmount, "El descuento"), 0n)));
}
export function calculatePosTotal(cart: PosCartItem[]): number { return view(() => posTotalCents(cart)); }
export function calculatePosPaidTotal(payments: PaymentLine[]): number { return view(() => posPaidCents(payments)); }
export function calculatePosElectronicPaidTotal(payments: PaymentLine[]): number { return view(() => posPaidCents(payments, true)); }
export function calculatePosChange(cart: PosCartItem[], payments: PaymentLine[]): number {
  return view(() => {
    const total = posTotalCents(cart);
    const paid = posPaidCents(payments);
    const electronic = posPaidCents(payments, true);
    return electronic > total || paid < total ? 0n : paid - total;
  });
}
export function calculatePosRemaining(total: number, paid: number): number {
  return view(() => {
    const remaining = moneyCents(total) - moneyCents(paid);
    return remaining > 0n ? remaining : 0n;
  });
}
export function canPosStep(item: PosCartItem, direction: 1 | -1): boolean {
  try {
    const quantity = quantityHundredths(item.quantityInput ?? item.quantity, item.quantityPolicy);
    const next = quantity + BigInt(direction) * (item.quantityPolicy === "DECIMAL_2" ? 1n : 100n);
    return next > 0n && next * 10n <= stockMillis(item.stockInput ?? item.stockAvailable);
  } catch { return false; }
}
export function posUnitPriceText(item: PosCartItem): string {
  const original = item.salePriceInput ?? item.salePrice;
  try { return decimalText(moneyCents(original, "Precio")); }
  catch { return `No válido (${String(original)})`; }
}

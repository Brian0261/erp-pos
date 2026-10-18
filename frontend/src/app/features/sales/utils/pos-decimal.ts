import { QuantityPolicy } from "../../catalog/data/catalog.models";

export const MAX_MONEY_CENTS = 99_999_999_999_999n;
const MAX_QUANTITY_HUNDREDTHS = 999_999_999_999_999n;
const MAX_STOCK_MILLIS = 9_999_999_999_999_999n;

export class PosDecimalError extends Error {}

/** Parse decimal text before doing arithmetic. Never round an input. */
export function decimalUnits(value: unknown, scale: number, capacity: bigint, label: string): bigint {
  if ((typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "number" && !Number.isFinite(value))) {
    throw new PosDecimalError(`${label}: usa un valor decimal válido y finito.`);
  }
  const text = String(value).trim();
  if (!text || text.length > 1100) throw new PosDecimalError(`${label}: valor decimal no válido.`);
  const match = /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) throw new PosDecimalError(`${label}: valor decimal no válido.`);
  const exponent = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) {
    throw new PosDecimalError(`${label}: exponente fuera de capacidad.`);
  }
  const [whole, fraction = ""] = match[2].split(".");
  let digits = (whole + fraction).replace(/^0+/, "") || "0";
  if (digits === "0") return 0n;
  const power = scale + exponent - fraction.length;
  if (power < 0) {
    const discard = -power;
    if (discard > digits.length || /[1-9]/.test(digits.slice(-discard))) {
      throw new PosDecimalError(`${label}: admite como máximo ${scale} decimales, sin redondear.`);
    }
    digits = digits.slice(0, digits.length - discard) || "0";
  } else {
    if (digits.length + power > capacity.toString().length) {
      throw new PosDecimalError(`${label}: importe o cantidad fuera de capacidad.`);
    }
    digits += "0".repeat(power);
  }
  let units = BigInt(digits);
  if (units > capacity) throw new PosDecimalError(`${label}: importe o cantidad fuera de capacidad.`);
  if (match[1] === "-") units = -units;
  return units;
}

export function moneyCents(value: unknown, label = "Importe"): bigint {
  const cents = decimalUnits(value, 2, MAX_MONEY_CENTS, label);
  if (cents < 0n) throw new PosDecimalError(`${label}: debe ser mayor o igual que 0.`);
  return cents;
}
export function checkedMoney(cents: bigint): bigint {
  if (cents < 0n || cents > MAX_MONEY_CENTS) throw new PosDecimalError("El importe total está fuera de capacidad.");
  return cents;
}
export function isQuantityPolicy(value: unknown): value is QuantityPolicy {
  return value === "WHOLE" || value === "DECIMAL_2" || value === "LEGACY_UNCLASSIFIED";
}
export function quantityHundredths(value: unknown, policy: unknown): bigint {
  if (!isQuantityPolicy(policy)) throw new PosDecimalError("No se recibió la política de cantidad; vuelve a buscar el producto.");
  const quantity = decimalUnits(value, 2, MAX_QUANTITY_HUNDREDTHS, "La cantidad");
  if (quantity <= 0n) throw new PosDecimalError("La cantidad debe ser mayor que 0.");
  if (policy !== "DECIMAL_2" && quantity % 100n !== 0n) {
    throw new PosDecimalError("La cantidad debe ser entera para esta unidad.");
  }
  return quantity;
}
export function stockMillis(value: unknown): bigint {
  const stock = decimalUnits(value, 3, MAX_STOCK_MILLIS, "Stock disponible");
  if (stock < 0n) throw new PosDecimalError("El stock disponible no puede ser negativo.");
  return stock;
}
export function scaledNumber(units: bigint, scale = 2): number {
  if (units > BigInt(Number.MAX_SAFE_INTEGER) || units < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new PosDecimalError("Valor fuera de capacidad segura.");
  }
  return Number(units) / 10 ** scale;
}
export function decimalText(units: bigint, scale = 2): string {
  const sign = units < 0n ? "-" : "";
  const digits = (units < 0n ? -units : units).toString().padStart(scale + 1, "0");
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
export function quantityStep(policy: unknown): number { return policy === "DECIMAL_2" ? 0.01 : 1; }
export function availableQuantity(stock: unknown, policy: unknown): number {
  if (!isQuantityPolicy(policy)) throw new PosDecimalError("Falta la política de cantidad.");
  const millis = stockMillis(stock);
  // Derive the sellable grid from stock; never truncate a requested quantity.
  const hundredths = policy === "DECIMAL_2" ? millis / 10n : (millis / 1000n) * 100n;
  return scaledNumber(hundredths);
}

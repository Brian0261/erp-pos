import { PosCartItem } from "../data/pos-ui.models";
import { PosProductResponse } from "../data/sales.models";
import { posLineCents, posTotalCents } from "./pos-calculations";
import { decimalText, isQuantityPolicy, moneyCents, quantityHundredths, stockMillis } from "./pos-decimal";

const policyLabel = (policy: unknown): string => policy === "WHOLE" ? "unidades enteras"
  : policy === "DECIMAL_2" ? "cantidades con hasta dos decimales"
  : policy === "LEGACY_UNCLASSIFIED" ? "unidades enteras con clasificación pendiente" : "sin verificar";

/** Reviews the existing read contract; it does not authorize checkout or repair customer inputs. */
export function reviewCartConditions(original: PosCartItem[], products: PosProductResponse[]) {
  if (!Array.isArray(products) || new Set(products.map(p => p.productId)).size !== products.length
      || products.some(p => !original.some(item => item.productId === p.productId))) throw new Error("Respuesta de productos incompatible.");
  const differences: string[] = [], issues: string[] = [];
  const proposed = original.map(item => {
    const product = products.find(p => p.productId === item.productId);
    if (!product) { issues.push(`${item.name}: no está disponible en esta consulta. Retira el producto o vuelve a consultarlo antes de cobrar.`); return item; }
    if (!isQuantityPolicy(product.quantityPolicy)) throw new Error("No se pudo verificar la política de cantidad.");
    const price = moneyCents(product.salePrice), stock = stockMillis(product.stockAvailable);
    const updated: PosCartItem = { ...item, salePrice: product.salePrice, salePriceInput: undefined,
      quantityPolicy: product.quantityPolicy, stockAvailable: product.stockAvailable, stockInput: undefined, requiresRevalidation: false };
    try {
      const quantity = quantityHundredths(item.quantityInput ?? item.quantity, product.quantityPolicy);
      posLineCents(updated);
      if (quantity * 10n > stock) issues.push(`${item.name}: cantidad solicitada ${item.quantityInput ?? item.quantity}; stock disponible ${product.stockAvailable}. Corrige la cantidad o retira el producto; no la ajustamos automáticamente.`);
    } catch (error) { issues.push(`${item.name}: ${error instanceof Error ? error.message : 'condición incompatible'} Corrige el carrito antes de continuar.`); }
    let previousPrice: bigint | null = null;
    try { previousPrice = moneyCents(item.salePriceInput ?? item.salePrice); } catch { /* An invalid saved price requires explicit review. */ }
    if (previousPrice !== price) differences.push(`${item.name}: precio ${previousPrice === null ? 'sin verificar' : 'S/ ' + decimalText(previousPrice)} → S/ ${decimalText(price)}.`);
    if (item.quantityPolicy !== product.quantityPolicy) differences.push(`${item.name}: cantidad ${policyLabel(item.quantityPolicy)} → ${policyLabel(product.quantityPolicy)}.`);
    return updated;
  });
  return { proposed, differences, issues, total: issues.length ? null : posTotalCents(proposed) };
}

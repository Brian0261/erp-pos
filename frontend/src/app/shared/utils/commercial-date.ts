/** Commercial calendar only; never use these helpers to rewrite persisted timestamps. */
export const COMMERCIAL_ZONE = "America/Lima";
const timestampFormat = new Intl.DateTimeFormat("es-PE", { timeZone: COMMERCIAL_ZONE,
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export function isCommercialDate(value: string): boolean {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function commercialDateAt(instant: string): string | null {
  const now = new Date(instant);
  if (!Number.isFinite(now.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", { timeZone: COMMERCIAL_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function formatCommercialInstant(value: string | null): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? timestampFormat.format(date) : "No disponible";
}
export function formatCommercialDay(value: string): string {
  return isCommercialDate(value) ? value.split("-").reverse().join("/") : "No disponible";
}

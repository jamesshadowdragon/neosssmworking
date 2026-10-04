export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Number of units a stored service rate covers (1 or 1000). */
export function rateBasisOf(value: number | string | null | undefined) {
  const basis = Number(value ?? 1);
  return Number.isFinite(basis) && basis >= 1 ? Math.round(basis) : 1;
}

/** Exact source rate, formatted without silently collapsing a per-1,000 rate to a per-unit one. */
export function formatRate(
  price: number | string | null | undefined,
  basis: number | string | null | undefined,
  unit?: string | null,
) {
  const amount = Number(price ?? 0);
  const per = rateBasisOf(basis);
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number.isFinite(amount) ? amount : 0);
  if (per > 1) return `${money} per ${per.toLocaleString()}${unit ? ` ${unit}s` : ""}`;
  return `${money} / ${unit ?? "unit"}`;
}

/** total = (quantity / rate basis) × rate, rounded only at the currency level. */
export function orderTotal(
  price: number | string | null | undefined,
  basis: number | string | null | undefined,
  quantity: number | string | null | undefined,
) {
  const rate = Number(price ?? 0);
  const qty = Number(quantity ?? 0);
  if (!Number.isFinite(rate) || !Number.isFinite(qty)) return 0;
  return Math.round(((rate * qty) / rateBasisOf(basis)) * 100) / 100;
}

/** Comparable price for sorting services priced on different bases. */
export function unitPriceOf(
  price: number | string | null | undefined,
  basis: number | string | null | undefined,
) {
  return Number(price ?? 0) / rateBasisOf(basis);
}

export function formatQuantityRange(min: number, max: number) {
  return `Min: ${min.toLocaleString()} • Max: ${max.toLocaleString()}`;
}

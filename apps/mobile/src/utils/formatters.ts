/** Display formatters. Money is stored in minor units (paise) to avoid float drift. */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 125000 (paise) -> "₹1,250". Null -> "—". */
export function formatMinor(amountMinor: number | null): string {
  if (amountMinor === null) return "—";
  return INR.format(amountMinor / 100);
}

/** ISO -> "10 Jun 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** ISO -> "10 Jun, 5:30 PM". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString(
    "en-IN",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

export function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "na") return "";
  return "$" + Number(v).toLocaleString();
}

/** Formats a percent-change value with an explicit +/- sign, e.g. "+1.2%". */
export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

/** Formats a money input field's raw text as the user types: strips
 * anything but digits/one decimal point and inserts thousands commas.
 * Leaves the "na" sentinel (used for "not applicable" amounts in this
 * dataset) untouched so it isn't silently blanked out. */
export function formatMoneyInput(raw: string): string {
  if (raw.trim().toLowerCase() === "na") return raw;
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  const [intPart, decPart] = cleaned.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

/** Reverses formatMoneyInput before the value is sent to the API, which
 * expects a plain numeric string (or the "na" sentinel). */
export function parseMoneyInput(formatted: string): string {
  if (formatted.trim().toLowerCase() === "na") return formatted;
  return formatted.replace(/,/g, "");
}

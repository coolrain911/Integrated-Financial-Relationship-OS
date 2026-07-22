export function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "na") return "";
  return "$" + Number(v).toLocaleString();
}

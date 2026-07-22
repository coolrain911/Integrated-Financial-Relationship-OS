import type { ClientDTO, ColumnDTO, ProspectDTO } from "./types";

export type ClientRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  policy: string | null;
  issue_date: string | null;
  carrier: string | null;
  product: string | null;
  face_amount: string | null;
  premium: string | null;
  av: string | null;
  needs_review: boolean;
  review_reason: string | null;
  comment: string | null;
  note: string | null;
  reviewed: boolean;
  birthday_month: number | null;
  birthday_day: number | null;
};

export type ProspectRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  segment: string;
  note: string | null;
};

export type ColumnRow = {
  id: number;
  num: number | null;
  title: string;
  category: string | null;
  file: string | null;
};

function toNumberOrStr(raw: string | null): number | string | null {
  if (raw === null) return null;
  if (raw === "na") return "na";
  const n = raw.includes(".") ? parseFloat(raw) : parseInt(raw, 10);
  return Number.isNaN(n) ? raw : n;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Builds a UTC date for (year, month, day), falling back to Feb 28 if the
 * day doesn't exist in that year (i.e. Feb 29 in a non-leap year). */
function safeUtcDate(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return d;
}

export function computeAnniversary(
  issueDate: string | null,
  today: Date
): { anniv: string | null; daysToAnniv: number | null } {
  if (!issueDate) return { anniv: null, daysToAnniv: null };
  const month = parseInt(issueDate.slice(5, 7), 10);
  const day = parseInt(issueDate.slice(8, 10), 10);
  if (Number.isNaN(month) || Number.isNaN(day)) {
    return { anniv: null, daysToAnniv: null };
  }

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  let anniv = safeUtcDate(today.getUTCFullYear(), month, day);
  if (anniv.getTime() < todayUtc) {
    anniv = safeUtcDate(today.getUTCFullYear() + 1, month, day);
  }

  const daysToAnniv = Math.round((anniv.getTime() - todayUtc) / 86400000);
  return { anniv: toIsoDate(anniv), daysToAnniv };
}

export function clientRowToDto(row: ClientRow, today: Date): ClientDTO {
  const { anniv, daysToAnniv } = computeAnniversary(row.issue_date, today);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    note: row.note,
    age: row.age,
    policy: row.policy,
    issueDate: row.issue_date,
    anniv,
    daysToAnniv,
    carrier: row.carrier,
    product: row.product,
    faceAmount: toNumberOrStr(row.face_amount),
    premium: toNumberOrStr(row.premium),
    av: toNumberOrStr(row.av),
    // needsReview/reviewReason are preserved as computed at seed time.
    // Recomputing them requires the raw design-projection/loan-flag inputs,
    // which are not part of the current data source.
    needsReview: row.needs_review,
    reviewReason: row.review_reason,
    comment: row.comment,
    reviewed: row.reviewed,
    birthdayMonth: row.birthday_month,
    birthdayDay: row.birthday_day,
  };
}

export function prospectRowToDto(row: ProspectRow): ProspectDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    segment: row.segment,
    note: row.note,
  };
}

export function columnRowToDto(row: ColumnRow): ColumnDTO {
  return {
    id: row.id,
    num: row.num,
    title: row.title,
    category: row.category,
    file: row.file,
  };
}

/** Names are stored "LastName FirstName [MiddleInitial]" (e.g. "Park Chul J"),
 * so the first token is the last name. Sort on that first, case-insensitively,
 * falling back to the full name to break ties. */
export function compareByLastName(a: ClientDTO, b: ClientDTO): number {
  const lastNameOf = (name: string) => (name || "").split(" ")[0] ?? "";
  const la = lastNameOf(a.name).toLowerCase();
  const lb = lastNameOf(b.name).toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  const na = (a.name || "").toLowerCase();
  const nb = (b.name || "").toLowerCase();
  return na < nb ? -1 : na > nb ? 1 : 0;
}

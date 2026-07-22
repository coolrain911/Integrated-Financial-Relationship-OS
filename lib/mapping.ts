import type {
  AgeBracket,
  AnnuityType,
  ColumnDTO,
  Gender,
  LifeType,
  OptionType,
  PersonDTO,
  PolicyCategory,
  PolicyDTO,
  PremiumMethod,
  ProspectDTO,
} from "./types";

export type PersonRow = {
  id: number;
  last_name: string;
  first_name: string | null;
  gender: string | null;
  dob: string | null;
  occupation: string | null;
  medicare: boolean | null;
  email: string | null;
  phone: string | null;
  note: string | null;
};

export type PolicyRow = {
  id: number;
  person_id: number;
  policy_number: string | null;
  issue_date: string | null;
  carrier: string | null;
  product: string | null;
  category: string;
  life_type: string | null;
  option_type: string | null;
  death_benefit: string | null;
  total_premium: string | null;
  premium_method: string | null;
  annual_premium: string | null;
  annuity_type: string | null;
  initial_premium: string | null;
  additional_premium: string | null;
  account_value: string | null;
  surrender_value: string | null;
  loan_or_withdrawal: boolean | null;
  needs_review: boolean;
  review_reason: string | null;
  comment: string | null;
  note: string | null;
  reviewed: boolean;
};

// PolicyRow joined with its person's name, as returned by the
// policies-list query used for the Current Client table.
export type PolicyWithNameRow = PolicyRow & {
  people: { last_name: string; first_name: string | null } | null;
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

/** Whole years elapsed from `fromDate` to `today` (age-style: only counts a
 * year once the month/day has actually passed). */
function wholeYearsElapsed(fromDate: string, today: Date): number {
  const month = parseInt(fromDate.slice(5, 7), 10);
  const day = parseInt(fromDate.slice(8, 10), 10);
  const year = parseInt(fromDate.slice(0, 4), 10);
  if ([year, month, day].some((n) => Number.isNaN(n))) return 0;

  let years = today.getUTCFullYear() - year;
  const anniversaryThisYear = safeUtcDate(today.getUTCFullYear(), month, day);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (anniversaryThisYear.getTime() > todayUtc) years -= 1;
  return Math.max(years, 0);
}

export function computeAgeBracket(dob: string | null, today: Date): AgeBracket | null {
  if (!dob) return null;
  const age = wholeYearsElapsed(dob, today);
  if (age < 20) return "20대 미만";
  if (age < 30) return "20대";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  if (age < 70) return "60대";
  return "70대 이상";
}

export function computePeriodYears(issueDate: string | null, today: Date): number | null {
  if (!issueDate) return null;
  return wholeYearsElapsed(issueDate, today);
}

export function personRowToDto(row: PersonRow, today: Date): PersonDTO {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    gender: (row.gender as Gender | null) ?? null,
    dob: row.dob,
    ageBracket: computeAgeBracket(row.dob, today),
    occupation: row.occupation,
    medicare: row.medicare,
    email: row.email,
    phone: row.phone,
    note: row.note,
  };
}

export function policyRowToDto(row: PolicyWithNameRow, today: Date): PolicyDTO {
  const { anniv, daysToAnniv } = computeAnniversary(row.issue_date, today);
  return {
    id: row.id,
    personId: row.person_id,
    lastName: row.people?.last_name ?? "",
    firstName: row.people?.first_name ?? null,
    policyNumber: row.policy_number,
    issueDate: row.issue_date,
    anniv,
    daysToAnniv,
    periodYears: computePeriodYears(row.issue_date, today),
    carrier: row.carrier,
    product: row.product,
    category: row.category as PolicyCategory,
    lifeType: row.life_type as LifeType | null,
    optionType: row.option_type as OptionType | null,
    deathBenefit: toNumberOrStr(row.death_benefit),
    totalPremium: toNumberOrStr(row.total_premium),
    premiumMethod: row.premium_method as PremiumMethod | null,
    annualPremium: toNumberOrStr(row.annual_premium),
    annuityType: row.annuity_type as AnnuityType | null,
    initialPremium: toNumberOrStr(row.initial_premium),
    additionalPremium: toNumberOrStr(row.additional_premium),
    accountValue: toNumberOrStr(row.account_value),
    surrenderValue: toNumberOrStr(row.surrender_value),
    loanOrWithdrawal: row.loan_or_withdrawal,
    // needsReview/reviewReason are preserved as computed at seed time.
    // Recomputing them requires the raw design-projection inputs, which are
    // not part of the current data source.
    needsReview: row.needs_review,
    reviewReason: row.review_reason,
    comment: row.comment,
    note: row.note,
    reviewed: row.reviewed,
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

/** Case-insensitive last-name-first sort, matching how names are entered
 * throughout this app ("LastName FirstName"). */
export function compareByLastName(a: { lastName: string; firstName: string | null }, b: { lastName: string; firstName: string | null }): number {
  const la = (a.lastName || "").toLowerCase();
  const lb = (b.lastName || "").toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  const fa = (a.firstName || "").toLowerCase();
  const fb = (b.firstName || "").toLowerCase();
  return fa < fb ? -1 : fa > fb ? 1 : 0;
}

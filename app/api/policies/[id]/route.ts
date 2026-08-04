import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { policyRowToDto, type PolicyWithNameRow } from "@/lib/mapping";
import type { PolicyUpdateBody } from "@/lib/types";
import {
  ANNUITY_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  LIFE_TYPE_OPTIONS,
  OPTION_TYPE_OPTIONS,
  PREMIUM_METHOD_OPTIONS,
} from "@/lib/options";

const CATEGORY_VALUES: readonly string[] = CATEGORY_OPTIONS;
const LIFE_TYPE_VALUES: readonly string[] = LIFE_TYPE_OPTIONS;
const OPTION_TYPE_VALUES: readonly string[] = OPTION_TYPE_OPTIONS;
const PREMIUM_METHOD_VALUES: readonly string[] = PREMIUM_METHOD_OPTIONS;
const ANNUITY_TYPE_VALUES: readonly string[] = ANNUITY_TYPE_OPTIONS;

function checkEnum(value: unknown, allowed: string[], field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

async function loadPolicy(id: number) {
  return getSupabaseAdmin()
    .from("policies")
    .select("*, people(last_name, first_name, dob, email, grade)")
    .eq("id", id)
    .maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const policyId = Number(id);
  if (!Number.isInteger(policyId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { data, error } = await loadPolicy(policyId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "policy not found" }, { status: 404 });
  }

  return NextResponse.json(policyRowToDto(data as unknown as PolicyWithNameRow, new Date()));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const policyId = Number(id);
  if (!Number.isInteger(policyId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: PolicyUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  for (const [value, allowed, field] of [
    [body.category, CATEGORY_VALUES, "category"],
    [body.lifeType, LIFE_TYPE_VALUES, "lifeType"],
    [body.optionType, OPTION_TYPE_VALUES, "optionType"],
    [body.premiumMethod, PREMIUM_METHOD_VALUES, "premiumMethod"],
    [body.annuityType, ANNUITY_TYPE_VALUES, "annuityType"],
  ] as const) {
    const err = checkEnum(value, allowed as unknown as string[], field);
    if (err) return NextResponse.json({ detail: err }, { status: 400 });
  }

  const columnMap: Record<string, string> = {
    policyNumber: "policy_number",
    issueDate: "issue_date",
    carrier: "carrier",
    product: "product",
    category: "category",
    lifeType: "life_type",
    optionType: "option_type",
    deathBenefit: "death_benefit",
    totalPremium: "total_premium",
    premiumMethod: "premium_method",
    annualPremium: "annual_premium",
    annuityType: "annuity_type",
    initialPremium: "initial_premium",
    additionalPremium: "additional_premium",
    accountValue: "account_value",
    surrenderValue: "surrender_value",
    loanOrWithdrawal: "loan_or_withdrawal",
    surrendered: "surrendered",
    needsAttention: "needs_attention",
    policyChanged: "policy_changed",
    changeNeeded: "change_needed",
    comment: "comment",
    note: "note",
    reviewed: "reviewed",
  };

  const updates: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[column] = (body as Record<string, unknown>)[key];
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.from("policies").update(updates).eq("id", policyId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await loadPolicy(policyId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "policy not found" }, { status: 404 });
  }

  return NextResponse.json(policyRowToDto(data as unknown as PolicyWithNameRow, new Date()));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const policyId = Number(id);
  if (!Number.isInteger(policyId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { error, count } = await getSupabaseAdmin()
    .from("policies")
    .delete({ count: "exact" })
    .eq("id", policyId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ detail: "policy not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

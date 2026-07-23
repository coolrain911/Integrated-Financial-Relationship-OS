import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { compareByLastName, policyRowToDto, type PolicyWithNameRow } from "@/lib/mapping";
import type { PolicyCreateBody } from "@/lib/types";
import {
  ANNUITY_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  LIFE_TYPE_OPTIONS,
  OPTION_TYPE_OPTIONS,
  PREMIUM_METHOD_OPTIONS,
} from "@/lib/options";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("policies")
    .select("*, people(last_name, first_name)");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const today = new Date();
  const dtos = (data as unknown as PolicyWithNameRow[]).map((row) => policyRowToDto(row, today));
  dtos.sort(compareByLastName);
  return NextResponse.json(dtos);
}

function checkEnum(value: unknown, allowed: readonly string[], field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: PolicyCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!Number.isInteger(body.personId)) {
    return NextResponse.json({ detail: "personId is required" }, { status: 400 });
  }

  for (const [value, allowed, field] of [
    [body.category, CATEGORY_OPTIONS, "category"],
    [body.lifeType, LIFE_TYPE_OPTIONS, "lifeType"],
    [body.optionType, OPTION_TYPE_OPTIONS, "optionType"],
    [body.premiumMethod, PREMIUM_METHOD_OPTIONS, "premiumMethod"],
    [body.annuityType, ANNUITY_TYPE_OPTIONS, "annuityType"],
  ] as const) {
    const err = checkEnum(value, allowed, field);
    if (err) return NextResponse.json({ detail: err }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("policies")
    .insert({
      person_id: body.personId,
      policy_number: body.policyNumber ?? null,
      issue_date: body.issueDate ?? null,
      carrier: body.carrier ?? null,
      product: body.product ?? null,
      category: body.category ?? "Life",
      life_type: body.lifeType ?? null,
      option_type: body.optionType ?? null,
      death_benefit: body.deathBenefit ?? null,
      total_premium: body.totalPremium ?? null,
      premium_method: body.premiumMethod ?? null,
      annual_premium: body.annualPremium ?? null,
      annuity_type: body.annuityType ?? null,
      initial_premium: body.initialPremium ?? null,
      additional_premium: body.additionalPremium ?? null,
      account_value: body.accountValue ?? null,
      surrender_value: body.surrenderValue ?? null,
      loan_or_withdrawal: body.loanOrWithdrawal ?? null,
      comment: body.comment ?? null,
      note: body.note ?? null,
    })
    .select("*, people(last_name, first_name)")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(policyRowToDto(data as unknown as PolicyWithNameRow, new Date()));
}

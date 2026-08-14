/** Builds a Gmail web-compose URL with the given addresses pre-filled as
 * BCC. Unlike a mailto: link — which hands off to whatever the OS has
 * registered as the default mail app (e.g. Outlook) — this always opens
 * Gmail in the browser, using whichever Google account is signed in there.
 * subject/body are optional — Gmail pre-fills its own compose form with
 * them (and still appends the signed-in account's saved signature). */
export function buildGmailComposeUrl(
  emails: string[],
  options?: { subject?: string; body?: string }
): string {
  const unique = Array.from(new Set(emails.filter(Boolean)));
  const params = new URLSearchParams({ view: "cm", fs: "1", bcc: unique.join(",") });
  if (options?.subject) params.set("su", options.subject);
  if (options?.body) params.set("body", options.body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Builds a subject + body for a single policy's periodic review email,
 * filling in whatever we actually have on file (issue date, period,
 * premium, account value). Figures we don't track — like an illustration's
 * originally projected value — are left as a blank for the advisor to
 * fill in before sending. */
export function buildPolicyReviewEmail(policy: {
  policyNumber: string | null;
  issueDate: string | null;
  periodYears: number | null;
  category: "Life" | "Annuity";
  totalPremium: number | string | null;
  initialPremium: number | string | null;
  additionalPremium: number | string | null;
  accountValue: number | string | null;
}): { subject: string; body: string } {
  const policyLabel = policy.policyNumber || "정책";
  const subject = `Policy ${policyLabel} - 중간 Review`;

  let issuedLine = `가입하신 Policy ${policyLabel}`;
  if (policy.issueDate) {
    const [year, month] = policy.issueDate.split("-");
    issuedLine = `${year}년 ${Number(month)}월에 가입하신 Policy ${policyLabel}`;
  }
  if (policy.periodYears !== null) {
    issuedLine += `가 ${policy.periodYears}년이 되었습니다.`;
  } else {
    issuedLine += "의 중간 점검을 안내드립니다.";
  }

  const premiumTotal =
    policy.category === "Annuity"
      ? addMoney(policy.initialPremium, policy.additionalPremium)
      : toDisplayMoney(policy.totalPremium);

  const lines = [
    "안녕하세요, 박찬우입니다.",
    "",
    issuedLine,
    "Review 결과 애초에 계획했던 것보다 Accumulation 상황이 [ 좋습니다 / 아쉽습니다 ].",
    "",
    premiumTotal ? `총 납입금: ${premiumTotal}` : "총 납입금: ",
    `Account Value: ${toDisplayMoney(policy.accountValue)}`,
    "Illustration 예상 Value: ",
    "",
    "현재 Policy를 변경하거나 전반적인 Review가 필요하시거나 궁금하신 사항이 있으시면 연락 주세요.",
  ];

  return { subject, body: lines.join("\n") };
}

function toDisplayMoney(v: number | string | null): string {
  if (v === null || v === "na") return "";
  const n = Number(v);
  return Number.isNaN(n) ? "" : "$" + n.toLocaleString();
}

function addMoney(a: number | string | null, b: number | string | null): string {
  const na = a === null || a === "na" ? 0 : Number(a);
  const nb = b === null || b === "na" ? 0 : Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return "";
  const sum = na + nb;
  return sum ? "$" + sum.toLocaleString() : "";
}

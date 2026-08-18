export const GENDER_OPTIONS = ["남", "여"] as const;

export const OCCUPATION_PRESETS = [
  "직장인",
  "직장인 (서비스업)",
  "자영업/사업",
  "전문직",
  "은퇴",
  "주부",
  "학생",
  "무직",
];

export const CONTACT_CHANNEL_PRESETS = [
  "소개",
  "모임/골프",
  "교회",
  "전화/이메일 연락",
  "명함",
  "기타",
];

export const CATEGORY_OPTIONS = ["Life", "Annuity"] as const;
export const LIFE_TYPE_OPTIONS = ["Term", "UL", "IUL"] as const;
export const OPTION_TYPE_OPTIONS = ["A", "B", "B->A"] as const;
export const PREMIUM_METHOD_OPTIONS = ["월납", "분기납", "반기납", "연납", "일시납"] as const;
export const ANNUITY_TYPE_OPTIONS = ["IRA", "Roth IRA", "SEP IRA", "Non-Qualified"] as const;

export const KNOWLEDGE_CATEGORY_PRESETS = ["부동산", "해외자산", "세금", "FAFSA", "기타"];

export const LICENSE_CERT_CATEGORY_OPTIONS = ["License", "Register", "CE", "E&O"] as const;

export const COLUMN_CATEGORY_OPTIONS = [
  "Life Insurance",
  "Annuity",
  "절세(Tax Savings)",
  "Qualified Plan/IRA Rollover",
  "학자금(FAFSA)",
  "은퇴준비",
  "상속/증여",
  "자산운용/투자",
  "Medicare/LTC",
  "기타",
] as const;

// 백화점 VVIP/VIP 등급을 응용한 고객 등급. 이름(A/B/C/D)은 우선 고정하고, 의미는
// 나중에 바뀔 수 있어 설명 문구만 별도로 둔다.
export const PERSON_GRADE_OPTIONS = ["A", "B", "C", "D"] as const;
export const PERSON_GRADE_DESCRIPTIONS: Record<(typeof PERSON_GRADE_OPTIONS)[number], string> = {
  A: "가장 충성도 높은 고객",
  B: "충성 고객은 아니지만 관리하면 좋아질 고객",
  C: "보통",
  D: "신경을 덜 써도 되는 고객",
};

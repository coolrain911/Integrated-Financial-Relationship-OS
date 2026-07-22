export type Gender = "남" | "여";
export type AgeBracket = "20대 미만" | "20대" | "30대" | "40대" | "50대" | "60대" | "70대 이상";
export type PolicyCategory = "Life" | "Annuity";
export type LifeType = "Term" | "UL" | "IUL";
export type OptionType = "A" | "B" | "B->A";
export type PremiumMethod = "월납" | "분기납" | "반기납" | "연납" | "일시납";
export type AnnuityType = "IRA" | "Roth IRA" | "Non-Qualified";

export type PersonDTO = {
  id: number;
  lastName: string;
  firstName: string | null;
  gender: Gender | null;
  dob: string | null;
  ageBracket: AgeBracket | null;
  occupation: string | null;
  medicare: boolean | null;
  email: string | null;
  phone: string | null;
  note: string | null;
};

export type PersonUpdateBody = Partial<{
  lastName: string;
  firstName: string | null;
  gender: Gender | null;
  dob: string | null;
  occupation: string | null;
  medicare: boolean | null;
  email: string | null;
  phone: string | null;
  note: string | null;
}>;

export type PolicyDTO = {
  id: number;
  personId: number;
  lastName: string;
  firstName: string | null;
  policyNumber: string | null;
  issueDate: string | null;
  anniv: string | null;
  daysToAnniv: number | null;
  periodYears: number | null;
  carrier: string | null;
  product: string | null;
  category: PolicyCategory;
  lifeType: LifeType | null;
  optionType: OptionType | null;
  deathBenefit: number | string | null;
  totalPremium: number | string | null;
  premiumMethod: PremiumMethod | null;
  annualPremium: number | string | null;
  annuityType: AnnuityType | null;
  initialPremium: number | string | null;
  additionalPremium: number | string | null;
  accountValue: number | string | null;
  surrenderValue: number | string | null;
  loanOrWithdrawal: boolean | null;
  surrendered: boolean;
  needsAttention: boolean;
  needsReview: boolean;
  reviewReason: string | null;
  comment: string | null;
  note: string | null;
  reviewed: boolean;
};

export type PolicyUpdateBody = Partial<{
  policyNumber: string | null;
  issueDate: string | null;
  carrier: string | null;
  product: string | null;
  category: PolicyCategory;
  lifeType: LifeType | null;
  optionType: OptionType | null;
  deathBenefit: string | null;
  totalPremium: string | null;
  premiumMethod: PremiumMethod | null;
  annualPremium: string | null;
  annuityType: AnnuityType | null;
  initialPremium: string | null;
  additionalPremium: string | null;
  accountValue: string | null;
  surrenderValue: string | null;
  loanOrWithdrawal: boolean | null;
  surrendered: boolean;
  needsAttention: boolean;
  comment: string | null;
  note: string | null;
  reviewed: boolean;
}>;

export type ProspectDTO = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  segment: string;
  note: string | null;
};

export type ColumnDTO = {
  id: number;
  num: number | null;
  title: string;
  category: string | null;
  file: string | null;
};

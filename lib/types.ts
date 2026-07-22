export type ClientDTO = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  age: number | null;
  policy: string | null;
  issueDate: string | null;
  anniv: string | null;
  daysToAnniv: number | null;
  carrier: string | null;
  product: string | null;
  faceAmount: number | string | null;
  premium: number | string | null;
  av: number | string | null;
  needsReview: boolean;
  reviewReason: string | null;
  comment: string | null;
  reviewed: boolean;
  birthdayMonth: number | null;
  birthdayDay: number | null;
};

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

export type ClientUpdateBody = {
  reviewed?: boolean;
  note?: string;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
};

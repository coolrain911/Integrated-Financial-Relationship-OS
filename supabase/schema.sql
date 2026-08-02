-- Financial Relationship OS schema.
-- Run this once in the Supabase SQL Editor on a fresh project.

create table if not exists people (
  id bigint generated always as identity primary key,
  last_name text not null,
  first_name text,
  gender text check (gender in ('남', '여')),
  dob date,
  occupation text,
  medicare boolean,
  email text,
  phone text,
  -- Client tier (A/B/C/D, department-store VVIP/VIP style). Lives on the
  -- person rather than the policy, so grading someone once applies to every
  -- policy of theirs shown in Current Client.
  grade text check (grade in ('A', 'B', 'C', 'D')),
  note text
);

create table if not exists policies (
  id bigint generated always as identity primary key,
  person_id bigint not null references people(id) on delete cascade,
  policy_number text,
  issue_date date,
  carrier text,
  product text,
  category text not null default 'Life' check (category in ('Life', 'Annuity')),
  -- Life-only fields
  life_type text check (life_type in ('Term', 'UL', 'IUL')),
  option_type text check (option_type in ('A', 'B', 'B->A')),
  -- death_benefit/total_premium/annual_premium/account_value/surrender_value
  -- are stored as text (rather than numeric) so the "na" sentinel used
  -- alongside real numbers and nulls in the source data round-trips cleanly;
  -- the API layer converts back to a number where possible.
  death_benefit text,
  total_premium text,
  premium_method text check (premium_method in ('월납', '분기납', '반기납', '연납', '일시납')),
  annual_premium text,
  -- Annuity-only fields
  annuity_type text check (annuity_type in ('IRA', 'Roth IRA', 'Non-Qualified')),
  initial_premium text,
  additional_premium text,
  -- Shared fields
  account_value text,
  surrender_value text,
  loan_or_withdrawal boolean,
  surrendered boolean not null default false,
  needs_attention boolean not null default false,
  policy_changed boolean not null default false,
  change_needed boolean not null default false,
  needs_review boolean not null default false,
  review_reason text,
  comment text,
  note text,
  reviewed boolean not null default false
);

create table if not exists prospects (
  id bigint generated always as identity primary key,
  last_name text,
  first_name text,
  korean_name text,
  email text,
  phone text,
  category text,
  note text
);

create table if not exists columns_lib (
  id bigint generated always as identity primary key,
  num numeric,
  title text not null,
  category text,
  file text,
  content text,
  link text
);

-- User-added calendar entries (personal reminders/appointments), shown on
-- Dashboard Today's calendar alongside auto-generated policy anniversaries.
create table if not exists calendar_events (
  id bigint generated always as identity primary key,
  event_date date not null,
  title text not null,
  note text
);

-- 지식 창고 (Knowledge Vault) — reusable answers to recurring client
-- questions (real estate, overseas assets, tax, FAFSA...) and related
-- reference material, sortable by title/category/date.
create table if not exists knowledge_items (
  id bigint generated always as identity primary key,
  title text not null,
  category text,
  item_date date,
  content text,
  link text
);

-- License & Certificate — the advisor's own license/registration/CE/E&O
-- records kept in one searchable place. file_path/file_name point at an
-- uploaded PDF/image scan in the private "licenses" storage bucket below;
-- link is for a plain external URL (e.g. a Google Drive link) instead.
create table if not exists licenses_certificates (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null check (category in ('License', 'Register', 'CE', 'E&O')),
  issuer text,
  issue_date date,
  expiry_date date,
  reference_no text,
  link text,
  file_path text,
  file_name text,
  note text
);

-- Private bucket for uploaded license/certificate files. Never made public —
-- the app serves these only through its own /api routes using the service
-- role key, same as every other table here.
insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', false)
on conflict (id) do nothing;

-- No RLS policies are defined below, so once RLS is enabled, anon/authenticated
-- roles have zero access to these tables. The app talks to Supabase only from
-- Next.js server routes using the service role key, which bypasses RLS
-- entirely — the browser never holds Supabase credentials.
alter table people enable row level security;
alter table policies enable row level security;
alter table prospects enable row level security;
alter table columns_lib enable row level security;
alter table calendar_events enable row level security;
alter table knowledge_items enable row level security;
alter table licenses_certificates enable row level security;

-- Splits a "LastName FirstName [MiddleInitial]" string (the convention used
-- throughout this app) into (last_name, first_name). Falls back to a
-- placeholder when the name is blank so people.last_name's NOT NULL
-- constraint is never violated.
create or replace function split_last_first(full_name text, out last_name text, out first_name text)
language plpgsql
immutable
as $$
declare
  trimmed text := trim(coalesce(full_name, ''));
  sp int;
begin
  if trimmed = '' then
    last_name := '(이름 미상)';
    first_name := null;
    return;
  end if;

  sp := position(' ' in trimmed);
  if sp = 0 then
    last_name := trimmed;
    first_name := null;
  else
    last_name := left(trimmed, sp - 1);
    first_name := nullif(trim(substring(trimmed from sp + 1)), '');
  end if;
end;
$$;

-- Moves a prospect into people atomically (insert + delete in one
-- transaction), so a prospect can never be dropped without the corresponding
-- person existing, or vice versa. The new person has no policies yet.
-- Returns the new person row, or NULL if the prospect id doesn't exist.
--
-- prospects.korean_name has no equivalent column on people, so it's folded
-- into the new person's note (prefixed "한글명: ...") rather than dropped.
create or replace function convert_prospect(p_id bigint)
returns people
language plpgsql
as $$
declare
  v_prospect prospects%rowtype;
  v_person people%rowtype;
  v_note text;
begin
  select * into v_prospect from prospects where id = p_id;
  if not found then
    return null;
  end if;

  v_note := concat_ws(
    E'\n',
    case when nullif(v_prospect.korean_name, '') is not null
      then '한글명: ' || v_prospect.korean_name end,
    nullif(v_prospect.note, '')
  );

  insert into people (last_name, first_name, email, phone, note)
  values (
    coalesce(nullif(v_prospect.last_name, ''), nullif(v_prospect.korean_name, ''), '(이름 미상)'),
    v_prospect.first_name,
    v_prospect.email,
    v_prospect.phone,
    nullif(v_note, '')
  )
  returning * into v_person;

  delete from prospects where id = p_id;

  return v_person;
end;
$$;

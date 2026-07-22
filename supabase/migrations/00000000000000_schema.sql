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
  needs_review boolean not null default false,
  review_reason text,
  comment text,
  note text,
  reviewed boolean not null default false
);

create table if not exists prospects (
  id bigint generated always as identity primary key,
  name text,
  email text,
  phone text,
  segment text,
  note text
);

create table if not exists columns_lib (
  id bigint generated always as identity primary key,
  num numeric,
  title text not null,
  category text,
  file text
);

-- No RLS policies are defined below, so once RLS is enabled, anon/authenticated
-- roles have zero access to these tables. The app talks to Supabase only from
-- Next.js server routes using the service role key, which bypasses RLS
-- entirely — the browser never holds Supabase credentials.
alter table people enable row level security;
alter table policies enable row level security;
alter table prospects enable row level security;
alter table columns_lib enable row level security;

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
create or replace function convert_prospect(p_id bigint)
returns people
language plpgsql
as $$
declare
  v_prospect prospects%rowtype;
  v_person people%rowtype;
  v_last text;
  v_first text;
begin
  select * into v_prospect from prospects where id = p_id;
  if not found then
    return null;
  end if;

  select s.last_name, s.first_name into v_last, v_first
  from split_last_first(v_prospect.name) as s;

  insert into people (last_name, first_name, email, phone, note)
  values (v_last, v_first, v_prospect.email, v_prospect.phone, v_prospect.note)
  returning * into v_person;

  delete from prospects where id = p_id;

  return v_person;
end;
$$;

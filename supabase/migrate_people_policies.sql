-- One-time migration: splits the old flat `clients` table (one row per
-- policy, with person fields like name/email/phone duplicated on every row)
-- into separate `people` and `policies` tables, so a person can hold
-- multiple policies while their own info is entered only once.
--
-- Safe to run on a project that already has the OLD schema.sql (with a
-- `clients` table) applied and seeded. Running it a second time is a no-op:
-- once `clients` is gone, the migration block below skips itself.

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
  life_type text check (life_type in ('Term', 'UL', 'IUL')),
  option_type text check (option_type in ('A', 'B', 'B->A')),
  death_benefit text,
  total_premium text,
  premium_method text check (premium_method in ('월납', '분기납', '반기납', '연납', '일시납')),
  annual_premium text,
  annuity_type text check (annuity_type in ('IRA', 'Roth IRA', 'Non-Qualified')),
  initial_premium text,
  additional_premium text,
  account_value text,
  surrender_value text,
  loan_or_withdrawal boolean,
  needs_review boolean not null default false,
  review_reason text,
  comment text,
  note text,
  reviewed boolean not null default false
);

alter table people enable row level security;
alter table policies enable row level security;

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

-- The old convert_prospect(bigint) returned `clients`, so it depends on that
-- table's row type and would block dropping it below. Drop it now; the new
-- version (returning `people`) is (re)created at the end of this script.
drop function if exists convert_prospect(bigint);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clients'
  ) then

    -- Temporary column used only to join the newly-created people rows back
    -- to the clients rows they came from; dropped again once policies are
    -- populated.
    alter table people add column if not exists _migration_name text;

    -- One person per distinct name. When the same name appears on several
    -- clients rows (multiple policies for one person), prefer the row with
    -- the most fields filled in for that person's contact info.
    insert into people (last_name, first_name, email, phone, note, _migration_name)
    select
      (split_last_first(d.name)).last_name,
      (split_last_first(d.name)).first_name,
      d.email, d.phone, d.note, d.name
    from (
      select distinct on (name) name, email, phone, note
      from clients
      order by name, (email is null)::int, (phone is null)::int, (note is null)::int
    ) d;

    -- One policy per original clients row, linked to the matching person.
    insert into policies (
      person_id, policy_number, issue_date, carrier, product,
      death_benefit, annual_premium, account_value,
      needs_review, review_reason, comment, note, reviewed
    )
    select
      p.id, c.policy, c.issue_date, c.carrier, c.product,
      c.face_amount, c.premium, c.av,
      c.needs_review, c.review_reason, c.comment, c.note, c.reviewed
    from clients c
    join people p on p._migration_name = c.name;

    alter table people drop column _migration_name;

    drop table clients;
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

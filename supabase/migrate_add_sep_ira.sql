-- Adds "SEP IRA" to the allowed annuity_type values. Safe to run more than once.
-- Finds the existing check constraint on annuity_type by inspecting its
-- definition (rather than assuming its name), since the auto-generated name
-- can differ depending on how the column was created.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'policies'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%annuity_type%'
  loop
    execute format('alter table policies drop constraint %I', con.conname);
  end loop;
end $$;

alter table policies add constraint policies_annuity_type_check
  check (annuity_type in ('IRA', 'Roth IRA', 'SEP IRA', 'Non-Qualified'));

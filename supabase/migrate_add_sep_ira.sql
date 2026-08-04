-- Adds "SEP IRA" to the allowed annuity_type values. Safe to run more than once.
alter table policies drop constraint if exists policies_annuity_type_check;
alter table policies add constraint policies_annuity_type_check
  check (annuity_type in ('IRA', 'Roth IRA', 'SEP IRA', 'Non-Qualified'));

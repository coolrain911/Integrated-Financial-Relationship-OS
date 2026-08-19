-- Adds sales_priority (Sales Priority) to prospects — a lightweight internal
-- triage flag, A(우선영업)/B(접촉유지)/C(관망대상), used for input/filtering
-- only. It is not shown as a column in the Potential Client table. Safe to
-- run more than once.
alter table prospects add column if not exists sales_priority text;

alter table prospects drop constraint if exists prospects_sales_priority_check;
alter table prospects add constraint prospects_sales_priority_check
  check (sales_priority in ('A', 'B', 'C'));

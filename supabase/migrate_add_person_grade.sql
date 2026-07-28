-- Adds a client tier/grade (A/B/C/D, department-store VVIP/VIP style) to
-- people. It lives on the person, not the policy, so a person with several
-- policies only needs to be graded once — every policy row for them (joined
-- through people) picks up the same grade automatically. Safe to run more
-- than once.
alter table people add column if not exists grade text check (grade in ('A', 'B', 'C', 'D'));

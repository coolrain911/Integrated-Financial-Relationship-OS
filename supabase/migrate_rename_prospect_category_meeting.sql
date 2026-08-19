-- Renames the 접촉경로(category) value "모임" to "모임/세미나" on prospects,
-- matching the updated taxonomy. Safe to run more than once.
update prospects set category = '모임/세미나' where category = '모임';

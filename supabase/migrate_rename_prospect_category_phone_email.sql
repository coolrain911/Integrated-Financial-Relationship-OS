-- Renames the 접촉경로(category) value "전화/이메일 연락" to "방문/전화/이메일"
-- on prospects, matching the updated taxonomy. Safe to run more than once.
update prospects set category = '방문/전화/이메일' where category = '전화/이메일 연락';

-- Removes the manual_indexes feature (MLSB/S&P MARC 5%/Barclays Focus) from
-- the Dashboard Today Key Financial Index card — replaced by auto-fetched
-- market indexes (Tesla/Palantir/Nvidia/KOSPI/Bitcoin/XRP) alongside the
-- existing S&P 500/Dow Jones/Nasdaq/Gold. Safe to run more than once.
drop table if exists manual_indexes;

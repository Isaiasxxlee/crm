\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'
SELECT 'TABLE|' || table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT 'COLPROF|' || column_name FROM information_schema.columns WHERE table_name = 'BusinessProfile' ORDER BY ordinal_position;
SELECT 'COLSUB|' || column_name FROM information_schema.columns WHERE table_name = 'Subscription' ORDER BY ordinal_position;
SELECT 'COLTEN|' || column_name FROM information_schema.columns WHERE table_name = 'TenantModule' ORDER BY ordinal_position;
SELECT 'COLMEM|' || column_name FROM information_schema.columns WHERE table_name = 'Membership' ORDER BY ordinal_position;

-- ============================================================
-- NEC Seed: Import audit log + final statistics update
-- Migration: 009_nec_finalize.sql
-- ============================================================

INSERT INTO nec_import_log (import_type, source_file, records_imported, status, notes, imported_by, completed_at)
VALUES
  ('COUNTIES',       'rov_per_county.pdf',          47,       'completed', '2022 IEBC General Election - 47 counties', 'nec-seed-pipeline', NOW()),
  ('CONSTITUENCIES', 'rov_per_constituency.pdf',    290, 'completed', '2022 IEBC General Election - 290 constituencies', 'nec-seed-pipeline', NOW()),
  ('WARDS',          'rov_per_caw.pdf',             1447,          'completed', '2022 IEBC General Election - 1447 wards', 'nec-seed-pipeline', NOW()),
  ('REG_CENTRES',    'rov_per_Reg_Centre.pdf',      27264,    'completed', '2022 IEBC General Election - 27264 registration centres', 'nec-seed-pipeline', NOW()),
  ('POLLING_STATIONS','rov_per_polling_station.pdf',45897,        'completed', '2022 IEBC General Election - 45897 standard stations', 'nec-seed-pipeline', NOW()),
  ('PRISONS',        'rov_per_prison.pdf',          106,        'completed', '2022 IEBC - 106 prison stations (inactive)', 'nec-seed-pipeline', NOW()),
  ('DIASPORA',       'rov_for_citizens_outside.pdf',27,       'completed', '2022 IEBC - 27 diaspora stations (inactive)', 'nec-seed-pipeline', NOW());

-- Update election version totals
UPDATE nec_election_versions
SET total_stations = (SELECT COUNT(*) FROM nec_polling_stations WHERE election_year = 2022),
    total_voters   = (SELECT SUM(registered_voters) FROM nec_counties WHERE is_special = FALSE),
    seeded_at      = NOW()
WHERE election_year = 2022;

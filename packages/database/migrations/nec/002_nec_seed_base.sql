-- ============================================================
-- NEC Seed: Country + Election Version baseline
-- Migration: 002_nec_seed_base.sql
-- ============================================================
INSERT INTO nec_countries (iso_code, name, active) VALUES
  ('KEN', 'Kenya', TRUE),
  ('TZA', 'Tanzania', TRUE),
  ('UGA', 'Uganda', TRUE),
  ('RWA', 'Rwanda', TRUE),
  ('BDI', 'Burundi', TRUE),
  ('ZAF', 'South Africa', TRUE),
  ('SSD', 'South Sudan', TRUE),
  ('DEU', 'Germany', TRUE),
  ('GBR', 'United Kingdom', TRUE),
  ('QAT', 'Qatar', TRUE),
  ('ARE', 'United Arab Emirates', TRUE),
  ('CAN', 'Canada', TRUE),
  ('USA', 'United States of America', TRUE)
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO nec_election_versions (election_year, label, is_active, total_stations, total_voters, seeded_at)
VALUES (2022, '2022 Kenya General Election', TRUE, 46030, 22102532, NOW())
ON CONFLICT (election_year) DO NOTHING;

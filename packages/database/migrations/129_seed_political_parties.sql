-- ============================================================
-- VoteCapsule(tm) -- Migration 129
-- Seeds all 98 ORPP-registered political parties as tenants
-- Tables: tenants, users, tenant_members
-- Source: ORPP Fully Registered Political Parties (July 2026)
-- Generated: 2026-08-12 by Sonie (v2 — correct schema)
-- ============================================================

BEGIN;

-- ---- TENANTS -----------------------------------------------
-- created_by is NULL (system-seeded, no user FK required)

-- 1. People's Liberation Party (PLP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'People''s Liberation Party',
  'plp',
  'political_party',
  'active',
  'KE',
  '#7c3aed',
  'plp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"001","registration_date":"2012-03-19","certificate_url":null,"registered_office":"NARC-Kenya House, Woodland Road, Off Lenana Road","postal_address":"34200-00100 Nairobi","physical_address":"NARC-Kenya House, Woodland Road, Off Lenana Road","phone":null,"status":"pending_verification","symbol_description":"Purple Rose","colors":["Lilac","White","Purple"],"slogan":"Unite, Liberate","former_names":["National Rainbow Coalition-Kenya (NARC-KENYA)"],"abbreviation":"PLP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7c3aed","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Purple Rose"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. The National Vision Party (NVP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The National Vision Party',
  'nvp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'nvp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"002","registration_date":"2012-03-29","certificate_url":null,"registered_office":"Big Tree Centre, Uhuru Garden Estate, Gate 1, Langata","postal_address":"29200-00100 Nairobi","physical_address":"Big Tree Centre, Uhuru Garden Estate, Gate 1, Langata","phone":null,"status":"pending_verification","symbol_description":"Light House","colors":["Blue","Green"],"slogan":"Haki, Umoja na Ustawi","former_names":[],"abbreviation":"NVP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Light House"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Labour Party of Kenya (LPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Labour Party of Kenya',
  'lpk',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'lpk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"003","registration_date":"2012-03-29","certificate_url":null,"registered_office":"Kilimani Area, Shiko Road Off Elgeyo Marakwet Road","postal_address":"46775-00100 Nairobi","physical_address":"Kilimani Area, Shiko Road Off Elgeyo Marakwet Road","phone":null,"status":"pending_verification","symbol_description":"Star","colors":["Red","Black","Yellow","Luminous Green"],"slogan":"Nyota ya Kenya","former_names":[],"abbreviation":"LPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Star"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 4. The Democratic Union (TDU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The Democratic Union',
  'tdu',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'tdu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"005","registration_date":"2012-03-13","certificate_url":null,"registered_office":"Victoria Plaza, 5th Floor, Parklands Road","postal_address":"10083-00400 Nairobi","physical_address":"Victoria Plaza, 5th Floor, Parklands Road","phone":null,"status":"pending_verification","symbol_description":"House","colors":["Blue","Red"],"slogan":"Makao ya Wakenya","former_names":["Mwangaza Tu Party (MTP)","Mwangaza (MWAP)"],"abbreviation":"TDU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"House"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 5. Party of Independent Candidate of Kenya (PICK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Party of Independent Candidate of Kenya',
  'pick',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'pick@votecapsule.co.ke',
  '{"kyc":{"registration_number":"007","registration_date":"2012-03-29","certificate_url":null,"registered_office":"Uganda House 2nd Floor Room 20 Kenyatta Avenue","postal_address":"21812-00400 Nairobi","physical_address":"Uganda House 2nd Floor Room 20 Kenyatta Avenue","phone":null,"status":"pending_verification","symbol_description":"Child being lifted by both hands","colors":["Black","Red","Yellow","Green","White","Light Blue"],"slogan":"","former_names":[],"abbreviation":"PICK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Child being lifted by both hands"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 6. Devolution Empowerment Party (DEP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Devolution Empowerment Party',
  'dep',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'dep@votecapsule.co.ke',
  '{"kyc":{"registration_number":"008","registration_date":"2012-03-29","certificate_url":null,"registered_office":"Cedar Clinical Associates, Makasembo Road Eldoret","postal_address":"2670-30100 Eldoret","physical_address":"Cedar Clinical Associates, Makasembo Road Eldoret","phone":null,"status":"pending_verification","symbol_description":"Bus","colors":["Green","Black","Gold"],"slogan":"Kenya Mpya","former_names":["Restore and Build Kenya"],"abbreviation":"DEP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Bus"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 7. Kenya National Congress (KNC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya National Congress',
  'knc',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'knc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"009","registration_date":"2012-04-16","certificate_url":null,"registered_office":"KEMA Building, 4th Floor, Off Shimo la Tewa Road, Industrial Area","postal_address":"76651-00508 Nairobi","physical_address":"KEMA Building, 4th Floor, Off Shimo la Tewa Road, Industrial Area","phone":null,"status":"pending_verification","symbol_description":"Key","colors":["Blue","Green","Yellow"],"slogan":"Wakenya Tujipange","former_names":[],"abbreviation":"KNC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Key"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 8. Mazingira Green Party (MGP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Mazingira Green Party',
  'mgp',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'mgp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"010","registration_date":"2012-04-20","certificate_url":null,"registered_office":"Ruprani House, Room 302, Moktah Dadah Street, Nairobi","postal_address":"51855-00100 Nairobi","physical_address":"Ruprani House, Room 302, Moktah Dadah Street, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Tree","colors":["Red","Black","Green"],"slogan":"Maisha Bora","former_names":[],"abbreviation":"MGP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Tree"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 9. Kenya Moja Movement Party (KMM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya Moja Movement Party',
  'kmm',
  'political_party',
  'active',
  'KE',
  '#7c3aed',
  'kmm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"011","registration_date":"2024-05-31","certificate_url":null,"registered_office":"Kiambu Road, directly Opposite Quickmart supermarket, behind bed palace","postal_address":"10446-00100 Nairobi","physical_address":"Kiambu Road, directly Opposite Quickmart supermarket, behind bed palace","phone":null,"status":"pending_verification","symbol_description":"K1","colors":["Purple","Black","Yellow"],"slogan":"Umoja nI Nguvu","former_names":["National Democratic Movement (NDM)"],"abbreviation":"KMM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7c3aed","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"K1"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 10. Wiper Patriotic Front (WPF)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Wiper Patriotic Front',
  'wpf',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'wpf@votecapsule.co.ke',
  '{"kyc":{"registration_number":"012","registration_date":"2025-06-30","certificate_url":null,"registered_office":"Sunrise Court, Kufunga Road, off Langata Road, Karen","postal_address":"403-00100 Nairobi","physical_address":"Sunrise Court, Kufunga Road, off Langata Road, Karen","phone":null,"status":"pending_verification","symbol_description":"Umbrella","colors":["Earth Red","Royal Blue","White"],"slogan":"Wiper","former_names":["Wiper Democratic Movement (WDM)"],"abbreviation":"WPF","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Umbrella"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 11. Democratic Party of Kenya (DP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Democratic Party of Kenya',
  'dp',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'dp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"013","registration_date":"2012-04-25","certificate_url":null,"registered_office":"Muhu Holdings, 3rd Floor, Mbagathi Road","postal_address":"56395-00200 Nairobi","physical_address":"Muhu Holdings, 3rd Floor, Mbagathi Road","phone":null,"status":"pending_verification","symbol_description":"Lantern","colors":["Green","Orange"],"slogan":"Umoja na Haki","former_names":[],"abbreviation":"DP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Lantern"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 12. Party of National Unity (PNU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Party of National Unity',
  'pnu',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'pnu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"014","registration_date":"2012-04-25","certificate_url":null,"registered_office":"Musa Gitau Lane, Musa Gitau Road Off Waiyaki Way","postal_address":"1235-00502 Nairobi","physical_address":"Musa Gitau Lane, Musa Gitau Road Off Waiyaki Way","phone":null,"status":"pending_verification","symbol_description":"Two torches with flames","colors":["Blue","Red"],"slogan":"Kazi Iendelee","former_names":[],"abbreviation":"PNU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Two torches with flames"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 13. United Democratic Alliance (UDA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Democratic Alliance',
  'uda',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'uda@votecapsule.co.ke',
  '{"kyc":{"registration_number":"015","registration_date":"2012-04-25","certificate_url":null,"registered_office":"Transnational Plaza, 9th Floor","postal_address":"37500-00100 Nairobi","physical_address":"Transnational Plaza, 9th Floor","phone":null,"status":"pending_verification","symbol_description":"Wheelbarrow","colors":["Green","Yellow"],"slogan":"Mabadiliko na Ustawi","former_names":["Party for Development and Reforms"],"abbreviation":"UDA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Wheelbarrow"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 14. Agano National Party (ANP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Agano National Party',
  'anp',
  'political_party',
  'active',
  'KE',
  '#7c3aed',
  'anp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"017","registration_date":"2012-04-16","certificate_url":null,"registered_office":"Morning Side Office Park, Unit No. B2, Wing A, L.R 2/704","postal_address":"40174-00100 Nairobi","physical_address":"Morning Side Office Park, Unit No. B2, Wing A, L.R 2/704","phone":null,"status":"pending_verification","symbol_description":"Lamb","colors":["Purple","White"],"slogan":"Njia Mpya, Mambo Mapya","former_names":["Agano Party"],"abbreviation":"ANP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7c3aed","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Lamb"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 15. Kenya Social Congress (KSC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya Social Congress',
  'ksc',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'ksc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"019","registration_date":"2012-04-18","certificate_url":null,"registered_office":"Venture Building, next to Fahari Hotel, Benedicta Utawala Road, Utawala","postal_address":"9211-00200 Nairobi","physical_address":"Venture Building, next to Fahari Hotel, Benedicta Utawala Road, Utawala","phone":null,"status":"pending_verification","symbol_description":"Broom","colors":["White","Green","Yellow"],"slogan":"","former_names":[],"abbreviation":"KSC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Broom"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 16. Orange Democratic Movement (ODM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Orange Democratic Movement',
  'odm',
  'political_party',
  'active',
  'KE',
  '#f97316',
  'odm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"021","registration_date":"2012-04-18","certificate_url":null,"registered_office":"Chungwa House, Loiyangalani Drive","postal_address":"42242-00100 Nairobi","physical_address":"Chungwa House, Loiyangalani Drive","phone":null,"status":"pending_verification","symbol_description":"Ripe Orange","colors":["Orange"],"slogan":"Mbele Pamoja","former_names":[],"abbreviation":"ODM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#f97316","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Ripe Orange"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 17. People's Party of Kenya (PPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'People''s Party of Kenya',
  'ppk',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'ppk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"022","registration_date":"2012-05-14","certificate_url":null,"registered_office":"Witeithie House, 4th Floor, Room 413, Thika","postal_address":"1680-01000 Thika","physical_address":"Witeithie House, 4th Floor, Room 413, Thika","phone":null,"status":"pending_verification","symbol_description":"Microphone","colors":["Blue","Red","Green","White"],"slogan":"Usawa Haki Uhuru","former_names":[],"abbreviation":"PPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Microphone"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 18. Forum for Restoration of Democracy-Kenya (FORD-KENYA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Forum for Restoration of Democracy-Kenya',
  'ford-kenya',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'ford-kenya@votecapsule.co.ke',
  '{"kyc":{"registration_number":"023","registration_date":"2012-04-20","certificate_url":null,"registered_office":"Ford-Kenya","postal_address":"43591-00100 Nairobi","physical_address":"Ford-Kenya","phone":null,"status":"pending_verification","symbol_description":"Lion","colors":["Colourless"],"slogan":"Ford-Kenya","former_names":[],"abbreviation":"FORD-KENYA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Lion"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 19. Progressive Party of Kenya (PPOK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Progressive Party of Kenya',
  'ppok',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ppok@votecapsule.co.ke',
  '{"kyc":{"registration_number":"025","registration_date":"2012-04-25","certificate_url":null,"registered_office":"Utumishi Cooperative House, 4th Floor, Mamlaka Road, Off Nyerere Road","postal_address":"49143-00100 Nairobi","physical_address":"Utumishi Cooperative House, 4th Floor, Mamlaka Road, Off Nyerere Road","phone":null,"status":"pending_verification","symbol_description":"Battery Torch","colors":["Green","Blue","Yellow"],"slogan":"Mwangaza (Mulika Maendeleo)","former_names":[],"abbreviation":"PPOK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Battery Torch"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 20. Jubilee Party (JP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Jubilee Party',
  'jp',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'jp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"027","registration_date":"2016-09-09","certificate_url":null,"registered_office":"Daraja House, State House Road","postal_address":"38601-00623 Nairobi","physical_address":"Daraja House, State House Road","phone":null,"status":"pending_verification","symbol_description":"Dove with an olive branch on its beak","colors":["Yellow","Black","Red"],"slogan":"Tuko Pamoja","former_names":[],"abbreviation":"JP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Dove with an olive branch on its beak"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 21. Maendeleo Democratic Party (MDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Maendeleo Democratic Party',
  'mdp',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'mdp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"028","registration_date":"2012-04-25","certificate_url":null,"registered_office":"Maendeleo House, Kakamega-Mumias Rd, Plot 15, Kakamega","postal_address":"1980 Kakamega","physical_address":"Maendeleo House, Kakamega-Mumias Rd, Plot 15, Kakamega","phone":null,"status":"pending_verification","symbol_description":"Scissors","colors":["Grey","Red"],"slogan":"Maendeleo kwa wote","former_names":[],"abbreviation":"MDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Scissors"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 22. National Rainbow Coalition (NARC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Rainbow Coalition',
  'narc',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'narc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"029","registration_date":"2012-04-27","certificate_url":null,"registered_office":"Othaya Road, House No. 18","postal_address":"67138-00200 Nairobi","physical_address":"Othaya Road, House No. 18","phone":null,"status":"pending_verification","symbol_description":"Traditional African Torch (Mwenge)","colors":["Colours of the Rainbow"],"slogan":"Haki yetu sasa Inawezekana","former_names":[],"abbreviation":"NARC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Traditional African Torch (Mwenge)"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 23. Kenya African Democratic Union-Asili (KADU-ASILI)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya African Democratic Union-Asili',
  'kadu-asili',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'kadu-asili@votecapsule.co.ke',
  '{"kyc":{"registration_number":"030","registration_date":"2012-04-27","certificate_url":null,"registered_office":"Dockworkers Union Building (Makuli Fagia) Mombasa","postal_address":"83229 Mombasa","physical_address":"Dockworkers Union Building (Makuli Fagia) Mombasa","phone":null,"status":"pending_verification","symbol_description":"Coconut Tree","colors":["Green"],"slogan":"Haki kwa Wote","former_names":[],"abbreviation":"KADU-ASILI","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Coconut Tree"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 24. Kenya Patriots Party (KPP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya Patriots Party',
  'kpp',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'kpp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"031","registration_date":"2012-04-27","certificate_url":null,"registered_office":"Ack Garden House, 5th Floor 1st Avenue, Ngong Road","postal_address":"37555-00100 Nairobi","physical_address":"Ack Garden House, 5th Floor 1st Avenue, Ngong Road","phone":null,"status":"pending_verification","symbol_description":"Wheel","colors":["Black","Red"],"slogan":"Umoja wa Wakenya","former_names":[],"abbreviation":"KPP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Wheel"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 25. Communist Party of Kenya (CPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Communist Party of Kenya',
  'cpk',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'cpk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"032","registration_date":"2012-04-27","certificate_url":null,"registered_office":"Ring Road, Kileleshwa, Swiss Cottages, House No.8","postal_address":"4403-00100 Nairobi","physical_address":"Ring Road, Kileleshwa, Swiss Cottages, House No.8","phone":null,"status":"pending_verification","symbol_description":"Hammer crossed with a sickel","colors":["Red","Black","Gold"],"slogan":"Capitalism has failed, Jawabu ni Usoshialisti","former_names":[],"abbreviation":"CPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Hammer crossed with a sickel"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 26. Kenya African National Union (KANU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya African National Union',
  'kanu',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'kanu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"033","registration_date":"2012-04-27","certificate_url":null,"registered_office":"Chania Avenue-Off Ring Road, Kilimani, behind Yaya Centre","postal_address":"72394-00200 Nairobi","physical_address":"Chania Avenue-Off Ring Road, Kilimani, behind Yaya Centre","phone":null,"status":"pending_verification","symbol_description":"Cockerel","colors":["Black","Red","Green"],"slogan":"Mwanzo Mpya","former_names":[],"abbreviation":"KANU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Cockerel"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 27. Safina Party (SAFINA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Safina Party',
  'safina',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'safina@votecapsule.co.ke',
  '{"kyc":{"registration_number":"034","registration_date":"2012-04-27","certificate_url":null,"registered_office":"View Park Towers, 12th Floor, Suite 12, Nairobi","postal_address":"14746-00100 Nairobi","physical_address":"View Park Towers, 12th Floor, Suite 12, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Ark carrying animals and people","colors":["Green","Red","Black","White"],"slogan":"All Kenyans Deserve a Chance","former_names":[],"abbreviation":"SAFINA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Ark carrying animals and people"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 28. Chama Cha Uzalendo (CCU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Chama Cha Uzalendo',
  'ccu',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ccu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"036","registration_date":"2012-05-08","certificate_url":null,"registered_office":"Kwa Munuka Plaza, 1st Floor, Kagundo Road, Machakos Town","postal_address":"51871-00100 Nairobi","physical_address":"Kwa Munuka Plaza, 1st Floor, Kagundo Road, Machakos Town","phone":null,"status":"pending_verification","symbol_description":"Security Whistle","colors":["Heavy Leaf Green","Ivory White","Blood Red"],"slogan":"Siasa ni Sera sio Fitina","former_names":[],"abbreviation":"CCU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Security Whistle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 29. National Agenda Party of Kenya (NAP-K)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Agenda Party of Kenya',
  'nap-k',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'nap-k@votecapsule.co.ke',
  '{"kyc":{"registration_number":"037","registration_date":"2017-05-08","certificate_url":null,"registered_office":"Summit House, Moi Avenue","postal_address":"3308-00100 Nairobi","physical_address":"Summit House, Moi Avenue","phone":null,"status":"pending_verification","symbol_description":"A teacher pointing at a blackboard with the Party Name","colors":["Blue","Black","White"],"slogan":"Utu ni Bora","former_names":[],"abbreviation":"NAP-K","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"A teacher pointing at a blackboard with the Party Name"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 30. People's Empowerment Party (PEP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'People''s Empowerment Party',
  'pep',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'pep@votecapsule.co.ke',
  '{"kyc":{"registration_number":"038","registration_date":"2012-05-09","certificate_url":null,"registered_office":"Karen Estate, Near Shade Hotel Ngong Road","postal_address":"68452-00622 Nairobi","physical_address":"Karen Estate, Near Shade Hotel Ngong Road","phone":null,"status":"pending_verification","symbol_description":"Elephant","colors":["Light Blue","Red","Light Green"],"slogan":"Twende Mbele","former_names":[],"abbreviation":"PEP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Elephant"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 31. Peoples Democratic Party (PDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Peoples Democratic Party',
  'pdp',
  'political_party',
  'active',
  'KE',
  '#92400e',
  'pdp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"039","registration_date":"2012-05-09","certificate_url":null,"registered_office":"Cannon Annex 1st Floor Nairobi Parliament Lane","postal_address":"10734-00100 Nairobi","physical_address":"Cannon Annex 1st Floor Nairobi Parliament Lane","phone":null,"status":"pending_verification","symbol_description":"Traditional African Banjo","colors":["Brown"],"slogan":"Mamlaka kwa Mwananchi","former_names":[],"abbreviation":"PDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#92400e","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Traditional African Banjo"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 32. The New Democrats (TND)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The New Democrats',
  'tnd',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'tnd@votecapsule.co.ke',
  '{"kyc":{"registration_number":"040","registration_date":"2012-05-09","certificate_url":null,"registered_office":"Safari Business Arcade, along USIU Road, behind Safari Park Hotel","postal_address":"43428-80100 Mombasa","physical_address":"Safari Business Arcade, along USIU Road, behind Safari Park Hotel","phone":null,"status":"pending_verification","symbol_description":"Bridge","colors":["Red","Brown","Blue"],"slogan":"Together We Can","former_names":[],"abbreviation":"TND","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Bridge"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 33. United Democratic Movement (UDM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Democratic Movement',
  'udm',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'udm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"041","registration_date":"2012-05-10","certificate_url":null,"registered_office":"Hurlingham, Sunbeam Place, Ground flr, Along Tigoni Rd, Nairobi","postal_address":"44820-00100 Nairobi","physical_address":"Hurlingham, Sunbeam Place, Ground flr, Along Tigoni Rd, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Goat","colors":["Multicolor"],"slogan":"Sauti ya Vitendo","former_names":[],"abbreviation":"UDM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Goat"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 34. Shirikisho Party of Kenya (SPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Shirikisho Party of Kenya',
  'spk',
  'political_party',
  'active',
  'KE',
  '#1e3a5f',
  'spk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"042","registration_date":"2012-05-14","certificate_url":null,"registered_office":"Express Building, First Floor Kilindini Road, Mombasa","postal_address":"84056-80100 Mombasa","physical_address":"Express Building, First Floor Kilindini Road, Mombasa","phone":null,"status":"pending_verification","symbol_description":"Shark","colors":["Navy Blue","Green","White"],"slogan":"Mwamko Mpya","former_names":[],"abbreviation":"SPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1e3a5f","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Shark"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 35. Party of Democratic Unity (PDU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Party of Democratic Unity',
  'pdu',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'pdu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"044","registration_date":"2012-05-14","certificate_url":null,"registered_office":"Kenya House Complex, 1st Floor Unit 5","postal_address":"51748-00200 Nairobi","physical_address":"Kenya House Complex, 1st Floor Unit 5","phone":null,"status":"pending_verification","symbol_description":"Drum","colors":["Green","Black","Red","White","Brown"],"slogan":"Let''s Hold Our Hands","former_names":[],"abbreviation":"PDU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Drum"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 36. Umoja na Maendeleo Party (UMP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Umoja na Maendeleo Party',
  'ump',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ump@votecapsule.co.ke',
  '{"kyc":{"registration_number":"045","registration_date":"2012-05-21","certificate_url":null,"registered_office":"Kamuketha Building, Meru-Isiolo Road, Meru","postal_address":"3269-60200 Meru","physical_address":"Kamuketha Building, Meru-Isiolo Road, Meru","phone":null,"status":"pending_verification","symbol_description":"Factory","colors":["Green","Black"],"slogan":"Kumepambazuka","former_names":["Millenium Party of Kenya"],"abbreviation":"UMP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Factory"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 37. United Party of Independent Alliance (UPIA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Party of Independent Alliance',
  'upia',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'upia@votecapsule.co.ke',
  '{"kyc":{"registration_number":"046","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Ramshab Lane, along Ngong Road next to Nairobi Baptist Church","postal_address":"51851-00100 Nairobi","physical_address":"Ramshab Lane, along Ngong Road next to Nairobi Baptist Church","phone":null,"status":"pending_verification","symbol_description":"Antelope","colors":["Green","Black"],"slogan":"Let the People Decide","former_names":["Frontier Alliance Party"],"abbreviation":"UPIA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Antelope"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 38. Farmers Party (FP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Farmers Party',
  'fp',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'fp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"047","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Delta House, 5th Floor along University Way, Nairobi","postal_address":"52828-00200 Nairobi","physical_address":"Delta House, 5th Floor along University Way, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Maize Plant","colors":["Green"],"slogan":"A touch of stomach","former_names":[],"abbreviation":"FP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Maize Plant"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 39. Economic Freedom Party (EFP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Economic Freedom Party',
  'efp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'efp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"048","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Cool Waters Apartments, M3 Flat, Woodlane, Hurlingham","postal_address":"13521-00400 Nairobi","physical_address":"Cool Waters Apartments, M3 Flat, Woodlane, Hurlingham","phone":null,"status":"pending_verification","symbol_description":"Acacia Tree","colors":["Blue","White","Black"],"slogan":"Haki, Usawa na Amani","former_names":[],"abbreviation":"EFP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Acacia Tree"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 40. Federal Party of Kenya (FPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Federal Party of Kenya',
  'fpk',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'fpk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"049","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Annex House, Ground Floor, Limuru Road","postal_address":"34463-00100 Nairobi","physical_address":"Annex House, Ground Floor, Limuru Road","phone":null,"status":"pending_verification","symbol_description":"Fist","colors":["Black"],"slogan":"Inawezekana Tukijipanga","former_names":[],"abbreviation":"FPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Fist"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 41. Muungano Party (MP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Muungano Party',
  'mp',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'mp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"050","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Nyahururu House, Kilome Road","postal_address":"19080-00100 Nairobi","physical_address":"Nyahururu House, Kilome Road","phone":null,"status":"pending_verification","symbol_description":"Interlocked rings","colors":["Black","Green","White"],"slogan":"Usawa na haki kwa wote","former_names":[],"abbreviation":"MP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Interlocked rings"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 42. The National Party (TNP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The National Party',
  'tnp',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'tnp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"051","registration_date":"2012-05-24","certificate_url":null,"registered_office":"Imani House, Juja, 1st Floor, Room 2","postal_address":"2013-00200 Nairobi","physical_address":"Imani House, Juja, 1st Floor, Room 2","phone":null,"status":"pending_verification","symbol_description":"Helmet","colors":["Colorless"],"slogan":"Our Rights Our Life","former_names":["National Party of Kenya"],"abbreviation":"TNP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Helmet"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 43. Jirani Mzalendo Asili Party of Kenya (J-MAPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Jirani Mzalendo Asili Party of Kenya',
  'j-mapk',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'j-mapk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"052","registration_date":"2012-07-12","certificate_url":null,"registered_office":"World Hope International Kenya, Business Hub, Ground Floor, Lavington, Nairobi","postal_address":"52700-00100 Nairobi","physical_address":"World Hope International Kenya, Business Hub, Ground Floor, Lavington, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Red Shoe","colors":["Red","Brown"],"slogan":"Jirani Mwema","former_names":[],"abbreviation":"J-MAPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Red Shoe"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 44. Chama Cha Mashinani (CCM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Chama Cha Mashinani',
  'ccm',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'ccm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"054","registration_date":"2012-07-27","certificate_url":null,"registered_office":"Maruti Heights, Langata Road Opposite Tamarind Hotel","postal_address":"14009-0080 Nairobi","physical_address":"Maruti Heights, Langata Road Opposite Tamarind Hotel","phone":null,"status":"pending_verification","symbol_description":"Golden Yellow Trumpet","colors":["Yellow"],"slogan":"","former_names":[],"abbreviation":"CCM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Golden Yellow Trumpet"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 45. Alliance for Change (AFC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Alliance for Change',
  'afc',
  'political_party',
  'active',
  'KE',
  '#7f1d1d',
  'afc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"055","registration_date":"2012-10-03","certificate_url":null,"registered_office":"Ndavu Ithau Building, South C Shopping Centre, Muhoho Avenue","postal_address":"11769-00400 Nairobi","physical_address":"Ndavu Ithau Building, South C Shopping Centre, Muhoho Avenue","phone":null,"status":"pending_verification","symbol_description":"The Unity Tree","colors":["Maroon","Gold","Black","Grey","White"],"slogan":"Pamoja twaweza","former_names":["Alliance for Real Change (ARK)"],"abbreviation":"AFC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7f1d1d","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"The Unity Tree"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 46. Forum For Republican Democracy-Asili (FORD)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Forum For Republican Democracy-Asili',
  'ford',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ford@votecapsule.co.ke',
  '{"kyc":{"registration_number":"056","registration_date":"2012-10-15","certificate_url":null,"registered_office":"Kwarara Road, Off Bogani Road, Karen","postal_address":"69564-00400 Nairobi","physical_address":"Kwarara Road, Off Bogani Road, Karen","phone":null,"status":"pending_verification","symbol_description":"Two raised fingers inside the Kenyan Map","colors":["Green","Black"],"slogan":"Haki na Ukweli","former_names":["Forum for Restoration of Democracy"],"abbreviation":"FORD","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Two raised fingers inside the Kenyan Map"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 47. Republican Liberty Party (RLP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Republican Liberty Party',
  'rlp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'rlp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"058","registration_date":"2012-12-19","certificate_url":null,"registered_office":"Republican House, Githurai 45, Mwihoko Road","postal_address":"20148-00100 Nairobi","physical_address":"Republican House, Githurai 45, Mwihoko Road","phone":null,"status":"pending_verification","symbol_description":"Horse","colors":["Royal Blue","Green","Orange"],"slogan":"Liberty Powers of the People","former_names":[],"abbreviation":"RLP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Horse"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 48. Roots Party of Kenya (RPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Roots Party of Kenya',
  'rpk',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'rpk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"059","registration_date":"2013-01-15","certificate_url":null,"registered_office":"Secretariat Office, Krishna Centre, Woodvale Grove, No.9","postal_address":"13678-0800 Nairobi","physical_address":"Secretariat Office, Krishna Centre, Woodvale Grove, No.9","phone":null,"status":"pending_verification","symbol_description":"Tree and Roots","colors":["Gold","Green","Brown"],"slogan":"Shake the Tree","former_names":[],"abbreviation":"RPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Tree and Roots"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 49. Vibrant Democracy Party (VDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Vibrant Democracy Party',
  'vdp',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'vdp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"060","registration_date":"2012-10-01","certificate_url":null,"registered_office":"Habo Plaza, Kenyatta Avenue, Mombasa","postal_address":"37886 Mombasa","physical_address":"Habo Plaza, Kenyatta Avenue, Mombasa","phone":null,"status":"pending_verification","symbol_description":"Eagle","colors":["Black","Yellow","Red","Blue"],"slogan":"Mambo ni sasa","former_names":["Democratic Labour Party of Kenya"],"abbreviation":"VDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Eagle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 50. Ubuntu People's Forum (UPF)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Ubuntu People''s Forum',
  'upf',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'upf@votecapsule.co.ke',
  '{"kyc":{"registration_number":"061","registration_date":"2015-06-30","certificate_url":null,"registered_office":"Donholm Sunrise Plot 82/402 Manyaja Road","postal_address":"72185-00200 Nairobi","physical_address":"Donholm Sunrise Plot 82/402 Manyaja Road","phone":null,"status":"pending_verification","symbol_description":"Double thumbs up","colors":["Black","White","Red"],"slogan":"Sauti ya Raia","former_names":["Citizens Convention Party"],"abbreviation":"UPF","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Double thumbs up"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 51. Amani National Congress (ANC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Amani National Congress',
  'anc',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'anc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"062","registration_date":"2015-07-13","certificate_url":null,"registered_office":"Amani House, Loyangalani Drive, Off Convent Road, Lavington Nairobi","postal_address":"11095-00100 Nairobi","physical_address":"Amani House, Loyangalani Drive, Off Convent Road, Lavington Nairobi","phone":null,"status":"pending_verification","symbol_description":"Two Branches of Olive Tree","colors":["Luminous Green","White","Black","Maroon"],"slogan":"ANC...UCHUMI BORA","former_names":[],"abbreviation":"ANC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Two Branches of Olive Tree"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 52. Devolution Party of Kenya (DPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Devolution Party of Kenya',
  'dpk',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'dpk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"063","registration_date":"2015-07-22","certificate_url":null,"registered_office":"Krishna Centre, 3rd Floor, Room 629, Westlands","postal_address":"38077-00100 Nairobi","physical_address":"Krishna Centre, 3rd Floor, Room 629, Westlands","phone":null,"status":"pending_verification","symbol_description":"Tap with running water","colors":["Gold","Cream"],"slogan":"Ugatuzi dawa ya Wakenya","former_names":[],"abbreviation":"DPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Tap with running water"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 53. United Democratic Party (UDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Democratic Party',
  'udp',
  'political_party',
  'active',
  'KE',
  '#7f1d1d',
  'udp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"064","registration_date":"2016-02-22","certificate_url":null,"registered_office":"Kabarsiran Garden, Off Kabarsiran Av, Lr.No.209/7340/6 Lavington","postal_address":"73179-00200 Nairobi","physical_address":"Kabarsiran Garden, Off Kabarsiran Av, Lr.No.209/7340/6 Lavington","phone":null,"status":"pending_verification","symbol_description":"Shield","colors":["Maroon","White","Green"],"slogan":"Ngao Yetu","former_names":[],"abbreviation":"UDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7f1d1d","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Shield"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 54. Kenya Reform Party (KRP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya Reform Party',
  'krp',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'krp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"065","registration_date":"2016-02-22","certificate_url":null,"registered_office":"34, Rossylin Riviera, Limuru Road","postal_address":"30365-00100 Nairobi","physical_address":"34, Rossylin Riviera, Limuru Road","phone":null,"status":"pending_verification","symbol_description":"Mechanical gear and shaft, two leaves and two spears","colors":["Gold","Red","Green","White","Black"],"slogan":"Tuungane Tuendelee","former_names":["Diligence Development Alliance"],"abbreviation":"KRP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Mechanical gear and shaft, two leaves and two spears"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 55. People's Trust Party (PTP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'People''s Trust Party',
  'ptp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'ptp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"066","registration_date":"2016-09-22","certificate_url":null,"registered_office":"Pema Auto Mobile Building, Kangundo Road next to Massmatt Supermarket, Machakos Town","postal_address":"3008-00506 Nairobi","physical_address":"Pema Auto Mobile Building, Kangundo Road next to Massmatt Supermarket, Machakos Town","phone":null,"status":"pending_verification","symbol_description":"Arrow","colors":["Blue","Red","Blue"],"slogan":"Together we can","former_names":[],"abbreviation":"PTP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Arrow"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 56. Maendeleo Chap Chap (MCCP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Maendeleo Chap Chap',
  'mccp',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'mccp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"067","registration_date":"2016-09-22","certificate_url":null,"registered_office":"Convent Road, House No.38, Lavington","postal_address":"10790-00100 Nairobi","physical_address":"Convent Road, House No.38, Lavington","phone":null,"status":"pending_verification","symbol_description":"Road","colors":["Black","White","Yellow","Purple"],"slogan":"Inawezekana na Itawezekana","former_names":[],"abbreviation":"MCCP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Road"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 57. Democratic Congress (DC)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Democratic Congress',
  'dc',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'dc@votecapsule.co.ke',
  '{"kyc":{"registration_number":"068","registration_date":"2016-11-01","certificate_url":null,"registered_office":"Shikangu Road, South B, Nairobi","postal_address":"1128-00606 Nairobi","physical_address":"Shikangu Road, South B, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Butterfly","colors":["Blue","Yellow"],"slogan":"","former_names":[],"abbreviation":"DC","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Butterfly"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 58. Liberal Democratic Party (LDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Liberal Democratic Party',
  'ldp',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ldp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"069","registration_date":"2016-11-01","certificate_url":null,"registered_office":"Mercantile House, Ground Floor, Off Mombasa Road","postal_address":"75845-00200 Nairobi","physical_address":"Mercantile House, Ground Floor, Off Mombasa Road","phone":null,"status":"pending_verification","symbol_description":"Satellite Dish","colors":["Green","Blue","White"],"slogan":"The face for Democracy","former_names":[],"abbreviation":"LDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Satellite Dish"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 59. Green Congress of Kenya (GCK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Green Congress of Kenya',
  'gck',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'gck@votecapsule.co.ke',
  '{"kyc":{"registration_number":"070","registration_date":"2016-11-25","certificate_url":null,"registered_office":"Aac, Sir Francis Ibiam House, Westlands Nairobi","postal_address":"5634-00506 Nairobi","physical_address":"Aac, Sir Francis Ibiam House, Westlands Nairobi","phone":null,"status":"pending_verification","symbol_description":"Five Green Trees","colors":["Green","White"],"slogan":"Mbele iko Sawa","former_names":[],"abbreviation":"GCK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Five Green Trees"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 60. National Liberal Party (NLP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Liberal Party',
  'nlp',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'nlp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"071","registration_date":"2016-12-07","certificate_url":null,"registered_office":"Maendeleo House, Loita Street, 8th floor, Nairobi","postal_address":"15948-00100 Nairobi","physical_address":"Maendeleo House, Loita Street, 8th floor, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Water jet","colors":["Red","Green"],"slogan":"Mwelekeo mpya kwa Maisha Bora","former_names":[],"abbreviation":"NLP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Water jet"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 61. Movement for Democracy and Growth (MDG)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Movement for Democracy and Growth',
  'mdg',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'mdg@votecapsule.co.ke',
  '{"kyc":{"registration_number":"072","registration_date":"2016-12-07","certificate_url":null,"registered_office":"Masaba Road, off Bunyala Road, Upper Hill, Nairobi","postal_address":"282-00623 Parklands","physical_address":"Masaba Road, off Bunyala Road, Upper Hill, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Three fresh maize cobs in their safety husks","colors":["Bottle Green","Yellow"],"slogan":"Funguo la maisha funguo la usawa","former_names":[],"abbreviation":"MDG","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Three fresh maize cobs in their safety husks"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 62. Alternative Leadership Party Of Kenya (ALP-K)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Alternative Leadership Party Of Kenya',
  'alp-k',
  'political_party',
  'active',
  'KE',
  '#06b6d4',
  'alp-k@votecapsule.co.ke',
  '{"kyc":{"registration_number":"073","registration_date":"2016-12-20","certificate_url":null,"registered_office":"Promise House Building Next To Marble Arc Hotel, Lagos Road","postal_address":"35467-00100 Nairobi","physical_address":"Promise House Building Next To Marble Arc Hotel, Lagos Road","phone":null,"status":"pending_verification","symbol_description":"Burning Candle with an orange flame","colors":["Turquoise Blue"],"slogan":"Usawa Kenya","former_names":[],"abbreviation":"ALP-K","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#06b6d4","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Burning Candle with an orange flame"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 63. Ukweli Party (UP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Ukweli Party',
  'up',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'up@votecapsule.co.ke',
  '{"kyc":{"registration_number":"074","registration_date":"2017-01-24","certificate_url":null,"registered_office":"Kenya House, 2nd Floor, Rm 25, Koinange Street","postal_address":"26543-00100 Nairobi","physical_address":"Kenya House, 2nd Floor, Rm 25, Koinange Street","phone":null,"status":"pending_verification","symbol_description":"U-shaped green plant","colors":["Green","Red","Yellow","Black","White"],"slogan":"Nguvu Kwa Mwananchi","former_names":[],"abbreviation":"UP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"U-shaped green plant"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 64. Empowerment and Liberation Party (ELP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Empowerment and Liberation Party',
  'elp',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'elp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"075","registration_date":"2017-01-24","certificate_url":null,"registered_office":"Karengata Park, Room No. 47 Nairobi","postal_address":"437-00902 Nairobi","physical_address":"Karengata Park, Room No. 47 Nairobi","phone":null,"status":"pending_verification","symbol_description":"Ring with people holding hands in unison","colors":["White","Royal Blue"],"slogan":"Tushikane","former_names":[],"abbreviation":"ELP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Ring with people holding hands in unison"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 65. Third Way Alliance Kenya (TAKE)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Third Way Alliance Kenya',
  'take',
  'political_party',
  'active',
  'KE',
  '#92400e',
  'take@votecapsule.co.ke',
  '{"kyc":{"registration_number":"076","registration_date":"2017-02-20","certificate_url":null,"registered_office":"Roshanmaer Place Westwing, Lenana Road","postal_address":"4781-00100 Nairobi","physical_address":"Roshanmaer Place Westwing, Lenana Road","phone":null,"status":"pending_verification","symbol_description":"Camel in Desert","colors":["Brown"],"slogan":"Taking Back Our Country","former_names":[],"abbreviation":"TAKE","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#92400e","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Camel in Desert"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 66. Justice and Freedom Party of Kenya (JFP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Justice and Freedom Party of Kenya',
  'jfp',
  'political_party',
  'active',
  'KE',
  '#7c3aed',
  'jfp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"077","registration_date":"2017-02-22","certificate_url":null,"registered_office":"Regent Court, Apartment B7 Argwings Kodhek Road","postal_address":"76004-00508 Nairobi","physical_address":"Regent Court, Apartment B7 Argwings Kodhek Road","phone":null,"status":"pending_verification","symbol_description":"Stretched out hand holding freedom torch","colors":["Purple","Gold"],"slogan":"Ukweli na Haki","former_names":[],"abbreviation":"JFP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7c3aed","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Stretched out hand holding freedom torch"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 67. Grand Dream Development Party (GDDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Grand Dream Development Party',
  'gddp',
  'political_party',
  'active',
  'KE',
  '#6b7280',
  'gddp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"078","registration_date":"2018-08-07","certificate_url":null,"registered_office":"Corner House, 4th Flr, Kimathi Street","postal_address":"104414-00101 Nairobi","physical_address":"Corner House, 4th Flr, Kimathi Street","phone":null,"status":"pending_verification","symbol_description":"Sack labelled GDDP Dreams","colors":["White","Gold","Blue"],"slogan":"Ndoto Kubwaah","former_names":[],"abbreviation":"GDDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#6b7280","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Sack labelled GDDP Dreams"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 68. United Green Movement (UGM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Green Movement',
  'ugm',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ugm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"079","registration_date":"2019-06-12","certificate_url":null,"registered_office":"Green Action House, #71 Westlands Rd","postal_address":"22467-00100 Nairobi","physical_address":"Green Action House, #71 Westlands Rd","phone":null,"status":"pending_verification","symbol_description":"Sun over the ocean","colors":["Olive Green"],"slogan":"Kumekucha","former_names":[],"abbreviation":"UGM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Sun over the ocean"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 69. Usawa Kwa Wote (UKW)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Usawa Kwa Wote',
  'ukw',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'ukw@votecapsule.co.ke',
  '{"kyc":{"registration_number":"080","registration_date":"2019-06-17","certificate_url":null,"registered_office":"Usawa House, Amboseli Lane, Off Amboseli Road, Lavington Estate","postal_address":"2642-00100 Nairobi","physical_address":"Usawa House, Amboseli Lane, Off Amboseli Road, Lavington Estate","phone":null,"status":"pending_verification","symbol_description":"A cow and milking can","colors":["Green","Gold","Black"],"slogan":"Usawa kwa Wote","former_names":["Civic Renewal Party"],"abbreviation":"UKW","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"A cow and milking can"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 70. United Progressive Alliance (UPA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Progressive Alliance',
  'upa',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'upa@votecapsule.co.ke',
  '{"kyc":{"registration_number":"081","registration_date":"2020-03-06","certificate_url":null,"registered_office":"Upa House, Kileleshwa","postal_address":"40016-00100 Nairobi","physical_address":"Upa House, Kileleshwa","phone":null,"status":"pending_verification","symbol_description":"Bathing Soap","colors":["Bright Red","Lawn Green","White"],"slogan":"Safisha Kenya","former_names":["Party of Economic Democracy"],"abbreviation":"UPA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Bathing Soap"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 71. The Service Party (TSP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The Service Party',
  'tsp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'tsp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"082","registration_date":"2020-06-05","certificate_url":null,"registered_office":"Upper Hill, Matumbato Road, House No.25 Nairobi","postal_address":"776-00618 Nairobi","physical_address":"Upper Hill, Matumbato Road, House No.25 Nairobi","phone":null,"status":"pending_verification","symbol_description":"Heart shape inscribed inside a circle","colors":["Royal Blue","Mustard Yellow","Red","Black","White"],"slogan":"Service to Humanity is Service to God","former_names":[],"abbreviation":"TSP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Heart shape inscribed inside a circle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 72. National Ordinary People Empowerment Union (NOPEU)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Ordinary People Empowerment Union',
  'nopeu',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'nopeu@votecapsule.co.ke',
  '{"kyc":{"registration_number":"083","registration_date":"2020-06-05","certificate_url":null,"registered_office":"Railway Godown, Bunyala Road","postal_address":"17987-00580 Nairobi","physical_address":"Railway Godown, Bunyala Road","phone":null,"status":"pending_verification","symbol_description":"Ladder","colors":["Black","Red"],"slogan":"NOPEU","former_names":[],"abbreviation":"NOPEU","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Ladder"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 73. National Reconstruction Alliance (NRA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Reconstruction Alliance',
  'nra',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'nra@votecapsule.co.ke',
  '{"kyc":{"registration_number":"084","registration_date":"2021-02-02","certificate_url":null,"registered_office":"Matasia-Ngong","postal_address":"104083-00101 Nairobi","physical_address":"Matasia-Ngong","phone":null,"status":"pending_verification","symbol_description":"Eagle","colors":["Blue","Red"],"slogan":"","former_names":[],"abbreviation":"NRA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Eagle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 74. Democratic Action Party-Kenya (DAP-K)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Democratic Action Party-Kenya',
  'dap-k',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'dap-k@votecapsule.co.ke',
  '{"kyc":{"registration_number":"085","registration_date":"2021-05-17","certificate_url":null,"registered_office":"Chui House, Kilimani, Nairobi","postal_address":"10459-00100 Nairobi","physical_address":"Chui House, Kilimani, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Leopard","colors":["Blue","White","Black"],"slogan":"","former_names":[],"abbreviation":"DAP-K","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Leopard"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 75. Party for Peace and Development (PPD)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Party for Peace and Development',
  'ppd',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'ppd@votecapsule.co.ke',
  '{"kyc":{"registration_number":"086","registration_date":"2021-07-21","certificate_url":null,"registered_office":"Federico Plaza, Ruiru","postal_address":"1038-00232 Nairobi","physical_address":"Federico Plaza, Ruiru","phone":null,"status":"pending_verification","symbol_description":"Triangle","colors":["Red","White","Green","Black"],"slogan":"","former_names":["Party for Peace and Democracy"],"abbreviation":"PPD","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Triangle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 76. Chama Cha Kazi (Kazi)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Chama Cha Kazi',
  'kazi',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'kazi@votecapsule.co.ke',
  '{"kyc":{"registration_number":"087","registration_date":"2021-08-17","certificate_url":null,"registered_office":"The Avalon Building, 5th Floor, Ngong Road, Nairobi","postal_address":"1838-00200 Nairobi","physical_address":"The Avalon Building, 5th Floor, Ngong Road, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Overall coat","colors":["Blue","Red","White"],"slogan":"","former_names":[],"abbreviation":"Kazi","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Overall coat"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 77. Tujibebe Wakenya Party (JIBEBE)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Tujibebe Wakenya Party',
  'jibebe',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'jibebe@votecapsule.co.ke',
  '{"kyc":{"registration_number":"088","registration_date":"2021-10-12","certificate_url":null,"registered_office":"Chiromo Road","postal_address":"2245-00100 Nairobi","physical_address":"Chiromo Road","phone":null,"status":"pending_verification","symbol_description":"Buffalo","colors":["Blue","White","Beige"],"slogan":"","former_names":[],"abbreviation":"JIBEBE","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Buffalo"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 78. Kenya Union Party (KUP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya Union Party',
  'kup',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'kup@votecapsule.co.ke',
  '{"kyc":{"registration_number":"089","registration_date":"2021-10-12","certificate_url":null,"registered_office":"Wuyi Plaza Block Rm 10-Galana","postal_address":"15672-00509 Nairobi","physical_address":"Wuyi Plaza Block Rm 10-Galana","phone":null,"status":"pending_verification","symbol_description":"Two Vertical Ticks","colors":["Blue","Red","White"],"slogan":"","former_names":[],"abbreviation":"KUP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Two Vertical Ticks"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 79. Democratic National Alliance Party (DNA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Democratic National Alliance Party',
  'dna',
  'political_party',
  'active',
  'KE',
  '#7f1d1d',
  'dna@votecapsule.co.ke',
  '{"kyc":{"registration_number":"090","registration_date":"2021-10-15","certificate_url":null,"registered_office":"No. 5, May East Road, off Lang''ata Road, Karen/Hardy","postal_address":"78536-00507 Nairobi","physical_address":"No. 5, May East Road, off Lang''ata Road, Karen/Hardy","phone":null,"status":"pending_verification","symbol_description":"Traditional pot with collar","colors":["Maroon","Golden Yellow","Brown"],"slogan":"Your Voice, Your Power","former_names":["Umoja Summit Party"],"abbreviation":"DNA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7f1d1d","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Traditional pot with collar"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 80. Pamoja African Alliance (PAA)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Pamoja African Alliance',
  'paa',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'paa@votecapsule.co.ke',
  '{"kyc":{"registration_number":"091","registration_date":"2021-10-18","certificate_url":null,"registered_office":"Paa House, Nyali","postal_address":"34040-80118 Nyali","physical_address":"Paa House, Nyali","phone":null,"status":"pending_verification","symbol_description":"Traditional thatched African Hut","colors":["Blue","Yellow"],"slogan":"","former_names":[],"abbreviation":"PAA","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Traditional thatched African Hut"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 81. Mabadiliko Party of Kenya (MAPK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Mabadiliko Party of Kenya',
  'mapk',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'mapk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"092","registration_date":"2021-10-12","certificate_url":null,"registered_office":"Hurlingham, Rose Avenue, Nairobi","postal_address":"00505-21689 Nairobi","physical_address":"Hurlingham, Rose Avenue, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Honey Bee","colors":["Gold"],"slogan":"","former_names":[],"abbreviation":"MAPK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Honey Bee"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 82. Entrust Pioneer Party (EPP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Entrust Pioneer Party',
  'epp',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'epp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"093","registration_date":"2021-10-18","certificate_url":null,"registered_office":"Bazaar Plaza","postal_address":"22453-00100 Nairobi","physical_address":"Bazaar Plaza","phone":null,"status":"pending_verification","symbol_description":"Padlock and Chain","colors":["Black","Pink","White"],"slogan":"","former_names":[],"abbreviation":"EPP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Padlock and Chain"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 83. Party for Growth and Prosperity (PGP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Party for Growth and Prosperity',
  'pgp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'pgp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"094","registration_date":"2021-12-08","certificate_url":null,"registered_office":"104 Mwingi Road, Nairobi","postal_address":"41123-00100 Nairobi","physical_address":"104 Mwingi Road, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Encircled Trophy","colors":["Blue","Lime Green"],"slogan":"","former_names":[],"abbreviation":"PGP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Encircled Trophy"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 84. Green Thinking Action Party (GTAP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Green Thinking Action Party',
  'gtap',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'gtap@votecapsule.co.ke',
  '{"kyc":{"registration_number":"095","registration_date":"2021-10-18","certificate_url":null,"registered_office":"KICC Building, Lg 12 Harambee Avenue","postal_address":"9164-00200 Nairobi","physical_address":"KICC Building, Lg 12 Harambee Avenue","phone":null,"status":"pending_verification","symbol_description":"Growing Money","colors":["Green","Yellow","Red"],"slogan":"","former_names":[],"abbreviation":"GTAP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Growing Money"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 85. National Democracy Expansion Party (NDEP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Democracy Expansion Party',
  'ndep',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'ndep@votecapsule.co.ke',
  '{"kyc":{"registration_number":"096","registration_date":"2021-12-20","certificate_url":null,"registered_office":"Reli House, 3rd Floor, Room 319 Nairobi","postal_address":"35710-00200 Nairobi","physical_address":"Reli House, 3rd Floor, Room 319 Nairobi","phone":null,"status":"pending_verification","symbol_description":"Blue Water Tank on White background","colors":["Red","Violet","White","Yellow","Blue"],"slogan":"","former_names":[],"abbreviation":"NDEP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Blue Water Tank on White background"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 86. Unified Change Party (UCP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Unified Change Party',
  'ucp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'ucp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"097","registration_date":"2021-10-18","certificate_url":null,"registered_office":"Kwa Ngindu, Kitui Town","postal_address":"160-00518 Nairobi","physical_address":"Kwa Ngindu, Kitui Town","phone":null,"status":"pending_verification","symbol_description":"Blue Oval with party initials","colors":["Blue","White"],"slogan":"","former_names":[],"abbreviation":"UCP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Blue Oval with party initials"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 87. Universal Unity Party (UUP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Universal Unity Party',
  'uup',
  'political_party',
  'active',
  'KE',
  '#ec4899',
  'uup@votecapsule.co.ke',
  '{"kyc":{"registration_number":"098","registration_date":"2022-03-16","certificate_url":null,"registered_office":"Ruaraka, Nairobi","postal_address":"296-00618 Nairobi","physical_address":"Ruaraka, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Crown","colors":["Crown Pink","White","Black","Red"],"slogan":"Haki na Usawa kwa Wote","former_names":[],"abbreviation":"UUP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#ec4899","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Crown"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 88. Chama ya Mapatano of Kenya (CYMK)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Chama ya Mapatano of Kenya',
  'cymk',
  'political_party',
  'active',
  'KE',
  '#dc2626',
  'cymk@votecapsule.co.ke',
  '{"kyc":{"registration_number":"099","registration_date":"2022-03-16","certificate_url":null,"registered_office":"Hurlingham, Nairobi","postal_address":"51364-00100 Nairobi","physical_address":"Hurlingham, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Globe Red, Black and White","colors":["Red","Black","White"],"slogan":"","former_names":[],"abbreviation":"CYMK","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#dc2626","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Globe Red, Black and White"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 89. The Equitable Party (TEP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The Equitable Party',
  'tep',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'tep@votecapsule.co.ke',
  '{"kyc":{"registration_number":"100","registration_date":"2022-03-25","certificate_url":null,"registered_office":"Mtito Andei Rd.- Off Lenana Rd, Nairobi","postal_address":"7149-00200 Nairobi","physical_address":"Mtito Andei Rd.- Off Lenana Rd, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Weighing scale","colors":["Gold","Emerald"],"slogan":"Tusawazishe","former_names":[],"abbreviation":"TEP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Weighing scale"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 90. Azimio la Umoja One Kenya Coalition Party (Azimio)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Azimio la Umoja One Kenya Coalition Party',
  'azimio',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'azimio@votecapsule.co.ke',
  '{"kyc":{"registration_number":"101","registration_date":"2022-04-21","certificate_url":null,"registered_office":"Azimio House, House No.105, Dennis Pritt Road, Nairobi","postal_address":"10311-00100 Nairobi","physical_address":"Azimio House, House No.105, Dennis Pritt Road, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Five Stars against a blue background","colors":["Blue","Orange","White"],"slogan":"Azimio: Inawezakana","former_names":[],"abbreviation":"Azimio","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Five Stars against a blue background"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 91. The We Alliance Party (TWAP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'The We Alliance Party',
  'twap',
  'political_party',
  'active',
  'KE',
  '#eab308',
  'twap@votecapsule.co.ke',
  '{"kyc":{"registration_number":"102","registration_date":"2025-02-03","certificate_url":null,"registered_office":"White House Building, S4, Opposite Imara Primary School, off Kayole Road, Nairobi","postal_address":"53604-00200 Nairobi","physical_address":"White House Building, S4, Opposite Imara Primary School, off Kayole Road, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Plate and Spoon","colors":["Yellow","Blue"],"slogan":"Power to the people","former_names":[],"abbreviation":"TWAP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#eab308","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Plate and Spoon"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 92. Democracy for the Citizens Party (DCP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Democracy for the Citizens Party',
  'dcp',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'dcp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"103","registration_date":"2025-02-03","certificate_url":null,"registered_office":"Musa Gitau Road, Muthangari Drive","postal_address":"26237-0100 Nairobi","physical_address":"Musa Gitau Road, Muthangari Drive","phone":null,"status":"pending_verification","symbol_description":"DCP Logo","colors":["Green","Brown","Black"],"slogan":"Skiza Wakenya","former_names":[],"abbreviation":"DCP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"DCP Logo"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 93. National Economic Development Party (NEDP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'National Economic Development Party',
  'nedp',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'nedp@votecapsule.co.ke',
  '{"kyc":{"registration_number":"104","registration_date":"2025-11-19","certificate_url":null,"registered_office":"Ramco Court, Block B11","postal_address":"20322-00200 Nairobi","physical_address":"Ramco Court, Block B11","phone":null,"status":"pending_verification","symbol_description":"Magnifying glass","colors":["Light Blue","White","Maroon"],"slogan":"Uchumi Bora, Nguvu Yetu","former_names":[],"abbreviation":"NEDP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Magnifying glass"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 94. People's Renaissance Movement (PM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'People''s Renaissance Movement',
  'pm',
  'political_party',
  'active',
  'KE',
  '#2563eb',
  'pm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"105","registration_date":"2026-04-13","certificate_url":null,"registered_office":"River Bank Court, Kileleshwa, Nairobi","postal_address":"21831-00100 Nairobi","physical_address":"River Bank Court, Kileleshwa, Nairobi","phone":null,"status":"pending_verification","symbol_description":"Hummingbird","colors":["Deep Blue","Bright Red","White"],"slogan":"The Change we need","former_names":[],"abbreviation":"PM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#2563eb","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Hummingbird"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 95. Kenya United Generation Party (KUG)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kenya United Generation Party',
  'kug',
  'political_party',
  'active',
  'KE',
  '#16a34a',
  'kug@votecapsule.co.ke',
  '{"kyc":{"registration_number":"106","registration_date":"2026-04-17","certificate_url":null,"registered_office":"Development House, Moi Avenue 2nd Floor, Room 19","postal_address":"10903-00100 Nairobi","physical_address":"Development House, Moi Avenue 2nd Floor, Room 19","phone":null,"status":"pending_verification","symbol_description":"Infinity Circle","colors":["Green","Brown","Blue"],"slogan":"Equality for all Generations","former_names":[],"abbreviation":"KUG","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#16a34a","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Infinity Circle"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 96. Peoples' Forum for Rebuilding Democracy (PFRD)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Peoples'' Forum for Rebuilding Democracy',
  'pfrd',
  'political_party',
  'active',
  'KE',
  '#7f1d1d',
  'pfrd@votecapsule.co.ke',
  '{"kyc":{"registration_number":"107","registration_date":"2026-04-17","certificate_url":null,"registered_office":"The Spur Mall, 2nd Floor, Room 023, Thika Road","postal_address":"26181 Ruiru","physical_address":"The Spur Mall, 2nd Floor, Room 023, Thika Road","phone":null,"status":"pending_verification","symbol_description":"Pen and Sign","colors":["Maroon","Blue","Red","Green","Black","White"],"slogan":"Party to be! the change we want!","former_names":[],"abbreviation":"PFRD","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#7f1d1d","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Pen and Sign"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 97. Msingi wa Utaifa (MUP)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Msingi wa Utaifa',
  'mup',
  'political_party',
  'active',
  'KE',
  '#1f2937',
  'mup@votecapsule.co.ke',
  '{"kyc":{"registration_number":"108","registration_date":"2026-04-17","certificate_url":null,"registered_office":"Mwari House, 4th Floor, door 14, Kahawa West off Kamiti Road","postal_address":"5556-00200 Nairobi","physical_address":"Mwari House, 4th Floor, door 14, Kahawa West off Kamiti Road","phone":null,"status":"pending_verification","symbol_description":"Pillar","colors":["Black","White","Purple"],"slogan":"Sauti ya Wanyonge","former_names":[],"abbreviation":"MUP","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#1f2937","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Pillar"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 98. United Patriotic Party (UPM)
INSERT INTO tenants (id, name, slug, type, status, country_code, primary_color, contact_email, settings, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'United Patriotic Party',
  'upm',
  'political_party',
  'active',
  'KE',
  '#f97316',
  'upm@votecapsule.co.ke',
  '{"kyc":{"registration_number":"109","registration_date":"2026-06-26","certificate_url":null,"registered_office":"Kitengela Township, Along Kitengela-Namanga Road, Behind Nairobi Women Hospital","postal_address":"41422-00100 Nairobi","physical_address":"Kitengela Township, Along Kitengela-Namanga Road, Behind Nairobi Women Hospital","phone":null,"status":"pending_verification","symbol_description":"Mask","colors":["Orange","Black","White"],"slogan":"Stability and prosperity","former_names":[],"abbreviation":"UPM","orpp_registration_status":"fully_registered","orpp_source_date":"2026-07"},"branding":{"primary_color":"#f97316","secondary_color":null,"logo_url":null,"banner_url":null,"symbol_description":"Mask"},"social_media":{"twitter":null,"facebook":null,"instagram":null,"youtube":null,"website":null,"tiktok":null},"officials":[{"position":"Party Leader","name":null,"id_number":null,"phone":null,"email":null},{"position":"Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"Treasurer","name":null,"id_number":null,"phone":null,"email":null},{"position":"Organizing Secretary","name":null,"id_number":null,"phone":null,"email":null},{"position":"Vice Chairperson","name":null,"id_number":null,"phone":null,"email":null},{"position":"Deputy Secretary General","name":null,"id_number":null,"phone":null,"email":null},{"position":"National Executive Committee Representative","name":null,"id_number":null,"phone":null,"email":null}]}'::jsonb,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ---- USERS ------------------------------------------------
-- users table has: id, email, email_verified, cognito_sub, status
-- No first_name/last_name columns — email only

-- User for PLP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'plp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NVP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nvp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for LPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'lpk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TDU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'tdu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PICK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pick@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DEP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dep@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KNC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'knc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MGP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mgp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KMM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kmm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for WPF
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'wpf@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PNU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pnu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UDA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'uda@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for ANP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'anp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KSC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ksc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for ODM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'odm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ppk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for FORD-KENYA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ford-kenya@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PPOK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ppok@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for JP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'jp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mdp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NARC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'narc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KADU-ASILI
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kadu-asili@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KPP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kpp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for CPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cpk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KANU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kanu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for SAFINA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'safina@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for CCU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ccu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NAP-K
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nap-k@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PEP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pep@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pdp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TND
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'tnd@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UDM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'udm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for SPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'spk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PDU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pdu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UMP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ump@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UPIA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'upia@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for FP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'fp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for EFP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'efp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for FPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'fpk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TNP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'tnp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for J-MAPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'j-mapk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for CCM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ccm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for AFC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'afc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for FORD
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ford@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for RLP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'rlp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for RPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'rpk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for VDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'vdp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UPF
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'upf@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for ANC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'anc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dpk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'udp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KRP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'krp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PTP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ptp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MCCP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mccp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DC
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dc@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for LDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ldp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for GCK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'gck@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NLP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nlp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MDG
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mdg@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for ALP-K
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'alp-k@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'up@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for ELP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'elp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TAKE
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'take@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for JFP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'jfp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for GDDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'gddp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UGM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ugm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UKW
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ukw@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UPA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'upa@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TSP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'tsp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NOPEU
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nopeu@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NRA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nra@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DAP-K
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dap-k@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PPD
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ppd@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for Kazi
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kazi@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for JIBEBE
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'jibebe@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KUP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kup@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DNA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dna@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PAA
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'paa@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MAPK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mapk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for EPP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'epp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PGP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pgp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for GTAP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'gtap@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NDEP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ndep@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UCP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ucp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UUP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'uup@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for CYMK
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cymk@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TEP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'tep@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for Azimio
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'azimio@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for TWAP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'twap@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for DCP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dcp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for NEDP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'nedp@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for KUG
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kug@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for PFRD
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pfrd@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for MUP
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mup@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- User for UPM
INSERT INTO users (id, email, email_verified, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'upm@votecapsule.co.ke',
  TRUE,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;


-- ---- TENANT_MEMBERS ----------------------------------------
-- tenant_members schema: tenant_id, user_id, role_id (FK→roles), status, joined_at
-- PARTY_ADMIN role_id = a8f03c3c-735c-45cb-9e15-aea27e9e00d4

INSERT INTO tenant_members (id, tenant_id, user_id, role_id, status, joined_at)
SELECT
  gen_random_uuid(),
  t.id,
  u.id,
  'a8f03c3c-735c-45cb-9e15-aea27e9e00d4',
  'active',
  NOW()
FROM tenants t
JOIN users u ON u.email = t.contact_email
WHERE t.type = 'political_party'
  AND t.contact_email LIKE '%@votecapsule.co.ke'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = t.id AND tm.user_id = u.id
  );


-- ---- VERIFICATION COUNTS -----------------------------------
-- SELECT COUNT(*) FROM tenants WHERE type = 'political_party';        -- Expected: 98
-- SELECT COUNT(*) FROM users WHERE email LIKE '%@votecapsule.co.ke'; -- Expected: 98
-- SELECT COUNT(*) FROM tenant_members WHERE role_id = 'a8f03c3c-735c-45cb-9e15-aea27e9e00d4'; -- Expected: 98

COMMIT;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('129_seed_political_parties.sql', NOW())
ON CONFLICT DO NOTHING;
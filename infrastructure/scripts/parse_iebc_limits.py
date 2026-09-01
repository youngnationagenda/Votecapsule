"""
Parse IEBC Gazette Notice No. 12251 (7th August 2026)
Extracts actual spending limits for all electoral levels.
"""
import re
import json

def parse_number(s):
    """Parse a number string like '18,302,374' -> 18302374"""
    try:
        return int(s.replace(',', '').replace(' ', '').strip())
    except:
        return None

def extract_schedule(text, start_marker, end_marker):
    """Extract a schedule section from the full text."""
    start = text.find(start_marker)
    end = text.find(end_marker) if end_marker else len(text)
    if start == -1:
        return ""
    return text[start:end]

# Read the full gazette text
with open('D:/Votecapsule/q_text.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

# ─── FIRST SCHEDULE: Presidential ─────────────────────────────────────────────
# Single entry: KES 6,112,543,133
presidential_limit = 6_112_543_133

# ─── SECOND SCHEDULE: County (Governor, Senator, County Woman MP) ──────────────
# Extract the raw second schedule section
i2 = full_text.find('SECOND SCHEDULE')
i3 = full_text.find('THIRD SCHEDULE')
second_text = full_text[i2:i3]

# County names in order (1-47)
county_names = [
    "Mombasa", "Kwale", "Kilifi", "Tana-River", "Lamu", "Taita-Taveta",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
    "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
    "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
    "Samburu", "Trans-Nzoia", "Uasin-Gishu", "Elgeyo-Marakwet", "Nandi",
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
    "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
    "Homa-Bay", "Migori", "Kisii", "Nyamira", "Nairobi City"
]

# Extract spending limits from second schedule
# The data appears in 3 columns: populations, areas, then limits
# Find all large numbers that are spending limits (> 10 million)
second_amounts = re.findall(r'([\d,]+)\s*\n', second_text)
second_limits = []
for amt in second_amounts:
    n = parse_number(amt)
    if n and n > 10_000_000 and n < 300_000_000:
        second_limits.append(n)

print(f"Second schedule: found {len(second_limits)} county limits")

# Map to county names (should be 47)
county_limits = {}
for i, name in enumerate(county_names):
    if i < len(second_limits):
        county_limits[i+1] = {
            "county_no": i+1,
            "county": name,
            "spending_limit_kes": second_limits[i]
        }

# ─── THIRD SCHEDULE: National Assembly (Constituencies) ────────────────────────
i3b = full_text.find('THIRD SCHEDULE')
i4 = full_text.find('FOURTH SCHEDULE')
third_text = full_text[i3b:i4]

# All 290 constituency data — extract spending limits (15M-110M range for MPs)
# The amounts appear in order: codes, names, populations, areas, limits
third_amounts = re.findall(r'([\d,]+)\s*\n', third_text)
constituency_limits_raw = []
for amt in third_amounts:
    n = parse_number(amt)
    if n and n > 10_000_000 and n < 200_000_000:
        constituency_limits_raw.append(n)

print(f"Third schedule: found {len(constituency_limits_raw)} constituency limits")

# ─── FOURTH SCHEDULE: County Assembly Wards ────────────────────────────────────
i4b = full_text.find('FOURTH SCHEDULE')
i5 = full_text.find('FIFTH SCHEDULE')
fourth_text = full_text[i4b:i5]

# Ward limits (typically 3M-8M range)
# Extract ward code + name + limit
ward_data = []
# Find patterns: ward code (4 digits), ward name, then eventually a limit
ward_blocks = re.findall(
    r'(\d{4})\s+([\w\s/\'-]+?)\s+[\d,]+\s+[\d.,]+\s+([\d,]+)',
    fourth_text
)

# Simpler: extract all amounts in ward range
fourth_amounts = re.findall(r'([\d,]+)\s*\n', fourth_text)
ward_limits_raw = []
for amt in fourth_amounts:
    n = parse_number(amt)
    if n and n > 2_000_000 and n < 20_000_000:
        ward_limits_raw.append(n)

print(f"Fourth schedule: found {len(ward_limits_raw)} ward limits")

# ─── FIFTH SCHEDULE: Political Parties ─────────────────────────────────────────
party_schedule = {
    "total_limit": 24_450_172_531,
    "categories": {
        "venues": 375_052_688,
        "publicity_materials": 1_066_714_464,
        "advertising_and_media": 2_517_509_489,
        "campaign_personnel": 332_922_614,
        "election_agents": 2_081_162_296,
        "transportation": 16_126_632_035,
        "communication": 134_230_217,
        "nomination_fees": 213_818_044,
        "security": 285_090_725,
        "accommodation": 24_945_438,
        "administrative_cost": 1_292_094_521
    }
}

# ─── Sixth Schedule: Formula ───────────────────────────────────────────────────
formula = {
    "ward":         {"fixed_cost": 3_225_105, "population_unit_cost": 42.10, "land_area_unit_cost": 1_655},
    "constituency": {"fixed_cost": 10_795_432, "population_unit_cost": 53.72, "land_area_unit_cost": 2_112},
    "county":       {"fixed_cost": 14_406_545, "population_unit_cost": 33.83, "land_area_unit_cost": 1_330}
}

# Print the county limits to verify
print("\n=== COUNTY LIMITS (Second Schedule) ===")
for no, data in county_limits.items():
    print(f"  {no:2d}. {data['county']:25s}  KES {data['spending_limit_kes']:>15,}")

print("\n=== FIRST 20 CONSTITUENCY LIMITS (Third Schedule) ===")
for i, lim in enumerate(constituency_limits_raw[:20]):
    print(f"  {i+1:3d}.  KES {lim:>15,}")

print(f"\n=== FORMULA (Sixth Schedule) ===")
for level, f in formula.items():
    print(f"  {level}: Fixed=KES {f['fixed_cost']:,}  Pop unit={f['population_unit_cost']}  Area unit={f['land_area_unit_cost']}")

print(f"\n=== FIFTH SCHEDULE (Party) ===")
print(f"  Total: KES {party_schedule['total_limit']:,}")

# Save the full extracted data
output = {
    "gazette_notice": "IEBC Gazette Notice No. 12251",
    "gazette_date": "7th August 2026",
    "election_date": "10th August 2027",
    "first_schedule_presidential": {
        "spending_limit_kes": presidential_limit
    },
    "second_schedule_county": county_limits,
    "third_schedule_constituency_limits": constituency_limits_raw,
    "ward_limits_raw": ward_limits_raw[:50],  # first 50
    "fifth_schedule_party": party_schedule,
    "sixth_schedule_formula": formula
}

with open('D:/Votecapsule/iebc_limits_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("\n\nSaved to D:/Votecapsule/iebc_limits_extracted.json")

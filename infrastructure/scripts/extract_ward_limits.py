"""
Extract ward code → spending limit pairs from IEBC Gazette Fourth Schedule.
The PDF extraction gives data in column-separated chunks. 
Structure per page: ward codes (left col), then ward names, then populations, then areas, then spending limits.
"""
import re, json

with open('D:/Votecapsule/q_text.txt','r',encoding='utf-8') as f:
    txt = f.read()

i4 = txt.find('FOURTH SCHEDULE')
i5 = txt.find('FIFTH SCHEDULE')
fourth = txt[i4:i5]
lines = [l.strip() for l in fourth.split('\n') if l.strip()]

# Parse the fourth schedule in chunks
# Each page block contains:
#   - some ward codes (4-digit, zero-padded)
#   - some ward names
#   - populations (numbers 1000-500000)
#   - areas (decimal numbers like 4.00)
#   - spending limits (numbers 2,000,000 - 15,000,000)
# The page header lines contain: 'FOURTH SCHEDULE', 'County', ward names, 'Population', 
#   'Approx. Area', '(sq.Km)', 'Spending Limits', '(KSh.)', date line, gazette number

# Strategy: collect ALL 4-digit ward codes and ALL spending-limit-range numbers
# Then pair them by index (they should be 1:1 in order)

ward_codes = []
ward_limits = []
ward_areas = []
ward_pops = []

# Skip header/footer junk
SKIP_PATTERNS = [
    r'^FOURTH SCHEDULE',
    r'^County$',
    r'^County Assembly$',
    r'^Ward Code$',
    r'^County Assembly Ward Name$',
    r'^Population$',
    r'^Approx\. Area$',
    r'^\(sq\.Km\.\)$',
    r'^Spending Limits$',
    r'^\(KSh\.\)$',
    r'^7th August',
    r'^THE KENYA GAZETTE$',
    r'^\d{4}$',  # page numbers like 3911, 3912
    r'^Mombasa$',r'^Kwale$',r'^Kilifi$',r'^Tana.River$',r'^Lamu$',r'^Taita.Taveta$',
    r'^Garissa$',r'^Wajir$',r'^Mandera$',r'^Marsabit$',r'^Isiolo$',r'^Meru$',
    r'^Tharaka.Nithi$',r'^Embu$',r'^Kitui$',r'^Machakos$',r'^Makueni$',
    r'^Nyandarua$',r'^Nyeri$',r'^Kirinyaga$',r"^Murang.a$",r'^Kiambu$',
    r'^Turkana$',r'^West Pokot$',r'^Samburu$',r'^Trans.Nzoia$',r'^Uasin.Gishu$',
    r'^Elgeyo.Marakwet$',r'^Nandi$',r'^Baringo$',r'^Laikipia$',r'^Nakuru$',
    r'^Narok$',r'^Kajiado$',r'^Kericho$',r'^Bomet$',r'^Kakamega$',r'^Vihiga$',
    r'^Bungoma$',r'^Busia$',r'^Siaya$',r'^Kisumu$',r'^Homa.Bay$',r'^Migori$',
    r'^Kisii$',r'^Nyamira$',r'^Nairobi City$',r'^Nairobi$',
]

def is_skip(line):
    for pat in SKIP_PATTERNS:
        if re.match(pat, line, re.IGNORECASE):
            return True
    return False

def parse_num(s):
    try:
        return float(s.replace(',','').strip())
    except:
        return None

# Collect ward codes (4-digit zero-padded strings like 0001..1460)
for line in lines:
    if re.match(r'^0*\d{1,4}$', line):
        n = int(line)
        if 1 <= n <= 1470:
            # Check it's a ward code (not a page number like 3911)
            if n not in [3911,3912,3913,3914,3915,3916,3917,3918,3919,3920,
                         3921,3922,3923,3924,3925,3926,3927,3928,3929,3930,
                         3931,3932,3933,3934,3935]:
                ward_codes.append(n)

# Collect spending limits: numbers between 2,500,000 and 15,000,000
for line in lines:
    # Remove comma-formatted number
    clean = line.replace(',','').strip()
    n = parse_num(clean)
    if n and 2_500_000 <= n <= 15_000_000:
        ward_limits.append(int(n))

print(f"Ward codes found: {len(ward_codes)}")
print(f"Ward limits found: {len(ward_limits)}")
print(f"First 10 codes: {ward_codes[:10]}")
print(f"First 10 limits: {ward_limits[:10]}")
print(f"Last 10 codes: {ward_codes[-10:]}")
print(f"Last 10 limits: {ward_limits[-10:]}")

# Check for duplicates in codes
from collections import Counter
code_counts = Counter(ward_codes)
dups = {k:v for k,v in code_counts.items() if v > 1}
if dups:
    print(f"Duplicate codes: {dups}")

# Build mapping
print(f"\nBuilding ward_code -> limit mapping...")
mapping = {}
if len(ward_codes) == len(ward_limits):
    for code, limit in zip(ward_codes, ward_limits):
        mapping[code] = limit
    print(f"Perfect 1:1 mapping: {len(mapping)} wards")
else:
    print(f"MISMATCH: {len(ward_codes)} codes vs {len(ward_limits)} limits")
    # Use sequential pairing for what we can
    for i in range(min(len(ward_codes), len(ward_limits))):
        mapping[ward_codes[i]] = ward_limits[i]
    print(f"Partial mapping: {len(mapping)} pairs")

# Save
with open('D:/Votecapsule/ward_code_limits.json','w') as fout:
    json.dump({str(k).zfill(4): v for k,v in sorted(mapping.items())}, fout, indent=2)
print(f"Saved to D:/Votecapsule/ward_code_limits.json")

# Verify first few
print("\nSample verification (first 10):")
for code in sorted(mapping.keys())[:10]:
    print(f"  Ward {str(code).zfill(4)}: KES {mapping[code]:,}")

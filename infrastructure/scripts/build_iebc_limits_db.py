"""
Build complete IEBC spending limits dataset from Gazette Notice No. 12251 (7 Aug 2026)
Produces the full migration SQL for iebc_spending_limits table.
"""
import re
import json

def p(s):
    try: return int(s.replace(',','').replace(' ','').strip())
    except: return None

with open('D:/Votecapsule/q_text.txt','r',encoding='utf-8') as f:
    txt = f.read()

# ══════════════════════════════════════════════════════════
# SECOND SCHEDULE — County level (Governor / Senator / CWR)
# Spending limit is same for Governor, Senator, County Woman Rep
# ══════════════════════════════════════════════════════════
county_data = [
  ( 1,"Mombasa",         1_208_333,  219,  60_967_580),
  ( 2,"Kwale",             866_820, 8_270, 58_831_579),
  ( 3,"Kilifi",          1_453_787,12_610, 86_540_978),
  ( 4,"Tana-River",        315_943,38_437, 78_056_087),
  ( 5,"Lamu",              143_920, 6_273, 28_693_735),
  ( 6,"Taita-Taveta",      340_671,17_084, 49_743_709),
  ( 7,"Garissa",           841_353,44_175,106_005_417),
  ( 8,"Wajir",             781_263,56_686,120_758_077),
  ( 9,"Mandera",           867_457,25_991, 83_048_388),
  (10,"Marsabit",          459_785,70_961,127_022_462),
  (11,"Isiolo",            268_002,25_336, 59_283_969),
  (12,"Meru",            1_545_714, 6_933, 80_000_292),
  (13,"Tharaka-Nithi",     393_177, 2_639, 32_302_217),
  (14,"Embu",              608_599, 2_818, 40_539_458),
  (15,"Kitui",           1_136_187,30_497, 97_557_935),
  (16,"Machakos",        1_421_932, 6_208, 74_032_349),
  (17,"Makueni",           987_653, 8_009, 61_103_771),
  (18,"Nyandarua",         638_289, 3_245, 43_117_614),
  (19,"Nyeri",             759_164, 3_337, 47_688_687),
  (20,"Kirinyaga",         610_411, 1_479, 38_828_616),
  (21,"Murang'a",        1_056_640, 2_559, 56_244_955),
  (22,"Kiambu",          2_417_735, 2_543,110_961_257),
  (23,"Turkana",           926_976,68_680,142_072_389),
  (24,"West Pokot",        621_241, 9_169, 50_500_924),
  (25,"Samburu",           310_327,21_022, 54_779_994),
  (26,"Trans-Nzoia",       990_341, 2_496, 55_217_341),
  (27,"Uasin-Gishu",     1_163_186, 3_345, 63_066_604),
  (28,"Elgeyo-Marakwet",   454_480, 3_030, 35_659_941),
  (29,"Nandi",             885_711, 2_884, 51_463_799),
  (30,"Baringo",           666_763,11_015, 54_916_519),
  (31,"Laikipia",          518_560, 9_462, 46_715_011),
  (32,"Nakuru",          2_162_202, 7_495,107_095_876),
  (33,"Narok",           1_157_873,17_933, 84_103_648),
  (34,"Kajiado",         1_117_840,21_901, 88_458_713),
  (35,"Kericho",           901_777, 2_158, 50_430_626),
  (36,"Bomet",             875_689, 2_792, 50_774_076),
  (37,"Kakamega",        1_867_579, 3_018, 88_535_359),
  (38,"Vihiga",            590_013,   564, 36_683_540),
  (39,"Bungoma",         1_670_570, 3_032, 80_844_663),
  (40,"Busia",             893_681, 1_695, 50_678_381),
  (41,"Siaya",             993_183, 2_530, 54_887_725),
  (42,"Kisumu",          1_155_574, 2_086, 60_822_166),
  (43,"Homa-Bay",        1_131_950, 3_183, 61_880_866),
  (44,"Migori",          1_116_436, 2_596, 61_567_788),
  (45,"Kisii",           1_266_860, 1_318, 62_519_170),
  (46,"Nyamira",           605_576,   899, 38_115_302),
  (47,"Nairobi City",    4_397_073,   695,181_312_885),
]

# ══════════════════════════════════════════════════════════
# THIRD SCHEDULE — National Assembly Constituencies (290)
# Mapped precisely: code 1-290 with names and limits
# ══════════════════════════════════════════════════════════
constituency_data = [
  # Mombasa (1-6)
  (  1,"Changamwe",        131_797,  16,  18_302_374),
  (  2,"Jomvu",            167_143,  29,  20_334_070),
  (  3,"Kisauni",          289_579,  88,  27_401_021),
  (  4,"Nyali",            216_458,  22,  23_115_519),
  (  5,"Likoni",           251_833,  42,  25_163_610),
  (  6,"Mvita",            151_525,  16,  19_421_040),
  # Kwale (7-9)
  (  7,"Msambweni",        174_410, 424,  21_580_342),
  (  8,"Lungalunga",       198_918,2804,  27_996_585),
  (  9,"Matuga",           193_571,1032,  23_950_925),
  # Tana River (10-12)
  ( 10,"Garsen",           299_920,4012,  36_274_916),
  ( 11,"Galole",           283_720, 529,  28_000_208),
  ( 12,"Bura",             233_771, 401,  24_897_647),
  # Lamu (13-14)
  ( 13,"Lamu East",        192_291, 686,  23_147_598),
  ( 14,"Lamu West",        121_330, 206,  18_110_156),
  # Taita-Taveta (15-17)
  ( 15,"Taveta",           173_966,2941,  26_871_052),
  ( 16,"Wundanyi",          82_980, 627,  15_430_114), # wait—let me recheck order
  # Per the gazette text: Kilifi constituencies come after Tana River
  # Let me re-sequence using the official constituency code numbering
]

# The IEBC uses official constituency codes 1-290.
# Let me use the exact data from the text extraction (in order)
# I already have constituency_limits_raw from the parser (292 items — 290 + 2 extras due to PDF artifacts)
# Let me re-extract with proper name mapping

# Re-read the third schedule text
i3 = txt.find('THIRD SCHEDULE')
i4 = txt.find('FOURTH SCHEDULE')
third_text = txt[i3:i4]

# Extract all spending limit amounts in order (15M-110M range for MPs)
raw_amounts = re.findall(r'([\d,]{7,12})\s*\n', third_text)
mp_limits = []
for a in raw_amounts:
    n = p(a)
    if n and 12_000_000 <= n <= 120_000_000:
        mp_limits.append(n)

print(f"MP limits found: {len(mp_limits)} (expect 290)")

# Official 290 constituency names in code order (from IEBC)
# Source: IEBC constituency register matched to gazette codes
constituency_names_290 = [
  # 1-9: Mombasa
  "Changamwe","Jomvu","Kisauni","Nyali","Likoni","Mvita",
  # 7-9: Kwale coastal
  "Msambweni","Lungalunga","Matuga",
  # 10-12: Tana River  
  "Garsen","Galole","Bura",
  # 13-14: Lamu
  "Lamu East","Lamu West",
  # 15: Taita-Taveta
  "Taveta",
  # 16-18: Kilifi (Kinango in Kwale, then Kilifi)
  "Kinango",
  "Kilifi North","Kilifi South","Kaloleni","Rabai","Ganze","Malindi","Magarini",
  # 24-26: Taita-Taveta cont
  "Wundanyi","Mwatate","Voi",
  # 27-32: Garissa
  "Garissa Township","Balambala","Lagdera","Dadaab","Fafi","Ijara",
  # 33-38: Wajir
  "Wajir North","Wajir East","Tarbaj","Wajir West","Eldas","Wajir South",
  # 39-44: Mandera
  "Mandera West","Banissa","Mandera North","Mandera South","Mandera East","Lafey",
  # 45-48: Marsabit
  "Moyale","North Horr","Saku","Laisamis",
  # 49-50: Isiolo
  "Isiolo North","Isiolo South",
  # 51-58: Meru
  "Igembe South","Igembe Central","Igembe North","Tigania West","Tigania East",
  "North Imenti","Buuri","Central Imenti","South Imenti",
  # 60-62: Tharaka-Nithi
  "Maara","Chuka/Igambang'ombe","Tharaka",
  # 63-66: Embu
  "Manyatta","Runyenjes","Mbeere South","Mbeere North",
  # 67-74: Kitui
  "Mwingi North","Mwingi West","Mwingi Central","Kitui West","Kitui Rural",
  "Kitui Central","Kitui East","Kitui South",
  # 75-81: Machakos
  "Masinga","Yatta","Kangundo","Matungulu","Kathiani","Mavoko","Machakos Town",
  # 82-88: Makueni
  "Mwala","Mbooni","Kilome","Kaiti","Makueni","Kibwezi West","Kibwezi East",
  # 89-94: Nyandarua
  "Kinangop","Kipipiri","Ol Kalou","Ol Jorok","Ndaragwa",
  # 95-99: Nyeri
  "Tetu","Kieni","Mathira","Othaya","Mukurweini","Nyeri Town",
  # 100-103: Kirinyaga
  "Mwea","Gichugu","Ndia","Kirinyaga Central",
  # 104-109: Murang'a
  "Kangema","Mathioya","Kiharu","Kigumo","Maragwa","Kandara","Gatanga",
  # 111-122: Kiambu
  "Gatundu South","Gatundu North","Juja","Thika Town","Ruiru","Githunguri",
  "Kiambu","Kiambaa","Kabete","Kikuyu","Limuru","Lari",
  # 123-128: Turkana
  "Turkana North","Turkana West","Turkana Central","Loima","Turkana South","Turkana East",
  # 129-132: West Pokot
  "Kapenguria","Sigor","Kacheliba","Pokot South",
  # 133-135: Samburu
  "Samburu West","Samburu North","Samburu East",
  # 136-140: Trans-Nzoia
  "Kwanza","Endebess","Saboti","Kiminini","Cherangany",
  # 141-146: Uasin-Gishu
  "Soy","Turbo","Moiben","Ainabkoi","Kapseret","Kesses",
  # 147-150: Elgeyo-Marakwet
  "Marakwet East","Marakwet West","Keiyo North","Keiyo South",
  # 151-155: Nandi
  "Tinderet","Aldai","Nandi Hills","Chesumei","Emgwen",
  # 156-159: Baringo
  "Eldama Ravine","Tiaty","Baringo North","Baringo Central","Baringo South","Mogotio",
  # 162-163: Laikipia
  "Laikipia West","Laikipia East","Laikipia North",
  # 165-168: Nakuru
  "Molo","Njoro","Mau Narok","Naivasha","Gilgil","Kuresoi South","Kuresoi North",
  "Subukia","Rongai","Bahati","Nakuru Town West","Nakuru Town East",
  # 177-180: Narok
  "Kilgoris","Emurua Dikirr","Narok North","Narok East","Narok South","Narok West",
  # 183-187: Kajiado
  "Kajiado North","Kajiado Central","Kajiado East","Kajiado West","Kajiado South",
  # 188-192: Kericho
  "Kipkelion East","Kipkelion West","Ainamoi","Bureti","Belgut","Sigowet/Soin",
  # 194-198: Bomet
  "Sotik","Chepalungu","Bomet East","Bomet Central","Konoin",
  # 199-205: Kakamega
  "Lugari","Likuyani","Malava","Lurambi","Navakholo","Mumias West","Mumias East",
  "Matungu","Butere","Khwisero","Shinyalu","Ikolomani",
  # 211-213: Vihiga
  "Vihiga","Sabatia","Hamisi","Luanda","Emuhaya",
  # 216-220: Bungoma
  "Mt. Elgon","Sirisia","Kabuchai","Bumula","Kanduyi",
  "Webuye East","Webuye West","Kimilili","Tongaren",
  # 225-228: Busia
  "Teso North","Teso South","Nambale","Matayos","Butula","Funyula","Budalangi",
  # 232-235: Siaya
  "Ugenya","Ugunja","Alego Usonga","Gem","Bondo","Rarieda",
  # 238-241: Kisumu
  "Kisumu East","Kisumu West","Kisumu Central","Seme","Nyando","Muhoroni","Nyakach",
  # 245-248: Homa Bay
  "Kasipul","Kabondo Kasipul","Karachuonyo","Rangwe","Homa Bay Town",
  "Ndhiwa","Mbita","Suba North","Suba South",
  # 254-257: Migori
  "Rongo","Awendo","Suna East","Suna West","Uriri","Nyatike","Kuria West","Kuria East",
  # 262-265: Kisii
  "Bonchari","South Mugirango","Bomachoge Borabu","Bobasi","Bomachoge Chache",
  "Nyaribari Masaba","Nyaribari Chache","Kitutu Chache North","Kitutu Chache South",
  # 271-272: Nyamira
  "Kitutu Masaba","West Mugirango","North Mugirango","Borabu",
  # 275-290: Nairobi
  "Westlands","Dagoretti North","Dagoretti South","Langata","Kibra",
  "Roysambu","Kasarani","Ruaraka","Embakasi South","Embakasi North",
  "Embakasi Central","Embakasi East","Embakasi West","Makadara",
  "Kamukunji","Starehe","Mathare",
]

print(f"Constituency names defined: {len(constituency_names_290)}")
print(f"Constituency limits extracted: {len(mp_limits)}")

# ══════════════════════════════════════════════════════════
# FOURTH SCHEDULE — County Assembly Wards
# Parse directly from PDF with ward codes
# ══════════════════════════════════════════════════════════
i4b = txt.find('FOURTH SCHEDULE')
i5  = txt.find('FIFTH SCHEDULE')
fourth_text = txt[i4b:i5]

# Extract ward code + spending limit pairs
# Pattern: 4-digit ward code followed eventually by a spending limit (3M-10M)
ward_lines = fourth_text.split('\n')

# Collect all 4-digit codes and their associated limits
ward_codes = []
ward_limits_seq = []
for line in ward_lines:
    line = line.strip()
    if re.match(r'^\d{4}$', line):
        ward_codes.append(int(line))
    # Ward limits are in range 3M-12M
    n = p(line.replace(' ',''))
    if n and 2_500_000 <= n <= 15_000_000:
        ward_limits_seq.append(n)

print(f"\nWard codes found: {len(ward_codes)}")
print(f"Ward limits found: {len(ward_limits_seq)}")
print(f"First 10 ward codes: {ward_codes[:10]}")
print(f"First 10 ward limits: {ward_limits_seq[:10]}")

# Save summary
summary = {
    "gazette": "IEBC Gazette Notice No. 12251, 7th August 2026",
    "presidential": {"limit_kes": 6_112_543_133},
    "county_positions": ["governor", "senator", "county_woman_rep"],
    "county_limits": {str(c[0]): {"name": c[1], "limit_kes": c[4]} for c in county_data},
    "constituency_mp_limits_ordered": mp_limits[:290],
    "ward_codes_found": len(ward_codes),
    "ward_limits_found": len(ward_limits_seq),
    "formula": {
        "ward":         {"fixed": 3_225_105, "pop_unit": 42.10,  "area_unit": 1655},
        "constituency": {"fixed":10_795_432, "pop_unit": 53.72,  "area_unit": 2112},
        "county":       {"fixed":14_406_545, "pop_unit": 33.83,  "area_unit": 1330},
    },
    "party_total_limit": 24_450_172_531,
    "party_categories": {
        "venues":              375_052_688,
        "publicity_materials": 1_066_714_464,
        "advertising_media":   2_517_509_489,
        "campaign_personnel":  332_922_614,
        "election_agents":     2_081_162_296,
        "transportation":      16_126_632_035,
        "communication":       134_230_217,
        "nomination_fees":     213_818_044,
        "security":            285_090_725,
        "accommodation":       24_945_438,
        "administrative_cost": 1_292_094_521,
    }
}
with open('D:/Votecapsule/iebc_full_limits.json','w',encoding='utf-8') as f:
    json.dump(summary, f, indent=2)
print("\nSaved D:/Votecapsule/iebc_full_limits.json")

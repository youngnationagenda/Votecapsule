-- VoteCapsule Migration 140
-- Seed 500+ Campaign Material Types
-- Dependency: 137_campaign_seed_material_categories.sql

BEGIN;

DO $body$
DECLARE
  v_print UUID; v_cloth UUID; v_outdoor UUID; v_digital UUID;
  v_vehicle UUID; v_event UUID; v_promo UUID; v_audio UUID;
  v_stage UUID; v_food UUID; v_security UUID; v_stat UUID;
  v_social UUID; v_comms UUID; v_transport UUID; v_media UUID; v_misc UUID;
BEGIN
  SELECT id INTO v_print    FROM campaign_material_categories WHERE code=$$PRINTED_MATERIALS$$;
  SELECT id INTO v_cloth    FROM campaign_material_categories WHERE code=$$BRANDED_CLOTHING$$;
  SELECT id INTO v_outdoor  FROM campaign_material_categories WHERE code=$$OUTDOOR_ADVERTISING$$;
  SELECT id INTO v_digital  FROM campaign_material_categories WHERE code=$$DIGITAL_MEDIA$$;
  SELECT id INTO v_vehicle  FROM campaign_material_categories WHERE code=$$VEHICLE_BRANDING$$;
  SELECT id INTO v_event    FROM campaign_material_categories WHERE code=$$EVENT_SUPPLIES$$;
  SELECT id INTO v_promo    FROM campaign_material_categories WHERE code=$$PROMOTIONAL_ITEMS$$;
  SELECT id INTO v_audio    FROM campaign_material_categories WHERE code=$$AUDIO_EQUIPMENT$$;
  SELECT id INTO v_stage    FROM campaign_material_categories WHERE code=$$STAGE_EQUIPMENT$$;
  SELECT id INTO v_food     FROM campaign_material_categories WHERE code=$$FOOD_BEVERAGES$$;
  SELECT id INTO v_security FROM campaign_material_categories WHERE code=$$SECURITY_ITEMS$$;
  SELECT id INTO v_stat     FROM campaign_material_categories WHERE code=$$STATIONERY$$;
  SELECT id INTO v_social   FROM campaign_material_categories WHERE code=$$SOCIAL_MEDIA$$;
  SELECT id INTO v_comms    FROM campaign_material_categories WHERE code=$$COMMUNICATION_TOOLS$$;
  SELECT id INTO v_transport FROM campaign_material_categories WHERE code=$$TRANSPORT_MATERIALS$$;
  SELECT id INTO v_media    FROM campaign_material_categories WHERE code=$$MEDIA_PRODUCTION$$;
  SELECT id INTO v_misc     FROM campaign_material_categories WHERE code=$$MISCELLANEOUS$$;

  -- PRINTED_MATERIALS (30 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_print,$$A4_POSTER$$,$$A4 Poster 210x297mm$$,$$piece$$,100,5),
 (v_print,$$A3_POSTER$$,$$A3 Poster 297x420mm$$,$$piece$$,100,5),
 (v_print,$$A2_POSTER$$,$$A2 Poster 420x594mm$$,$$piece$$,50,5),
 (v_print,$$A1_POSTER$$,$$A1 Poster 594x841mm$$,$$piece$$,50,7),
 (v_print,$$A0_POSTER$$,$$A0 Poster 841x1189mm$$,$$piece$$,20,7),
 (v_print,$$FLYER_A5$$,$$A5 Flyer 148x210mm$$,$$piece$$,500,5),
 (v_print,$$FLYER_DL$$,$$DL Flyer 99x210mm$$,$$piece$$,500,5),
 (v_print,$$LEAFLET_TRIFOLD$$,$$Trifold Leaflet$$,$$piece$$,500,7),
 (v_print,$$LEAFLET_BIFOLD$$,$$Bifold Leaflet$$,$$piece$$,500,7),
 (v_print,$$BROCHURE_A4$$,$$A4 Brochure 8-page$$,$$piece$$,200,10),
 (v_print,$$BUSINESS_CARD$$,$$Business Cards 90x54mm$$,$$piece$$,500,5),
 (v_print,$$POSTCARD$$,$$Postcard A6$$,$$piece$$,500,5),
 (v_print,$$BANNER_PULL_UP$$,$$Pull-Up Banner 85x200cm$$,$$piece$$,5,7),
 (v_print,$$BANNER_X_STAND$$,$$X-Stand Banner 60x160cm$$,$$piece$$,5,7),
 (v_print,$$BANNER_FABRIC$$,$$Fabric Banner Custom$$,$$piece$$,10,10),
 (v_print,$$BANNER_VINYL_SMALL$$,$$PVC Banner 1x2m$$,$$piece$$,20,7),
 (v_print,$$BANNER_VINYL_MEDIUM$$,$$PVC Banner 2x3m$$,$$piece$$,10,10),
 (v_print,$$BANNER_VINYL_LARGE$$,$$PVC Banner 3x6m$$,$$piece$$,5,14),
 (v_print,$$STICKER_A4$$,$$A4 Sticker Sheet$$,$$sheet$$,200,5),
 (v_print,$$STICKER_ROUND$$,$$Round Sticker 5cm$$,$$piece$$,1000,5),
 (v_print,$$STICKER_OVAL$$,$$Oval Sticker 7x5cm$$,$$piece$$,1000,5),
 (v_print,$$STICKER_BUMPER$$,$$Bumper Sticker 30x8cm$$,$$piece$$,500,7),
 (v_print,$$CALENDAR_WALL$$,$$Wall Calendar A3$$,$$piece$$,100,14),
 (v_print,$$CALENDAR_DESK$$,$$Desk Calendar$$,$$piece$$,100,14),
 (v_print,$$NOTEPAD_A5$$,$$A5 Branded Notepad 50pp$$,$$piece$$,100,10),
 (v_print,$$ENVELOPE_BRANDED$$,$$Branded Envelope DL$$,$$piece$$,500,10),
 (v_print,$$LETTERHEAD$$,$$Branded Letterhead A4$$,$$piece$$,500,7),
 (v_print,$$VOTERS_CARD_HOLDER$$,$$Voters Card Holder$$,$$piece$$,500,7),
 (v_print,$$DOOR_HANGER$$,$$Door Hanger A5$$,$$piece$$,500,5),
 (v_print,$$TABLE_TENT$$,$$Table Tent Card$$,$$piece$$,200,7)
 ON CONFLICT (code) DO NOTHING;

  -- BRANDED_CLOTHING (25 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_cloth,$$TSHIRT_POLO$$,$$Polo T-Shirt$$,$$piece$$,50,14),
 (v_cloth,$$TSHIRT_ROUND$$,$$Round-Neck T-Shirt$$,$$piece$$,50,14),
 (v_cloth,$$TSHIRT_V_NECK$$,$$V-Neck T-Shirt$$,$$piece$$,50,14),
 (v_cloth,$$CAP_BASEBALL$$,$$Baseball Cap$$,$$piece$$,50,14),
 (v_cloth,$$CAP_TRUCKER$$,$$Trucker Cap$$,$$piece$$,50,14),
 (v_cloth,$$CAP_BUCKET$$,$$Bucket Hat$$,$$piece$$,50,14),
 (v_cloth,$$BEANIE$$,$$Branded Beanie$$,$$piece$$,50,14),
 (v_cloth,$$HOODIE$$,$$Branded Hoodie$$,$$piece$$,30,14),
 (v_cloth,$$JACKET_FLEECE$$,$$Fleece Jacket$$,$$piece$$,30,21),
 (v_cloth,$$JACKET_WINDBREAKER$$,$$Windbreaker Jacket$$,$$piece$$,30,21),
 (v_cloth,$$VEST_CAMPAIGN$$,$$Campaign Vest$$,$$piece$$,50,14),
 (v_cloth,$$BIKER_JACKET$$,$$Biker Jacket Branded$$,$$piece$$,20,21),
 (v_cloth,$$SCARF$$,$$Branded Scarf$$,$$piece$$,100,14),
 (v_cloth,$$HEADBAND$$,$$Branded Headband$$,$$piece$$,100,10),
 (v_cloth,$$WRISTBAND$$,$$Branded Wristband$$,$$piece$$,200,10),
 (v_cloth,$$SASH$$,$$Campaign Sash$$,$$piece$$,100,14),
 (v_cloth,$$TIE$$,$$Branded Tie$$,$$piece$$,50,14),
 (v_cloth,$$APRON$$,$$Branded Apron$$,$$piece$$,50,14),
 (v_cloth,$$OVERALLS$$,$$Branded Overalls$$,$$piece$$,30,21),
 (v_cloth,$$UNIFORM_SHIRT$$,$$Campaign Team Shirt$$,$$piece$$,50,14),
 (v_cloth,$$KANZU$$,$$Branded Kanzu$$,$$piece$$,50,14),
 (v_cloth,$$KITENGE_SET$$,$$Kitenge Campaign Set$$,$$set$$,30,21),
 (v_cloth,$$CHITENGE_WRAP$$,$$Chitenge Wrap$$,$$piece$$,50,14),
 (v_cloth,$$LESO$$,$$Leso Campaign Print$$,$$piece$$,100,14),
 (v_cloth,$$GOLF_SHIRT$$,$$Golf Shirt$$,$$piece$$,30,14)
 ON CONFLICT (code) DO NOTHING;

  -- OUTDOOR_ADVERTISING (20 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_outdoor,$$BILLBOARD_MEGA$$,$$Mega Billboard 12x4m$$,$$piece$$,1,21),
 (v_outdoor,$$BILLBOARD_LARGE$$,$$Large Billboard 8x3m$$,$$piece$$,1,21),
 (v_outdoor,$$BILLBOARD_MEDIUM$$,$$Medium Billboard 6x2m$$,$$piece$$,1,14),
 (v_outdoor,$$BILLBOARD_SMALL$$,$$Small Billboard 3x2m$$,$$piece$$,1,14),
 (v_outdoor,$$BANNER_STREET$$,$$Street Banner 0.6x3m$$,$$piece$$,20,7),
 (v_outdoor,$$BANNER_MUNICIPAL$$,$$Municipal Banner 1x3m$$,$$piece$$,10,10),
 (v_outdoor,$$POSTER_OUTDOOR$$,$$Outdoor Poster A1 Laminated$$,$$piece$$,50,7),
 (v_outdoor,$$SIGNAGE_ARROW$$,$$Directional Arrow Sign$$,$$piece$$,20,10),
 (v_outdoor,$$SIGNAGE_POST$$,$$Post-Mounted Signage$$,$$piece$$,10,14),
 (v_outdoor,$$SIGNAGE_HOARDING$$,$$Site Hoarding Panel$$,$$piece$$,5,14),
 (v_outdoor,$$LAMP_POST_BANNER$$,$$Lamp Post Banner 40x120cm$$,$$piece$$,50,10),
 (v_outdoor,$$GATE_FRAME$$,$$Campaign Gate Frame$$,$$piece$$,5,14),
 (v_outdoor,$$ARCH_INFLATABLE$$,$$Inflatable Arch 6m$$,$$piece$$,2,21),
 (v_outdoor,$$STANDEE_OUTDOOR$$,$$Outdoor Standee Aluminum$$,$$piece$$,10,14),
 (v_outdoor,$$YARD_SIGN$$,$$Corflute Yard Sign 60x90cm$$,$$piece$$,50,7),
 (v_outdoor,$$WALL_STICKER_LARGE$$,$$Wall Sticker 1x2m$$,$$piece$$,20,14),
 (v_outdoor,$$VEHICLE_WRAP_FULL$$,$$Full Vehicle Wrap$$,$$piece$$,1,14),
 (v_outdoor,$$VEHICLE_WRAP_HALF$$,$$Half Vehicle Wrap$$,$$piece$$,1,10),
 (v_outdoor,$$VEHICLE_MAGNET$$,$$Vehicle Magnetic Sign$$,$$piece$$,10,7),
 (v_outdoor,$$FENCE_BANNER$$,$$Fence Mesh Banner 1x5m$$,$$piece$$,10,10)
 ON CONFLICT (code) DO NOTHING;


  -- DIGITAL_MEDIA (20 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_digital,$$SOCIAL_PROFILE_PHOTO$$,$$Social Media Profile Photo$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_COVER_PHOTO$$,$$Social Media Cover Photo$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_POST_SQUARE$$,$$Instagram Square Post 1080x1080$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_POST_STORY$$,$$Instagram Story 1080x1920$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_POST_FB$$,$$Facebook Post 1200x628$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_POST_TWITTER$$,$$Twitter Post 1600x900$$,$$piece$$,1,2),
 (v_digital,$$SOCIAL_POST_ANIMATED$$,$$Animated Social Post GIF$$,$$piece$$,1,5),
 (v_digital,$$DIGITAL_CAMPAIGN_VIDEO$$,$$Campaign Video 60sec$$,$$piece$$,1,14),
 (v_digital,$$DIGITAL_AD_BANNER$$,$$Digital Display Banner 728x90$$,$$piece$$,1,3),
 (v_digital,$$DIGITAL_AD_MPU$$,$$MPU Ad 300x250$$,$$piece$$,1,3),
 (v_digital,$$EMAIL_HEADER$$,$$Email Campaign Header$$,$$piece$$,1,3),
 (v_digital,$$EMAIL_NEWSLETTER$$,$$Email Newsletter Template$$,$$piece$$,1,5),
 (v_digital,$$WHATSAPP_CARD$$,$$WhatsApp Campaign Card$$,$$piece$$,1,2),
 (v_digital,$$WHATSAPP_STATUS$$,$$WhatsApp Status 1080x1920$$,$$piece$$,1,2),
 (v_digital,$$YOUTUBE_THUMBNAIL$$,$$YouTube Thumbnail 1280x720$$,$$piece$$,1,2),
 (v_digital,$$YOUTUBE_BANNER$$,$$YouTube Channel Banner$$,$$piece$$,1,2),
 (v_digital,$$TV_AD_15SEC$$,$$TV Commercial 15 seconds$$,$$piece$$,1,21),
 (v_digital,$$TV_AD_30SEC$$,$$TV Commercial 30 seconds$$,$$piece$$,1,21),
 (v_digital,$$RADIO_AD_30SEC$$,$$Radio Spot 30 seconds$$,$$piece$$,1,14),
 (v_digital,$$RADIO_AD_60SEC$$,$$Radio Spot 60 seconds$$,$$piece$$,1,14)
 ON CONFLICT (code) DO NOTHING;

  -- EVENT_SUPPLIES (20 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_event,$$TENT_3X3$$,$$Gazebo Tent 3x3m$$,$$piece$$,2,14),
 (v_event,$$TENT_6X3$$,$$Marquee Tent 6x3m$$,$$piece$$,1,14),
 (v_event,$$TENT_10X5$$,$$Event Tent 10x5m$$,$$piece$$,1,21),
 (v_event,$$CHAIR_PLASTIC$$,$$Plastic Chair$$,$$piece$$,100,7),
 (v_event,$$CHAIR_BRANDED$$,$$Branded Chair Cover$$,$$piece$$,100,10),
 (v_event,$$TABLE_FOLD$$,$$Folding Table 6ft$$,$$piece$$,20,7),
 (v_event,$$TABLE_BRANDED$$,$$Branded Table Cover$$,$$piece$$,20,7),
 (v_event,$$PODIUM_BRANDED$$,$$Branded Podium$$,$$piece$$,2,14),
 (v_event,$$BACKDROP_3X3$$,$$Event Backdrop 3x3m$$,$$piece$$,2,10),
 (v_event,$$BACKDROP_6X3$$,$$Event Backdrop 6x3m$$,$$piece$$,1,10),
 (v_event,$$FLAG_CAMPAIGN$$,$$Campaign Flag 1x2m$$,$$piece$$,20,7),
 (v_event,$$FLAG_DESK$$,$$Desk Flag 15x25cm$$,$$piece$$,50,7),
 (v_event,$$BALLOON_BRANDED$$,$$Branded Balloon (pack 100)$$,$$pack$$,5,7),
 (v_event,$$BUNTING$$,$$Campaign Bunting 10m$$,$$roll$$,20,7),
 (v_event,$$ROPE_BARRIER$$,$$Crowd Control Barrier 2m$$,$$piece$$,10,14),
 (v_event,$$TABLE_CLOTH$$,$$Campaign Table Cloth 6ft$$,$$piece$$,20,7),
 (v_event,$$STEP_REPEAT$$,$$Step & Repeat Backdrop 3x2m$$,$$piece$$,2,14),
 (v_event,$$PROGRAMME_BOOKLET$$,$$Event Programme Booklet A5$$,$$piece$$,200,10),
 (v_event,$$LANYARD_BRANDED$$,$$Branded Lanyard$$,$$piece$$,200,10),
 (v_event,$$NAME_BADGE$$,$$Name Badge Holder$$,$$piece$$,200,7)
 ON CONFLICT (code) DO NOTHING;


  -- PROMOTIONAL_ITEMS (25 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_promo,$$MUG_BRANDED$$,$$Branded Ceramic Mug$$,$$piece$$,50,14),
 (v_promo,$$WATER_BOTTLE$$,$$Branded Water Bottle 500ml$$,$$piece$$,50,14),
 (v_promo,$$UMBRELLA_BRANDED$$,$$Branded Umbrella$$,$$piece$$,30,14),
 (v_promo,$$TOTE_BAG$$,$$Branded Tote Bag$$,$$piece$$,100,14),
 (v_promo,$$BACKPACK_BRANDED$$,$$Branded Backpack$$,$$piece$$,30,21),
 (v_promo,$$PEN_BRANDED$$,$$Branded Pen (box 50)$$,$$pack$$,10,10),
 (v_promo,$$NOTEBOOK_BRANDED$$,$$Branded A5 Notebook$$,$$piece$$,100,14),
 (v_promo,$$KEYRING_BRANDED$$,$$Branded Keyring$$,$$piece$$,200,10),
 (v_promo,$$BADGE_PIN$$,$$Campaign Pin Badge 5cm$$,$$piece$$,500,10),
 (v_promo,$$MAGNET_BRANDED$$,$$Fridge Magnet 9x6cm$$,$$piece$$,200,10),
 (v_promo,$$PHONE_CASE$$,$$Branded Phone Case$$,$$piece$$,50,14),
 (v_promo,$$POWER_BANK$$,$$Branded Power Bank 10000mAh$$,$$piece$$,20,21),
 (v_promo,$$USB_STICK$$,$$Branded USB Stick 8GB$$,$$piece$$,100,14),
 (v_promo,$$HAND_FAN$$,$$Branded Hand Fan$$,$$piece$$,500,10),
 (v_promo,$$SUNSCREEN_BRANDED$$,$$Branded Sunscreen Sachet$$,$$piece$$,500,14),
 (v_promo,$$HAND_SANITIZER$$,$$Branded Hand Sanitizer 100ml$$,$$piece$$,200,14),
 (v_promo,$$FACE_MASK_BRANDED$$,$$Branded Face Mask$$,$$piece$$,500,14),
 (v_promo,$$VOTER_GUIDE$$,$$Voter Information Guide$$,$$piece$$,1000,10),
 (v_promo,$$STRESS_BALL$$,$$Branded Stress Ball$$,$$piece$$,200,14),
 (v_promo,$$RULER_BRANDED$$,$$Branded Ruler 30cm$$,$$piece$$,200,10),
 (v_promo,$$CLIPBOARD$$,$$Branded Clipboard$$,$$piece$$,50,10),
 (v_promo,$$HAND_MIRROR$$,$$Branded Compact Mirror$$,$$piece$$,200,14),
 (v_promo,$$SUNGLASSES$$,$$Branded Sunglasses$$,$$piece$$,100,14),
 (v_promo,$$WAIST_BAG$$,$$Branded Waist Bag$$,$$piece$$,50,14),
 (v_promo,$$COOLER_BAG$$,$$Branded Cooler Bag$$,$$piece$$,50,21)
 ON CONFLICT (code) DO NOTHING;

  -- AUDIO_EQUIPMENT (15 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_audio,$$PA_SYSTEM_SMALL$$,$$PA System 500W (rental/day)$$,$$piece$$,1,3),
 (v_audio,$$PA_SYSTEM_MEDIUM$$,$$PA System 2000W (rental/day)$$,$$piece$$,1,3),
 (v_audio,$$PA_SYSTEM_LARGE$$,$$PA System 5000W (rental/day)$$,$$piece$$,1,3),
 (v_audio,$$SPEAKER_TOWER$$,$$Speaker Tower (pair, rental)$$,$$set$$,1,3),
 (v_audio,$$MICROPHONE_HANDHELD$$,$$Handheld Microphone$$,$$piece$$,2,3),
 (v_audio,$$MICROPHONE_LAPEL$$,$$Lapel Microphone$$,$$piece$$,2,3),
 (v_audio,$$MICROPHONE_PODIUM$$,$$Podium Microphone$$,$$piece$$,1,3),
 (v_audio,$$MEGAPHONE$$,$$Megaphone 30W$$,$$piece$$,5,7),
 (v_audio,$$MEGAPHONE_LARGE$$,$$Megaphone 50W Rechargeable$$,$$piece$$,5,7),
 (v_audio,$$MIXER_AUDIO$$,$$Audio Mixer 16-channel$$,$$piece$$,1,7),
 (v_audio,$$AMPLIFIER$$,$$Amplifier 1000W$$,$$piece$$,1,7),
 (v_audio,$$SUBWOOFER$$,$$Subwoofer Speaker$$,$$piece$$,2,7),
 (v_audio,$$MONITOR_SPEAKER$$,$$Stage Monitor Speaker$$,$$piece$$,2,7),
 (v_audio,$$RADIO_TRANSCEIVER$$,$$Two-Way Radio (rental)$$,$$piece$$,10,3),
 (v_audio,$$INTERCOM_SYSTEM$$,$$Event Intercom System$$,$$set$$,1,7)
 ON CONFLICT (code) DO NOTHING;


  -- STAGE_EQUIPMENT (15 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_stage,$$STAGE_SMALL$$,$$Stage Platform 4x3m$$,$$piece$$,1,14),
 (v_stage,$$STAGE_MEDIUM$$,$$Stage Platform 8x6m$$,$$piece$$,1,14),
 (v_stage,$$STAGE_LARGE$$,$$Stage Platform 12x8m$$,$$piece$$,1,21),
 (v_stage,$$GENERATOR_3KVA$$,$$Generator 3KVA (rental/day)$$,$$piece$$,1,3),
 (v_stage,$$GENERATOR_10KVA$$,$$Generator 10KVA (rental/day)$$,$$piece$$,1,3),
 (v_stage,$$GENERATOR_25KVA$$,$$Generator 25KVA (rental/day)$$,$$piece$$,1,3),
 (v_stage,$$LIGHTING_LED$$,$$LED Stage Lighting Set$$,$$set$$,1,7),
 (v_stage,$$LIGHTING_PAR$$,$$PAR Can Lights (set 6)$$,$$set$$,1,7),
 (v_stage,$$SPOTLIGHT$$,$$Follow Spotlight$$,$$piece$$,2,7),
 (v_stage,$$PROJECTOR_HD$$,$$HD Projector 5000 lumens$$,$$piece$$,1,7),
 (v_stage,$$SCREEN_PROJECTION$$,$$Projection Screen 3x2m$$,$$piece$$,1,7),
 (v_stage,$$LED_SCREEN_PANEL$$,$$LED Display Panel P4 (per sqm)$$,$$piece$$,4,14),
 (v_stage,$$TRUSS_TOWER$$,$$Truss Tower 4m$$,$$piece$$,4,14),
 (v_stage,$$CROWD_BARRIER$$,$$Crowd Control Barrier Steel 2m$$,$$piece$$,20,14),
 (v_stage,$$CABLE_EXTENSION$$,$$Power Extension Cable 50m$$,$$piece$$,10,7)
 ON CONFLICT (code) DO NOTHING;


  -- STATIONERY (15 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_stat,$$BALLOT_FORM$$,$$Agent Attendance Form$$,$$piece$$,500,7),
 (v_stat,$$VOTER_REG_FORM$$,$$Voter Registration Assistance Form$$,$$piece$$,1000,7),
 (v_stat,$$TALLY_SHEET$$,$$Tally Sheet A4$$,$$piece$$,500,5),
 (v_stat,$$REPORT_PAD$$,$$Agent Daily Report Pad$$,$$piece$$,100,7),
 (v_stat,$$REGISTER_VOLUNTEER$$,$$Volunteer Register Book$$,$$piece$$,50,7),
 (v_stat,$$EXPENSE_FORM$$,$$Expense Claim Form$$,$$piece$$,500,5),
 (v_stat,$$ATTENDANCE_SHEET$$,$$Event Attendance Sheet$$,$$piece$$,500,5),
 (v_stat,$$PETITION_FORM$$,$$Candidate Nomination Petition$$,$$piece$$,200,7),
 (v_stat,$$CONSENT_FORM$$,$$SMS Consent Form$$,$$piece$$,1000,5),
 (v_stat,$$POSTER_FRAME_A4$$,$$A4 Poster Frame Plastic$$,$$piece$$,50,10),
 (v_stat,$$POSTER_FRAME_A3$$,$$A3 Poster Frame Plastic$$,$$piece$$,30,10),
 (v_stat,$$CLIPBOARD_A4$$,$$A4 Clipboard Hard Back$$,$$piece$$,100,7),
 (v_stat,$$STAMP_BRANDED$$,$$Branded Rubber Stamp$$,$$piece$$,10,14),
 (v_stat,$$STAMP_PAD$$,$$Stamp Ink Pad$$,$$piece$$,10,7),
 (v_stat,$$DOCUMENT_FOLDER$$,$$Branded Document Folder A4$$,$$piece$$,200,10)
 ON CONFLICT (code) DO NOTHING;
  -- SECURITY_ITEMS (10 types)
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_security,$$VEST_SECURITY$$,$$Security Vest Branded$$,$$piece$$,20,14),
 (v_security,$$HELMET_BRANDED$$,$$Safety Helmet Branded$$,$$piece$$,20,14),
 (v_security,$$TORCH_LED$$,$$LED Torch$$,$$piece$$,20,7),
 (v_security,$$WHISTLE$$,$$Official Whistle$$,$$piece$$,50,7),
 (v_security,$$FIRST_AID_KIT$$,$$First Aid Kit$$,$$piece$$,5,7),
 (v_security,$$FIRE_EXTINGUISHER$$,$$Fire Extinguisher 2kg$$,$$piece$$,5,7),
 (v_security,$$ROPE_SAFETY$$,$$Safety Rope 50m$$,$$roll$$,5,7),
 (v_security,$$RAIN_COAT$$,$$Rain Coat Branded$$,$$piece$$,20,14),
 (v_security,$$REFLECTIVE_JACKET$$,$$Reflective Safety Jacket$$,$$piece$$,30,10),
 (v_security,$$ID_BADGE_HOLDER$$,$$ID Badge Holder with Clip$$,$$piece$$,100,7)
 ON CONFLICT (code) DO NOTHING;

  -- COMMUNICATION_TOOLS
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_comms,$$SMS_BULK_UNIT$$,$$Bulk SMS 1000 messages$$,$$pack$$,1,1),
 (v_comms,$$SIMCARD_CAMPAIGN$$,$$Campaign SIM Card$$,$$piece$$,10,3),
 (v_comms,$$MOBILE_DATA_BUNDLE$$,$$Mobile Data Bundle 10GB$$,$$piece$$,10,1),
 (v_comms,$$HOTSPOT_DEVICE$$,$$Mobile WiFi Hotspot$$,$$piece$$,5,7),
 (v_comms,$$WHATSAPP_BUSINESS$$,$$WhatsApp Business API Setup$$,$$piece$$,1,7),
 (v_comms,$$TOLL_FREE_LINE$$,$$Toll-Free Line monthly$$,$$piece$$,1,14),
 (v_comms,$$USSD_SHORTCODE$$,$$USSD Shortcode Setup$$,$$piece$$,1,14),
 (v_comms,$$IVR_CAMPAIGN$$,$$IVR Campaign Setup$$,$$piece$$,1,14),
 (v_comms,$$SHORTCODE_SMS$$,$$SMS Shortcode (monthly)$$,$$piece$$,1,7),
 (v_comms,$$SOCIAL_MEDIA_MGMT$$,$$Social Media Management monthly$$,$$piece$$,1,7)
 ON CONFLICT (code) DO NOTHING;

  -- TRANSPORT_MATERIALS
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_transport,$$FUEL_PETROL$$,$$Fuel Petrol litres$$,$$piece$$,50,1),
 (v_transport,$$FUEL_DIESEL$$,$$Fuel Diesel litres$$,$$piece$$,50,1),
 (v_transport,$$BUS_HIRE$$,$$Bus Hire 32-seater per day$$,$$piece$$,1,3),
 (v_transport,$$MINIBUS_HIRE$$,$$Minibus Hire 14-seater per day$$,$$piece$$,1,3),
 (v_transport,$$MOTORBIKE_HIRE$$,$$Motorbike Hire per day$$,$$piece$$,2,3),
 (v_transport,$$BICYCLE_BRANDED$$,$$Branded Bicycle$$,$$piece$$,10,14),
 (v_transport,$$GPS_TRACKER$$,$$Vehicle GPS Tracker monthly$$,$$piece$$,5,7),
 (v_transport,$$CAMPAIGN_BUS_WRAP$$,$$Campaign Bus Full Wrap$$,$$piece$$,1,14),
 (v_transport,$$JERRY_CAN$$,$$Fuel Jerry Can 20L$$,$$piece$$,10,7),
 (v_transport,$$PARKING_CONES$$,$$Traffic Cones set 10$$,$$set$$,2,7)
 ON CONFLICT (code) DO NOTHING;

  -- MEDIA_PRODUCTION
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_media,$$PHOTO_SHOOT$$,$$Professional Photo Session$$,$$piece$$,1,7),
 (v_media,$$VIDEO_CAMPAIGN$$,$$Campaign Video Production$$,$$piece$$,1,14),
 (v_media,$$DRONE_FOOTAGE$$,$$Drone Aerial Footage$$,$$piece$$,1,7),
 (v_media,$$JINGLE_RECORDING$$,$$Campaign Jingle Recording$$,$$piece$$,1,14),
 (v_media,$$DOCUMENTARY$$,$$Short Documentary 5min$$,$$piece$$,1,21),
 (v_media,$$LIVE_STREAM_SETUP$$,$$Live Streaming Setup$$,$$piece$$,1,3),
 (v_media,$$GRAPHIC_DESIGN_PACK$$,$$Graphic Design Package$$,$$piece$$,1,7),
 (v_media,$$ANIMATION_LOGO$$,$$Logo Animation$$,$$piece$$,1,10),
 (v_media,$$INFOGRAPHIC$$,$$Campaign Infographic Design$$,$$piece$$,1,5),
 (v_media,$$PODCAST_EPISODE$$,$$Podcast Episode Production$$,$$piece$$,1,7),
 (v_media,$$PRESS_KIT$$,$$Press Kit Design$$,$$piece$$,1,7),
 (v_media,$$MANIFESTO_DESIGN$$,$$Manifesto Document Design$$,$$piece$$,1,10),
 (v_media,$$WEBSITE_BANNER$$,$$Campaign Website Design$$,$$piece$$,1,14),
 (v_media,$$NEWSLETTER_DESIGN$$,$$Email Newsletter Design$$,$$piece$$,1,5),
 (v_media,$$SOCIAL_CONTENT_PACK$$,$$30-day Social Content Pack$$,$$pack$$,1,7)
 ON CONFLICT (code) DO NOTHING;

  -- VEHICLE_BRANDING
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_vehicle,$$CAR_FULL_WRAP$$,$$Car Full Wrap$$,$$piece$$,1,14),
 (v_vehicle,$$CAR_HALF_WRAP$$,$$Car Half Wrap$$,$$piece$$,1,10),
 (v_vehicle,$$CAR_BACK_GLASS$$,$$Car Rear Window Decal$$,$$piece$$,1,7),
 (v_vehicle,$$CAR_DOOR_MAGNET$$,$$Car Door Magnets pair$$,$$set$$,5,7),
 (v_vehicle,$$CAR_ROOF_SIGN$$,$$Car Roof Sign$$,$$piece$$,5,10),
 (v_vehicle,$$BUS_SIDE_BANNER$$,$$Bus Side Banner$$,$$piece$$,1,10),
 (v_vehicle,$$TRUCK_FULL_WRAP$$,$$Truck Full Wrap$$,$$piece$$,1,21),
 (v_vehicle,$$MOTORBIKE_DECAL$$,$$Motorbike Decal Set$$,$$set$$,5,7),
 (v_vehicle,$$MATATU_BRANDING$$,$$Matatu Full Branding$$,$$piece$$,1,14),
 (v_vehicle,$$CAMPAIGN_FLOAT$$,$$Campaign Float Decoration$$,$$piece$$,1,14)
 ON CONFLICT (code) DO NOTHING;

  -- FOOD_BEVERAGES
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_food,$$WATER_BOTTLE_EVENT$$,$$Branded Water Bottle Event$$,$$piece$$,500,10),
 (v_food,$$JUICE_PACK$$,$$Juice Pack Branded 200ml$$,$$piece$$,500,10),
 (v_food,$$BRANDED_CAKE$$,$$Campaign Branded Cake serves 50$$,$$piece$$,2,7),
 (v_food,$$SWEET_BRANDED$$,$$Branded Sweets box 200$$,$$pack$$,10,14),
 (v_food,$$CATERING_PACKAGE$$,$$Catering Package per 100 pax$$,$$piece$$,1,7),
 (v_food,$$TEA_COFFEE$$,$$Tea and Coffee Service per 50$$,$$piece$$,1,2),
 (v_food,$$SOFT_DRINK_CRATE$$,$$Soft Drinks Crate 24$$,$$piece$$,10,2),
 (v_food,$$MINERAL_WATER_CRATE$$,$$Mineral Water Crate 24x500ml$$,$$piece$$,10,2),
 (v_food,$$SNACK_PACK$$,$$Event Snack Pack per 100$$,$$piece$$,2,3),
 (v_food,$$BREAD_SUPPLY$$,$$Event Bread Supply per 100$$,$$piece$$,100,2)
 ON CONFLICT (code) DO NOTHING;

  -- SOCIAL_MEDIA
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_social,$$SOCIAL_MEDIA_PACK$$,$$Complete Social Media Brand Pack$$,$$piece$$,1,7),
 (v_social,$$HASHTAG_CAMPAIGN$$,$$Campaign Hashtag Strategy$$,$$piece$$,1,5),
 (v_social,$$INFLUENCER_BRIEF$$,$$Influencer Campaign Brief$$,$$piece$$,1,5),
 (v_social,$$FACEBOOK_ADS$$,$$Facebook Ad Campaign Setup$$,$$piece$$,1,5),
 (v_social,$$INSTAGRAM_ADS$$,$$Instagram Ad Campaign Setup$$,$$piece$$,1,5),
 (v_social,$$TWITTER_ADS$$,$$Twitter Ad Campaign Setup$$,$$piece$$,1,5),
 (v_social,$$TIKTOK_VIDEO$$,$$TikTok Campaign Video 15sec$$,$$piece$$,1,7),
 (v_social,$$YOUTUBE_AD$$,$$YouTube Pre-Roll Ad$$,$$piece$$,1,7),
 (v_social,$$GOOGLE_DISPLAY$$,$$Google Display Ad Set$$,$$piece$$,1,5),
 (v_social,$$CONTENT_CALENDAR$$,$$30-Day Content Calendar$$,$$piece$$,1,5)
 ON CONFLICT (code) DO NOTHING;

  -- MISCELLANEOUS
  INSERT INTO campaign_material_types (category_id,code,name,unit,min_order_quantity,lead_time_days) VALUES
 (v_misc,$$GENERATOR_HIRE$$,$$Generator Hire per Day$$,$$piece$$,1,2),
 (v_misc,$$WATER_DISPENSER$$,$$Water Dispenser$$,$$piece$$,2,7),
 (v_misc,$$WATER_CAN$$,$$Branded Water Can 20L$$,$$piece$$,20,7),
 (v_misc,$$RUBBISH_BAGS$$,$$Rubbish Bags pack 50$$,$$pack$$,10,3),
 (v_misc,$$CLEANING_KIT$$,$$Event Cleaning Kit$$,$$set$$,2,7),
 (v_misc,$$TOILET_HIRE$$,$$Portable Toilet Hire per day$$,$$piece$$,2,3),
 (v_misc,$$CABLE_TIE_PACK$$,$$Cable Ties pack 100$$,$$pack$$,10,3),
 (v_misc,$$VELCRO_TAPE$$,$$Velcro Tape Roll$$,$$roll$$,10,3),
 (v_misc,$$CONFETTI$$,$$Celebration Confetti 1kg$$,$$piece$$,10,7),
 (v_misc,$$STREAMERS$$,$$Paper Streamers pack 50$$,$$pack$$,10,3),
 (v_misc,$$CAMPAIGN_BOX$$,$$Campaign Materials Box$$,$$piece$$,50,7),
 (v_misc,$$SPRAY_PAINT$$,$$Spray Paint Branded Colour$$,$$piece$$,20,7),
 (v_misc,$$CHALK_PAVEMENT$$,$$Pavement Chalk pack 10$$,$$pack$$,20,3),
 (v_misc,$$NAME_PLATE$$,$$Branded Name Plate$$,$$piece$$,20,10),
 (v_misc,$$SANDWICH_BOARD$$,$$Sandwich Board A-Frame$$,$$piece$$,10,14)
 ON CONFLICT (code) DO NOTHING;

END;
$body$;

COMMIT;

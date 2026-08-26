#!/usr/bin/env python3
"""
VoteCapsule - Sync Cognito custom:roles from DB (source of truth)
"""
import boto3, json

client = boto3.client('cognito-idp', region_name='us-east-1')
USER_POOL_ID = 'us-east-1_i3N2tg34A'

# Map email -> [DB role, extra attrs]
USERS = [
  # Platform
  ('superadmin@votecapsule.co.ke',  ['PLATFORM_SUPER_ADMIN'],    {'custom:platformAdmin': 'true'}),
  ('admin@votecapsule.co.ke',        ['TENANT_ADMIN'],             {}),
  # Candidates
  ('candidate@votecapsule.co.ke',    ['CANDIDATE'],               {}),
  ('yna@votecapsule.co.ke',           ['CANDIDATE'],               {}),
  # Campaign
  ('ccm@votecapsule.co.ke',          ['CAMPAIGN_MANAGER'],        {}),
  ('mccp@votecapsule.co.ke',          ['CAMPAIGN_MANAGER'],        {}),
  ('ppd@votecapsule.co.ke',           ['PARTY_CAMPAIGN_DIRECTOR'], {}),
  # Authority (DB role is ELECTION_COMMISSIONER)
  ('authority@votecapsule.co.ke',     ['ELECTION_COMMISSIONER'],   {}),
  ('dc@votecapsule.co.ke',            ['ELECTION_COMMISSIONER'],   {}),
  # Observer (DB role is OBSERVER_ADMIN)
  ('observer@votecapsule.co.ke',      ['OBSERVER_ADMIN'],          {}),
  # Field
  ('agent@votecapsule.co.ke',         ['CAPSULE_AGENT'],           {}),
  ('validator@votecapsule.co.ke',     ['VALIDATOR'],               {}),
  # Party admins
  ('mwaurasebastian@gmail.com',        ['PARTY_ADMIN'],             {}),
  ('azimio@votecapsule.co.ke',        ['PARTY_ADMIN'],             {}),
  ('kanu@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('ldp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('ptp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('tep@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('epp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('pdu@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('tnd@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('jfp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('pm@votecapsule.co.ke',            ['PARTY_ADMIN'],             {}),
  ('alp-k@votecapsule.co.ke',         ['PARTY_ADMIN'],             {}),
  ('dap-k@votecapsule.co.ke',         ['PARTY_ADMIN'],             {}),
  ('ksc@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('nvp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('narc@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('kup@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('nap-k@votecapsule.co.ke',         ['PARTY_ADMIN'],             {}),
  ('afc@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('mp@votecapsule.co.ke',            ['PARTY_ADMIN'],             {}),
  ('tdu@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('gtap@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('ccu@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('kazi@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('uup@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('spk@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('plp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('dcp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('udp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('pick@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('dep@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('up@votecapsule.co.ke',            ['PARTY_ADMIN'],             {}),
  ('knc@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('nra@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('pgp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('pnu@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('kmm@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('fpk@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('nlp@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
  ('j-mapk@votecapsule.co.ke',        ['PARTY_ADMIN'],             {}),
  ('gddp@votecapsule.co.ke',          ['PARTY_ADMIN'],             {}),
  ('ford-kenya@votecapsule.co.ke',    ['PARTY_ADMIN'],             {}),
  ('jibebe@votecapsule.co.ke',        ['PARTY_ADMIN'],             {}),
  ('safina@votecapsule.co.ke',        ['PARTY_ADMIN'],             {}),
  ('jp@votecapsule.co.ke',            ['PARTY_ADMIN'],             {}),
  ('kug@votecapsule.co.ke',           ['PARTY_ADMIN'],             {}),
]

ok = skip = fail = 0
for email, roles, extra in USERS:
    attrs = [{'Name': 'custom:roles', 'Value': json.dumps(roles)}]
    for k, v in extra.items():
        attrs.append({'Name': k, 'Value': v})
    try:
        client.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=attrs
        )
        print(f'  OK   {email} -> {roles}')
        ok += 1
    except client.exceptions.UserNotFoundException:
        print(f'  SKIP {email} -> not in Cognito')
        skip += 1
    except Exception as e:
        print(f'  FAIL {email}: {e}')
        fail += 1

print(f'\nDone: {ok} synced, {skip} skipped, {fail} failed')

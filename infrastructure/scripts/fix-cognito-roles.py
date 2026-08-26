#!/usr/bin/env python3
"""
VoteCapsule™ — Fix Cognito custom:roles for all portal demo users
Run: python fix-cognito-roles.py
"""

import boto3
import json

client = boto3.client('cognito-idp', region_name='us-east-1')
USER_POOL_ID = 'us-east-1_i3N2tg34A'

# Portal users with their correct roles
# Format: (email, roles_list, extra_attrs_dict)
USERS = [
    # ── Platform Admins ────────────────────────────────────────────────────
    ('superadmin@votecapsule.co.ke',   ['PLATFORM_SUPER_ADMIN'],        {'custom:platformAdmin': 'true'}),
    ('admin@votecapsule.co.ke',        ['TENANT_ADMIN'],                 {}),
    ('mwaurasebastian@gmail.com',      ['PARTY_ADMIN'],                  {}),

    # ── Candidate Portal ───────────────────────────────────────────────────
    ('candidate@votecapsule.co.ke',    ['CANDIDATE'],                    {}),
    ('yna@votecapsule.co.ke',          ['CANDIDATE'],                    {}),

    # ── Campaign Team (demo slots) ─────────────────────────────────────────
    # These represent pre-seeded campaign team role accounts
    ('ccm@votecapsule.co.ke',          ['CAMPAIGN_MANAGER'],             {}),
    ('mccp@votecapsule.co.ke',         ['CAMPAIGN_MANAGER'],             {}),
    ('ppd@votecapsule.co.ke',          ['PARTY_CAMPAIGN_DIRECTOR'],      {}),

    # ── Authority Portal ───────────────────────────────────────────────────
    ('authority@votecapsule.co.ke',    ['ELECTION_AUTHORITY_ADMIN'],     {}),
    ('dc@votecapsule.co.ke',           ['ELECTION_AUTHORITY_ADMIN'],     {}),

    # ── Observer Portal ────────────────────────────────────────────────────
    ('observer@votecapsule.co.ke',     ['OBSERVER'],                     {}),

    # ── Party Portals ──────────────────────────────────────────────────────
    # Azimio
    ('azimio@votecapsule.co.ke',       ['PARTY_ADMIN'],                  {}),
    # UDA
    ('yna@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),  # Also candidate
    # Other parties
    ('kanu@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('ldp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('ptp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('tep@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('epp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('pdu@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('tnd@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('jfp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('pm@votecapsule.co.ke',           ['PARTY_ADMIN'],                  {}),
    ('alp-k@votecapsule.co.ke',        ['PARTY_ADMIN'],                  {}),
    ('dap-k@votecapsule.co.ke',        ['PARTY_ADMIN'],                  {}),
    ('ksc@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('nvp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('narc@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('kup@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('nap-k@votecapsule.co.ke',        ['PARTY_ADMIN'],                  {}),
    ('afc@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('mp@votecapsule.co.ke',           ['PARTY_ADMIN'],                  {}),
    ('tdu@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('gtap@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('ccu@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('kazi@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('uup@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('spk@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('plp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('dcp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('udp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('pick@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('dep@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('up@votecapsule.co.ke',           ['PARTY_ADMIN'],                  {}),
    ('knc@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('nra@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('pgp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('pnu@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('kmm@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('fpk@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('nlp@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),
    ('j-mapk@votecapsule.co.ke',       ['PARTY_ADMIN'],                  {}),
    ('gddp@votecapsule.co.ke',         ['PARTY_ADMIN'],                  {}),
    ('ford-kenya@votecapsule.co.ke',   ['PARTY_ADMIN'],                  {}),
    ('jibebe@votecapsule.co.ke',       ['PARTY_ADMIN'],                  {}),
    ('safina@votecapsule.co.ke',       ['PARTY_ADMIN'],                  {}),
    ('jp@votecapsule.co.ke',           ['PARTY_ADMIN'],                  {}),
    ('kug@votecapsule.co.ke',          ['PARTY_ADMIN'],                  {}),

    # ── Agents / Validators ────────────────────────────────────────────────
    ('agent@votecapsule.co.ke',        ['CAPSULE_AGENT'],                {}),
    ('validator@votecapsule.co.ke',    ['VALIDATOR'],                    {}),
]

success = 0
failed  = 0

for email, roles, extra in USERS:
    attrs = [{'Name': 'custom:roles', 'Value': json.dumps(roles)}]
    for k, v in extra.items():
        attrs.append({'Name': k, 'Value': v})
    try:
        client.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=attrs,
        )
        print(f'  OK   {email:50s} -> {roles}')
        success += 1
    except client.exceptions.UserNotFoundException:
        print(f'  SKIP {email:50s} -> USER NOT FOUND')
        failed += 1
    except Exception as e:
        print(f'  ERR  {email:50s} -> ERROR: {e}')
        failed += 1

print(f'\nDone: {success} updated, {failed} failed/skipped')

#!/usr/bin/env python3
"""
VoteCapsule - Reset ALL Cognito user passwords to permanent
Run: python reset-all-passwords.py
"""
import boto3, json, sys

client = boto3.client('cognito-idp', region_name='us-east-1')
USER_POOL_ID = 'us-east-1_i3N2tg34A'
PASSWORD = 'VoteCapsule@2026!'

# Get ALL users in the pool
def get_all_users():
    users = []
    kwargs = {'UserPoolId': USER_POOL_ID, 'Limit': 60}
    while True:
        resp = client.list_users(**kwargs)
        users.extend(resp['Users'])
        token = resp.get('PaginationToken')
        if not token:
            break
        kwargs['PaginationToken'] = token
    return users

users = get_all_users()
print(f'Found {len(users)} users in pool')
print(f'Setting password: {PASSWORD}')
print()

ok = 0
skip = 0
fail = 0

for u in users:
    username = u['Username']
    attrs = {a['Name']: a['Value'] for a in u.get('UserAttributes', [])}
    email = attrs.get('email', username)
    status = u.get('UserStatus', '?')

    # Skip test/provision users
    if 'test-provision' in email:
        print(f'  SKIP {email} (test user)')
        skip += 1
        continue

    try:
        client.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=username,
            Password=PASSWORD,
            Permanent=True
        )
        print(f'  OK   {email} (was: {status})')
        ok += 1
    except Exception as e:
        print(f'  FAIL {email}: {e}')
        fail += 1

print()
print(f'Done: {ok} set, {skip} skipped, {fail} failed')

# Verify login for 3 key accounts
print()
print('Verifying logins...')
test_accounts = [
    'candidate@votecapsule.co.ke',
    'superadmin@votecapsule.co.ke',
    'admin@votecapsule.co.ke',
    'ccm@votecapsule.co.ke',
    'authority@votecapsule.co.ke',
    'observer@votecapsule.co.ke',
    'agent@votecapsule.co.ke',
]

cog_client_id = '3hi86ci06546ki038k6msmik0s'
for email in test_accounts:
    try:
        resp = client.initiate_auth(
            AuthFlow='USER_PASSWORD_AUTH',
            ClientId=cog_client_id,
            AuthParameters={'USERNAME': email, 'PASSWORD': PASSWORD}
        )
        ar = resp.get('AuthenticationResult', {})
        has_token = bool(ar.get('IdToken') or ar.get('AccessToken'))
        challenge = resp.get('ChallengeName', '')
        if has_token:
            print(f'  LOGIN OK  {email}')
        elif challenge:
            print(f'  CHALLENGE {email}: {challenge}')
        else:
            print(f'  NO TOKEN  {email}')
    except Exception as e:
        print(f'  LOGIN FAIL {email}: {e}')

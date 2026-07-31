# @vote-capsule/database

Shared database utilities for the Vote Capsule™ platform.

## Contents

- `BaseEntity` / `SoftDeletableEntity` — base classes for all TypeORM/raw entities
- `createDatabaseConfig()` — builds DB config from environment variables
- `createPool()` — creates a pg.Pool instance
- `runMigrations()` — runs numbered SQL migration files
- `runSeeds()` — seeds system roles and permissions
- `migrations/` — numbered SQL migration files (001–010+)

## Migration Files

| # | File | Creates |
|---|------|---------|
| 001 | `create_users.sql` | `users` |
| 002 | `create_user_profiles.sql` | `user_profiles` |
| 003 | `create_user_devices.sql` | `user_devices` |
| 004 | `create_roles.sql` | `roles`, `permissions`, `role_permissions` |
| 005 | `create_user_roles.sql` | `user_roles` |
| 006 | `create_invitations.sql` | `invitations` |
| 007 | `create_authentication_logs.sql` | `authentication_logs` |
| 008 | `create_tenants.sql` | `tenants` |
| 009 | `create_tenant_members.sql` | `tenant_members` |
| 010 | `create_subscriptions.sql` | `subscriptions`, `tenant_settings` |

## Running Migrations

```bash
# From the database package
pnpm db:migrate

# From the monorepo root
pnpm --filter @vote-capsule/database db:migrate
```

## Environment Variables

```env
DB_HOST=your-aurora-cluster-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASSWORD=<from AWS Secrets Manager>
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10
```

> **Never commit credentials.** All secrets must be stored in AWS Secrets Manager.

## NEC Migrations

Migrations prefixed `nec_*` are owned by the **NEC Agent workstream**.
Do not create or modify `nec_*` migration files.

## Owned By

Sonie (Platform Foundation Workstream)

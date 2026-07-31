# Vote Capsule™ Identity Service

**Service ID:** `@vote-capsule/identity-service`  
**Port:** `3001`  
**Domain:** Foundation

## Purpose

The Identity Service is the platform's central authentication and authorization system. It manages every authenticated user across all tenant types — election authorities, political parties, observers, media, and platform administrators.

## Features

- **Authentication** — Amazon Cognito integration with JWT validation and MFA support
- **User Management** — Full CRUD with profile management and soft-delete
- **Role-Based Access Control** — 16 system roles, custom roles, granular permissions
- **Device Trust** — Mobile device registration and trust management for field agents
- **Invitations** — Controlled user onboarding via secure invitation tokens

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Authenticate (returns tokens or MFA challenge) |
| POST | `/api/v1/auth/logout` | Sign out |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code |
| POST | `/api/v1/auth/password/reset-request` | Request password reset |
| POST | `/api/v1/auth/password/reset` | Confirm password reset |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List all users (paginated) |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/me` | Get current user |
| GET | `/api/v1/users/:id` | Get user by ID |
| PATCH | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Soft-delete user |
| PATCH | `/api/v1/users/me/profile` | Update profile |
| GET | `/api/v1/users/me/devices` | List devices |
| POST | `/api/v1/users/me/devices` | Register device |
| DELETE | `/api/v1/users/me/devices/:id` | Remove device |

### Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/roles` | List all roles |
| POST | `/api/v1/roles` | Create custom role |
| GET | `/api/v1/roles/:id` | Get role with permissions |
| PATCH | `/api/v1/roles/:id` | Update role |
| DELETE | `/api/v1/roles/:id` | Delete custom role |
| POST | `/api/v1/roles/:id/permissions` | Assign permissions |

### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/invitations` | Create invitation |
| GET | `/api/v1/invitations` | List invitations |
| GET | `/api/v1/invitations/:token` | Get by token |
| POST | `/api/v1/invitations/:token/accept` | Accept invitation |
| DELETE | `/api/v1/invitations/:id` | Revoke invitation |

## API Documentation

When running: `http://localhost:3001/api/docs`

## Environment Variables

```env
PORT=3001
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASSWORD=<from Secrets Manager>
DB_SSL=true
JWT_SECRET=<from Secrets Manager>
JWT_EXPIRES_IN=1h
COGNITO_CLIENT_ID=your-cognito-app-client-id
AWS_REGION=us-east-1
ALLOWED_ORIGINS=http://localhost:3000,https://admin.votecapsule.co.ke
```

## Running

```bash
pnpm dev         # Development with hot reload
pnpm build       # Production build
pnpm start       # Start production build
pnpm test        # Run tests
pnpm typecheck   # TypeScript check
```

## Owned By

Sonie (Platform Foundation Workstream)

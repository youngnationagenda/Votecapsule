# Vote Capsule™ Tenant Service

**Service ID:** `@vote-capsule/tenant-service`  
**Port:** `3002`  
**Domain:** Foundation

## Purpose

Manages organizations (tenants), their members, subscriptions, and settings.

## API Endpoints

### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/tenants` | List all tenants |
| GET | `/api/v1/tenants/stats` | Tenant count by type |
| GET | `/api/v1/tenants/:id` | Get tenant |
| PATCH | `/api/v1/tenants/:id` | Update tenant |
| DELETE | `/api/v1/tenants/:id` | Soft-delete tenant |
| GET | `/api/v1/tenants/:id/settings` | Get settings |
| PATCH | `/api/v1/tenants/:id/settings` | Update settings |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/:id/members` | List members |
| POST | `/api/v1/tenants/:id/members` | Add member |
| DELETE | `/api/v1/tenants/:id/members/:userId` | Remove member |
| PATCH | `/api/v1/tenants/:id/members/:userId/role` | Update role |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/:id/subscription` | Get subscription |
| POST | `/api/v1/tenants/:id/subscription` | Create subscription |
| PATCH | `/api/v1/tenants/:id/subscription` | Update subscription |

## Owned By

Sonie (Platform Foundation Workstream)

# Geography Service

**Status:** ✅ WIRED — fully implemented and wired into monorepo
**Original Source:** CTO Agent — `D:\Votecapsule\NEC database\geography-service\`
**Wired by:** Sonie (Platform Foundation Workstream)
**Port:** 3004

## What is here
- 6 TypeORM entities: County, Constituency, Ward, RegistrationCentre, PollingStation, ElectionVersion
- GeographyService with 18 endpoints including the critical `validateStation()` method
- GeographyController wired with full OpenAPI docs
- AppModule with TypeORM configuration
- NestJS bootstrap on port 3004
- 128 NEC migration SQL files in `packages/database/migrations/nec/`

## Do NOT modify
The original source files from the CTO Agent must not be edited directly.
All changes must go through the monorepo version here.

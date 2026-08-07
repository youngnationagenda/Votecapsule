## Summary
<!-- One sentence: what does this PR do and why? -->


## Type of change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] ♻️ Refactor (no behaviour change)
- [ ] 🗃️ Database migration
- [ ] 🔧 CI/CD / infrastructure
- [ ] 📝 Docs / config only

## Services / apps affected
<!-- Check every service or app this PR touches -->
- [ ] identity · [ ] evidence · [ ] trust · [ ] geography · [ ] candidate
- [ ] election · [ ] notification · [ ] reporting · [ ] workflow · [ ] ai
- [ ] tenant · [ ] audit · [ ] billing
- [ ] admin-web · [ ] authority-web · [ ] party-web · [ ] candidate-web
- [ ] observer-web · [ ] public-web · [ ] agent-mobile · [ ] validator-mobile

## Pre-merge checklist
- [ ] `pnpm install --frozen-lockfile` — no lockfile changes
- [ ] `pnpm tsc --noEmit` — zero TypeScript errors
- [ ] `pnpm lint` — zero lint errors
- [ ] Unit tests pass for every affected service (`pnpm test`)
- [ ] No `.env` files, secrets, or credentials committed
- [ ] `firebase-service-account.json` not committed
- [ ] Database migrations are **additive only** — no edits to existing migration files

## Critical rules verified
- [ ] SHA-256 formula untouched: `SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)`
- [ ] No "blockchain" language in UI or docs — only "Integrity Verified"
- [ ] NEC geography data not duplicated — single source of truth maintained
- [ ] DB credentials remain in AWS Secrets Manager only

## Testing done
<!-- Describe what you tested and how -->


## Screenshots / logs (if UI or service change)
<!-- Paste relevant output or attach screenshots -->


## Migrations included?
- [ ] No migrations in this PR
- [ ] Yes — migration number(s): `___` · Tested on a clean DB? [ ] Yes [ ] No

## Reviewer notes
<!-- Anything specific you want the reviewer to focus on? -->

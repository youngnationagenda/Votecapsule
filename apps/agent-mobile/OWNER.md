# Capsule Agent Mobile App

**App:** `agent-mobile`
**Stack:** React Native 0.74.2 + TypeScript + Expo SDK 51
**Primary users:** Field agents at Kenyan polling stations
**Status:** ✅ Full scaffold — production-ready structure

---

## Architecture

- **Offline-first** — All captures written to AsyncStorage immediately.
  Sync engine flushes the queue when connectivity is available (30 s interval + on network restore).
- **Cryptographic integrity** — SHA-256 composite hash computed **on-device at capture time**.
  Formula is locked: `SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)`.
  Server re-computes and rejects any capsule with a non-matching hash.
- **Auth** — AWS Cognito USER_PASSWORD_AUTH (ROPC) with automatic token refresh on 401.
- **State management** — Zustand stores for auth (`authStore`) and capture session (`captureStore`).
- **Navigation** — React Navigation v6 native stack, auth-gated in `AppNavigator`.

---

## File Structure

```
src/
├── assets/                    # Generated app icons + splash (do not edit manually)
├── components/                # Shared UI components
│   ├── ActionButton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBanner.tsx
│   ├── InfoRow.tsx
│   ├── NetworkBadge.tsx
│   ├── ScreenContainer.tsx
│   ├── Section.tsx
│   ├── SectionCard.tsx
│   ├── StatCard.tsx
│   ├── StatusBadge.tsx
│   └── index.ts
├── hooks/
│   ├── useGps.ts              # expo-location GPS hook
│   └── useNetworkSync.ts      # NetInfo connectivity + auto-sync trigger
├── navigation/
│   └── AppNavigator.tsx       # Auth-gated stack navigator
├── screens/
│   ├── LoginScreen.tsx        # Cognito login
│   ├── HomeScreen.tsx         # Dashboard
│   ├── CaptureScreen.tsx      # Camera + Form 35A capture
│   ├── ReviewScreen.tsx       # Post-capture review + upload status
│   ├── QueueScreen.tsx        # Offline sync queue management
│   ├── StationSearchScreen.tsx # Barcode scan + name search
│   └── SettingsScreen.tsx     # Account info + security details
├── services/
│   ├── api.ts                 # Axios client with auth interceptors
│   └── syncEngine.ts          # Background upload queue + retry logic
├── store/
│   ├── authStore.ts           # Zustand auth state
│   └── captureStore.ts        # Zustand capture session state
├── types/
│   └── index.ts               # All shared TypeScript types
└── utils/
    ├── crypto.ts              # SHA-256 hashing (LOCKED formula — do not modify)
    └── storage.ts             # AsyncStorage typed wrappers
```

---

## Build Commands

```bash
npm start           # Start Expo dev server
npm run android     # Start on Android device/emulator
npm run typecheck   # TypeScript check (must pass clean)
npm run build:dev   # EAS debug APK (internal testing)
npm run build:preview   # EAS release APK (stakeholder UAT)
npm run build:prod  # EAS AAB for Google Play Store
```

---

## Critical Requirements

- **OFFLINE FIRST** — must work without internet at all times
- **SHA-256 on device** — `crypto.ts` formula is locked — DO NOT MODIFY
- **Trusted devices only** — agents must be registered via Identity Service before first login
- **Never delete uploaded evidence** — `UPLOADED` capsules remain in queue for audit trail
- **GPS is optional** — capture proceeds without location if unavailable

---

## AWS Resources (us-east-1)

| Resource | Value |
|---|---|
| API Gateway | `483uyy43nc.execute-api.us-east-1.amazonaws.com` |
| Cognito Domain | `vote-capsule.auth.us-east-1.amazoncognito.com` |
| Cognito Client ID | `5qv2glumv6kd2652hqdrs6ufp` |
| Account | `683541453923` |

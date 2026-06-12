# Yes Boss

Personal assistant app: call-recording backup with real caller names, missed-call
auto-reply, SMS → spending analytics. Android-first; iOS later as view client.
See `Project_Plan.md` (roadmap), `project_rules.md` (conventions),
`mobile_api_structure.md` (mobile data-fetching architecture).

## Layout

```
apps/mobile      React Native (bare) app
apps/backend     NestJS + Prisma + Postgres API
packages/shared  Cross-boundary TS types (API contracts)
```

## First-time setup

```sh
yarn install                                  # all workspaces
docker compose up -d                          # Postgres + MinIO
cd apps/backend
copy .env.example .env                        # then edit secrets
yarn prisma:generate
yarn prisma:migrate                           # creates tables
yarn prisma:seed                              # creates the admin user from .env
```

## Run

```sh
yarn backend      # NestJS on :3000 (binds 0.0.0.0 for phone access)
yarn mobile       # Metro bundler
yarn android      # build + install on connected device/emulator
```

Android device on the same wifi reaches the backend at `http://<pc-ip>:3000`;
emulator uses `http://10.0.2.2:3000`.

## Requirements

- Node ≥ 20, Yarn 1.x, Docker
- Android builds: JDK 17 + Android Studio (SDK 35, platform-tools). Set
  `ANDROID_HOME` and add `platform-tools` to PATH.

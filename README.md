# BCC SmartConnect

**Status: development prototype. Not approved for public operational or emergency dispatch use.**

BCC SmartConnect contains a Flutter resident app, a React staff portal, and a modular Express API backed by PostgreSQL/PostGIS. An emergency report accepted by the API is only a submission receipt. This repository does not verify dispatcher acknowledgement, unit assignment, dispatch, or arrival. The mobile emergency screen displays Fire and Ambulance contacts published by the City of Bulawayo in its 6–12 November 2026 newsletter; these are contact details, not evidence that the app is connected to BCC dispatch.

## Current capabilities and limits

- Residents can submit incident reports after confirming a GPS fix or manually tapping a map location. The API stores the location source and capture time.
- Staff can view incident records after staff authentication. Team records are staff-only.
- Notice records are drafts until an authorized staff member publishes them. No SMS, push, or automated WhatsApp delivery is implied by saving or publishing a notice.
- Unverified offline notices, reservoir figures, contact channels, and dashboard performance claims have been removed.
- Emergency dispatch lifecycle, BCC-approved SLA targets, ward boundaries, durable private evidence storage, FCM registration, and offline report synchronization remain incomplete.

See [the Engineering Master Plan](docs/engineering-master-plan.md) for the repository-specific backlog, data model, workflows, API proposal, wireframes, and release gates.

## Repository

| Directory | Contents |
| --- | --- |
| `backend/` | Express API, PostgreSQL migrations, Socket.IO and service integrations |
| `frontend/` | React/Vite staff portal |
| `mobile/` | Flutter resident application |
| `supabase/` | Legacy schema reference; numbered backend migrations are the deployment path |

## Prerequisites

- Node.js `22.12+` (Vite 8 frontend runtime requirement)
- PostgreSQL 14+ with PostGIS
- Flutter SDK compatible with the Dart constraint in `mobile/pubspec.yaml`

Use the Node version in `.nvmrc` (or an equivalent version manager) for local development. Never use a production database for local experimentation.

## Backend setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ALLOWED_ORIGINS` in `backend/.env`. Use strong, unique local secrets. For example, set the allowed local portal origin to `http://localhost:5173`.

Initialize the database core schema once, then apply tracked migrations and start the API:

```powershell
npm run migrate
npm run dev
```

Before `npm run migrate` on a brand-new empty database, initialize PostGIS and apply `backend/sql/schema.sql` with `psql`. Existing deployments must be backed up and their current schema checked before migration.

The API listens on port `3000` by default. Liveness is available at `/health/live`; readiness checks that the database migrations have completed at `/health/ready`. Do not expose database credentials or secrets in client-side environment variables.

## Staff portal setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_URL=http://localhost:3000` in `frontend/.env`, then open `http://localhost:5173`. Staff-only views require a staff account provisioned through an authorized process; public registration creates resident accounts only.

## Mobile setup

```powershell
cd mobile
flutter pub get
flutter run --dart-define=BCC_API_URL=http://10.0.2.2:3000/api
```

The `10.0.2.2` address is for an Android emulator. For web use `http://localhost:3000/api`; for a physical device use the development computer's LAN address. Pass the API URL explicitly; the app does not default to a live production service.

## Database migrations

Run `npm run migrate` from `backend/` before starting the API. Migrations are ordered, checksummed, serialized, and recorded in `schema_migrations`. Do not edit an applied migration; add a new numbered SQL migration. The old `supabase/schema.sql` is retained for reference and must not be treated as an alternative production schema.

The migration set tags known bundled demonstration records as `is_demo` rather than deleting rows. API collection endpoints exclude those rows. Review data and take a backup before applying schema changes to any shared database.

## Deployment status

`render.yaml` runs the tracked migrations before deployment. Production also requires verified database TLS, durable private object storage, configured monitoring and backup/restore procedures, vetted BCC contacts, and an operational pilot approval. These are not supplied by this repository. Do not enable public emergency operations based on a successful software deployment alone.

# BCC SmartConnect — Presentation Code Pack

This folder contains clearly labeled copies of the exact source files to walk examiners through during your presentation (the live application runs from `backend/`, `frontend/`, and `mobile/`).

## Folder Guide

### `01-Auth-Registration-and-RBAC/` — Registration, Login & Role-Based Access Control
- `backend-auth-routes.js` — Resident registration (`bcrypt` cost 12, JWT access/refresh), login, Guest token, and Superadmin-only `POST /api/auth/staff`.
- `backend-jwt-middleware.js` — Verifies Bearer JWT tokens and active account status.
- `backend-rbac-middleware.js` — `requireRole(...)` role guard (`Administrator`, `Dispatcher`, `Communications`).
- `frontend-staff-login.jsx` — Full-screen Staff Login gate (blocks Residents, no public staff self-registration).
- `frontend-superadmin-create-staff.jsx` — Superadmin (`admin` / `bccit`) staff account creation modal.
- `mobile-app-entry-login-gate.dart` — Opens `AuthScreen` first when no session exists.
- `mobile-resident-auth-screen.dart` — Mobile Register / Login / Guest screen.

### `02-GIS-Fault-Emergency-and-Photos/` — GIS Reporting, Emergency SOS, Spatial Clustering & Photo Evidence
- `backend-incidents-gis-and-photos.js` — GIS coordinate validation, 150 m spatial deduplication, `ALLOWED_TRANSITIONS` state machine, magic-byte photo upload validation, and staff-only photo retrieval.
- `database-postgis-trigger-migration.sql` — PostGIS `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` and `is_emergency` trigger.
- `database-reference-column-migration.sql` — Widens `reference_number` to fit 29-char cryptographic references.
- `backend-realtime-socketio.js` — Authenticated Socket.IO `admin` room for live dispatch updates.
- `backend-security-cors-ratelimit.js` — Helmet headers, CORS origin filtering, and rate limiting.
- `mobile-report-fault-modal.dart` — Fault reporting UI with GPS, map pin confirmation, and photo upload.
- `mobile-gis-map-picker.dart` — Interactive OpenStreetMap pin picker.
- `mobile-emergency-sos-dialog.dart` — Emergency SOS reporting dialog.

### `03-Tracking-Lifecycle-and-Notifications/` — Tracking, Persistent History & Resolved Alerts
- `mobile-track-reference-dialog.dart` — Public reference lookup & timestamped audit timeline.
- `mobile-home-complaints-and-alerts.dart` — Active/Resolved counts, My Complaints (`All / Active / Resolved`), 15-second live polling, and Resolved pop-up notifications.
- `mobile-api-client-and-sync.dart` — REST API client & persistent local/cloud report sync.

### `04-Staff-Portal-UI-and-Live-Map/` — React Staff Dashboard UI, Live GIS Map & Dispatch
- `frontend-dashboard-and-rbac.jsx` — Main dashboard, login gate, role-scoped UI, and real-time Socket.IO sync.
- `frontend-sidebar-rbac-and-logout.jsx` — Role-filtered sidebar menu and Logout button.
- `frontend-topbar-rbac-and-logout.jsx` — Top search bar, role-filtered quick actions, and Logout button.
- `frontend-live-gis-map.jsx` — Interactive Leaflet Live GIS Map showing plotted incidents.
- `frontend-incident-detail-gis-and-photo.jsx` — Incident detail modal showing GIS coordinates, Google Maps link, authenticated photo preview, and status/team dispatch.
- `frontend-api-and-socketio-client.js` — Frontend REST + Socket.IO client.

### `05-Automated-Testing/` — Live Runnable Test Suites
- `unit-tests-jwt-and-rbac.test.js` — Run with `cd backend && npm run test:unit` (7 offline unit tests).
- `live-e2e-integration-tests.test.js` — Run with `cd backend && npm run test:live` (10 non-destructive live end-to-end tests).

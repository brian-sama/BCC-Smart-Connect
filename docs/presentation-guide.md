# BCC SmartConnect — Presentation & Code Walkthrough Guide

## 1. Quick Startup & Live URLs

- **Live Staff Portal (Netlify):** https://bccsmartconnect.netlify.app
- **Live Backend API (Render):** https://bcc-smart-connect.onrender.com (`/health/ready`)
- **Local Backend:** `cd backend && npm start` (Port `3000`)
- **Local Staff Portal:** `cd frontend && npm run dev` (Port `5173`)
- **Local Mobile (Chrome):** `cd mobile && flutter run -d chrome --web-port=8080 --dart-define=BCC_API_URL=http://localhost:3000/api`
- **Live Automated Tests:**
  - `cd backend && npm run test:unit` (7 offline JWT + RBAC unit tests)
  - `cd backend && npm run test:live` (10 non-destructive live end-to-end tests)

---

## 2. Staff Portal Login Credentials (RBAC)

| Role | Username / Email | Password | Authorized Views |
| :--- | :--- | :--- | :--- |
| **Superadmin** (`Administrator`) | `admin` | `bccit` | Full access + **Create Staff Account** |
| **Administrator** | `admin@bcc.gov.zw` | `BccAdmin@2026` | Full access + **Create Staff Account** |
| **Dispatcher** | `dispatcher@bcc.gov.zw` | `BccDispatch@2026` | Dashboard, Live GIS Map, Incident Queue, Field Teams, Analytics |
| **Communications** | `comms@bcc.gov.zw` | `BccComms@2026` | Dashboard, Notice Draft, Verified Contacts (WhatsApp), Analytics |

*(Mobile App: Register a new Resident account live or tap **Continue as Guest**.)*

---

## 3. Fault Reporting, Escalation & Resolution Flow

1. **Citizen Submission (Mobile App → `POST /api/incidents`)**
   - Resident/Guest picks a fault (`WaterLeak`, `SewerBurst`, `RoadDamage`, `StreetLight`, `Other`) or emergency (`Fire`, `Ambulance`, `Disaster`), confirms **GPS or Map Pin**, and attaches optional photo evidence.
   - Backend validates coordinates, stores a **PostGIS `GEOGRAPHY(Point, 4326)`**, runs a **150 m / 24h spatial deduplication check**, generates `BCC-YYYYMMDD-...`, and logs `New` in `incident_timeline`.
2. **First Receiver → BCC Control Room (`Dispatcher`)**
   - Real-time **Socket.IO** pushes `incident:new` to authenticated staff in the `admin` room.
   - Emergencies (`is_emergency = true`) trigger a flashing red banner + Priority Emergency Card.
3. **Triage & Assignment (`New → Assigned`)**
   - Dispatcher assigns the responsible **Department** and **Field Team**.
4. **Escalation Paths**
   - **Severity Escalation:** `Fire`, `Ambulance`, `Disaster` automatically bypass routine queues (`is_emergency = true`).
   - **Spatial Cluster Escalation:** Duplicate reports within 150 m in 24h are clustered and flagged (`duplicate_detected`).
   - **Controlled Rollbacks / Re-assignment:** `Assigned → New`, `InProgress → Assigned`, `Resolved → InProgress`.
   - **Public Communications Escalation:** `Communications` officer sends ward notices / Verified WhatsApp updates / PostGIS polygon zone alerts (`POST /api/notifications`).
5. **Resolution Authority & Tracking (`InProgress → Resolved → Closed`)**
   - Only **`Dispatcher`** and **`Administrator`** can change incident status (`403 Forbidden` for `Communications` and `Resident`).
   - Enforced state machine (`ALLOWED_TRANSITIONS`) prevents skipping steps (`409 Conflict`).
   - Citizens track progress live via `GET /api/incidents/track/:reference` and receive in-app **Issue Resolved** notifications.

---

## 4. Key Code Files to Show Examiners

### A. User Registration, Authentication & RBAC
- `backend/src/routes/auth.js` — Resident registration (`bcrypt` cost 12, JWT access/refresh), Login, Guest token, and Superadmin-only `POST /api/auth/staff`
- `backend/src/middleware/auth.js` — JWT verification & live active-user check
- `backend/src/middleware/rbac.js` — `requireRole(...)` enforcement
- `frontend/src/components/LoginModal.jsx` — Full-screen Staff Login gate (blocks Residents, no public self-registration)
- `frontend/src/components/CreateStaffModal.jsx` — Superadmin-only staff provisioning UI
- `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/TopBar.jsx` — Role-scoped UI RBAC & Logout
- `mobile/lib/main.dart` & `mobile/lib/screens/auth_screen.dart` — Mobile Login-first startup & Resident Register/Login/Guest

### B. GIS Fault & Emergency Reporting + Photo Evidence
- `backend/src/routes/incidents.js` — GIS coordinate validation, 150 m spatial clustering, magic-byte photo validation (`POST /:id/media`), staff-only media delivery (`GET /:id/media`)
- `backend/sql/migrations/004_align_schema_with_api.sql` — PostGIS point trigger (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`) & `is_emergency` trigger
- `backend/sql/migrations/007_widen_reference_number.sql` — Reference column widening
- `backend/src/sockets/incidentSocket.js` & `backend/src/app.js` — Authenticated Socket.IO `admin` room, Helmet, CORS, rate limiting
- `frontend/src/components/LiveMapModal.jsx` — React Leaflet Live GIS Map
- `frontend/src/components/IncidentDetailModal.jsx` — GIS coordinates, Google Maps link, authenticated photo preview, status dispatch
- `mobile/lib/widgets/report_fault_modal.dart`, `map_picker_dialog.dart`, `emergency_sos_dialog.dart` — Mobile GIS reporting & SOS

### C. Incident Tracking, Lifecycle & Notifications
- `backend/src/routes/incidents.js` — `ALLOWED_TRANSITIONS` state machine, `GET /track/:reference` (hides personal phone), `PATCH /:id`
- `mobile/lib/widgets/track_reference_dialog.dart` — Reference lookup & audit timeline
- `mobile/lib/screens/home_screen.dart` & `mobile/lib/services/supabase_service.dart` — Live Active/Resolved counts, persistent history, 15s polling & Resolved pop-up alerts

### D. Automated Testing
- `backend/test/unit.test.js` — 7 offline unit tests (JWT & RBAC)
- `backend/test/live-e2e.test.js` — 10 non-destructive live end-to-end tests (Auth, RBAC, PostGIS, 150 m clustering, Socket.IO, photo upload, state machine & tracking)

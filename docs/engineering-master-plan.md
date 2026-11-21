# BCC SmartConnect Engineering Master Plan

**Status:** Planning baseline, derived from the repository on 21 November 2026  
**Product position:** Municipal service reporting prototype with an emerging operations portal. It is not an emergency dispatch system and must not be described as one until an acknowledged response operation is implemented and verified.

This plan translates the supplied software audit into a repository-specific sequence of work. It is an engineering plan, not an operational approval, formal security assessment, or approval of council contact details, emergency numbers, service targets, or public data sources. Those values require an accountable BCC owner.

## 1. Goals and delivery rules

The product should make every resident submission traceable, every location explicit, every staff action attributable, and every resident-facing claim true. Keep the current modular Express application, React portal, Flutter app, and PostgreSQL/PostGIS unless implementation evidence requires a change. Do not split into microservices as a prerequisite.

Rules for implementation:

1. Never imply a unit has been alerted, assigned, dispatched, or is en route until that step has a durable record and an identified actor or integration acknowledgement.
2. Never submit a location that the resident has not acquired or explicitly confirmed.
3. Production screens use database-backed information or clearly show that data is unavailable. Sample data belongs in development fixtures, visibly identified as sample.
4. State changes, assignments, publications, and notification attempts are durable, attributable events; related writes occur in a transaction or through a transactional outbox.
5. Build new schema changes as forward-only numbered migrations. Stop treating either checked-in full schema as a separately maintained production truth after a canonical schema is selected.
6. Phase completion is measured by the exit criteria below, not by UI presence alone.

## 2. Current repository map and file-level backlog

Priority: **P0** safety/privacy release blocker; **P1** reliable pilot foundation; **P2** operational capability; **P3** quality and expansion. Estimate labels are relative (S/M/L), not calendar commitments.

| Priority | Existing path(s) | Work item and acceptance evidence | Size |
| --- | --- | --- | --- |
| P0 | `mobile/lib/widgets/emergency_sos_dialog.dart` | Replace “broadcasted”, dispatcher-alerted, and units-en-route claims with a submission receipt; add approved emergency-contact guidance/configuration; show a persistent limitation that the app is not a substitute for calling verified emergency services. Test submitted, failed, GPS denied, and manual-pin flows. | S |
| P0 | `mobile/lib/widgets/report_fault_modal.dart`, `mobile/lib/widgets/map_picker_dialog.dart` | Remove default City Hall coordinates. Require a fresh GPS fix with visible accuracy or a user-confirmed map pin before submission. Record source, accuracy, capture time, and confirmation; reject missing/out-of-Bulawayo location according to a council-approved boundary policy. | M |
| P0 | `frontend/src/components/ActivityChartCard.jsx`, `ResolutionGaugeCard.jsx`, `ResponseTimerCard.jsx`, `AnalyticsView.jsx`, `StatCard.jsx`, `frontend/src/data/mockData.js`, `frontend/src/App.jsx` | Remove fixed performance figures, simulated timer actions, placeholder teams, and invented comparisons from production paths. Until real metrics exist, show unavailable/empty states. Supply reporting endpoints before restoring metrics. | M |
| P0 | `mobile/lib/services/supabase_service.dart`, `mobile/lib/screens/home_screen.dart`, `mobile/lib/constants/bulawayo_data.dart`, `supabase/schema.sql` | Remove fabricated offline bulletins, reservoir values, and placeholder WhatsApp links from public UI. If offline, show last verified record with source and timestamp, or an explicit empty/offline state. Require approval and provenance for real contact data. | M |
| P0 | `backend/src/routes/incidents.js`, `backend/src/app.js` | Protect reporter PII, evidence, tracking, and socket events; separate public safe DTOs from staff DTOs. Remove public static access to private uploads. Make public reference tracking resistant to enumeration (unguessable token or rate-limited reference plus separate secret). Add request schema validation and upload content inspection. | L |
| P0 | `README.md`, `frontend/README.md`, `mobile/README.md` | Remove Production Ready badge, “live dispatch”, “automatic analytics”, and unsupported deployment/service claims. State prototype boundaries, local setup, exact Node engine supported by locked Vite, and verified/not-yet-configured integrations. | S |
| P0 | repository `.env*`, deployment variables, Git history if applicable | Identify and rotate any credentials previously committed or distributed; remove secrets from tracked files and ensure ignore rules. No secret values should be copied into this plan or logs. | M |
| P1 | `backend/sql/schema.sql`, `supabase/schema.sql`, `backend/sql/migrations/001*`–`004*`, `backend/src/scripts/runMigrations.js` | Select PostgreSQL schema as canonical; compare both schemas against route SQL; add migration ledger, checksums, transaction/locking behavior, preflight validation, and rollback/forward-repair notes. Add migrations for target model below and a data migration from legacy columns. | L |
| P1 | `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`, `backend/src/middleware/rbac.js`, `mobile/lib/services/storage_service.dart`, `mobile/lib/services/supabase_service.dart`, `frontend/src/components/LoginModal.jsx`, `frontend/src/services/api.js` | Define guest identity and session contract; remove contradictory client assumptions; move mobile credentials from plain preferences to secure storage; implement refresh/revocation or short-lived sessions, password reset and staff provisioning policy. Ensure staff roles are never self-selected at registration. | L |
| P1 | `backend/src/routes/incidents.js`, `backend/src/routes/auth.js` | Make incident creation, timeline event, attachment metadata, and outbox notification atomic. Enforce ownership on resident reads. Use idempotency keys for mobile retry. Validate description lengths, coordinates and allowed suburbs/area boundary. | L |
| P1 | `backend/src/config/db.js`, `backend/src/app.js`, `backend/src/sockets/incidentSocket.js`, `render.yaml` | Require certificate verification in production; set JSON body limits; configure exact production origins; authenticate socket handshake and authorize rooms; add `/health/live` and `/health/ready` with DB check; graceful shutdown and connection-pool handling. | M |
| P1 | `backend/src/routes/incidents.js` upload handlers, `backend/src/app.js` | Store private media in durable object storage behind signed, authorized access; inspect file signatures, cap dimensions and decompression risk, randomize object names, and clean failed uploads. Keep local storage development-only. | L |
| P1 | `backend/src/routes/incidents.js` (`GET /track/:reference`), `mobile/lib/widgets/track_reference_dialog.dart` | Return only resident-safe status/timeline. Use a high-entropy track token delivered once at submission; hash it at rest. Rate limit and audit failed attempts. | M |
| P1 | `backend/src/services/councilScraperService.js`, `backend/src/routes/bulletins.js`, `frontend/src/components/BroadcastModal.jsx`, `mobile/lib/services/supabase_service.dart` | Treat scraped notices as drafts with source URL, retrieval time, content hash, review and approval. Remove fallback “official” notices. Separate create/draft from publish; require authorized approver and published/expiry timestamps. | M |
| P1 | `backend/src/routes/notifications.js`, `backend/src/services/fcm.js`, `mobile/pubspec.yaml`, `mobile/lib/services/supabase_service.dart` | Either disable claims/UI for push until a full FCM registration and delivery lifecycle exists, or implement device token registration, token rotation/deletion, recipient snapshot, delivery outcomes, retries and provider configuration. Do not treat provider acceptance as device delivery. | L |
| P1 | `backend/src/routes/teams.js`, `frontend/src/components/FieldTeamsCard.jsx`, `FieldTeamsView.jsx`, `IncidentDetailModal.jsx` | Replace loose team status/person-name strings with managed team, membership, capability, department and availability records; confirm assignment transactionally and maintain assignment history. | L |
| P2 | `backend/src/routes/incidents.js`, `frontend/src/components/IncidentQueueView.jsx`, `IncidentDetailModal.jsx`, `PriorityEmergencyCard.jsx` | Implement legal status transitions, dispatcher acknowledgement, triage, assignment, acceptance, en-route, arrival, resolution and closure. Every transition records actor and timestamp. Emergency events must remain distinct from ordinary maintenance states. | L |
| P2 | backend modules and schema | Add digital work orders with tasks, crew, materials, arrival/completion evidence, supervisor verification, and link to incident. Do not mark resolved solely on a timer or client-side action. | L |
| P2 | backend reporting service; `frontend/src/components/AnalyticsView.jsx` and dashboard cards | Add aggregate SQL endpoints with date range, timezone, department/ward filters, denominator definitions and data freshness. Display metric definition and no-data state; calculate only from eligible records. | L |
| P2 | `backend/src/routes/whatsapp.js`, `frontend/src/components/WhatsAppChannelsModal.jsx`, `mobile/lib/widgets/whatsapp_community_modal.dart` | Maintain verified contact/channel directory with owner, approval actor, last verification and expiry. Label share-as-manual-share. Automated WhatsApp/SMS requires an approved provider, consent rules, template approval and delivery receipts. | M |
| P2 | `mobile/lib/services/storage_service.dart`, `mobile/lib/widgets/report_fault_modal.dart`, `mobile/lib/widgets/emergency_sos_dialog.dart` | Add durable offline draft queue, encrypted sensitive fields, retry with idempotency, upload resume, conflict policy and clear pending/sent/failed states. Never represent queued emergency SOS as received. | L |
| P2 | GIS schema/services and `frontend/src/components/LiveMapModal.jsx` | Add authoritative ward/suburb boundaries with data source/version, point-in-polygon ward resolution, spatial indexes, quality checks, layer visibility and map data attribution. | L |
| P3 | all three applications | Establish accessibility baseline (keyboard, screen reader, contrast, text scaling), multilingual strings, performance budgets, and supported-device matrix. | L |
| P3 | root, backend/frontend/mobile manifests; deployment config | Add CI stages for lockfile install, lint/static analysis, unit/integration suites, migration verification, builds, dependency/security scans, and deploy approval. Separate staging and production secrets/config. | M |

## 3. Dependency-ordered roadmap and gates

### Phase 0 — Safe claims and exposed data (P0)

Sequence: SOS copy and public hotline policy → ordinary location gate → remove fake metrics and notices → close PII/media/tracking/socket exposure → credential hygiene → correct README and deployment claims.

**Exit gate:** No resident screen claims unverified response; no unknown location can be sent; public endpoints expose only reviewed fields; private evidence requires authorization; production UI has no demo metric or placeholder official notice; all externally distributed secrets are rotated. Until this gate passes, do not recruit residents for a public pilot.

### Phase 1 — Canonical data and identity (P1)

Sequence: freeze legacy write paths → choose canonical PostgreSQL schema → inventory/migrate existing records → migration ledger → staff identity and roles → guest/report tracking contract → API validation and transactions → health/readiness and storage.

**Exit gate:** Fresh database and upgrade from the current deployed schema both converge to the same version; migration is repeatable/safe under concurrent deploy; resident cannot read another resident’s PII; staff access is server-enforced and auditable; uploads survive redeploy and are private; readiness fails when DB is unavailable.

### Phase 2 — Traceable incident operations (P2)

Implement incident event timeline and transition policy first, then dispatch assignment/acceptance, team capacity, work orders, SLA policy, and durable notification outbox. Emergency workflow activation requires a named BCC duty owner, operating procedure, escalation path, staffed hours, and tested contact integrations.

**Exit gate:** Every transition has actor/time; concurrent assignment cannot double-book; an emergency may be “submitted” without being misrepresented as acknowledged; dispatch event deliveries are retried and visible; end-to-end tabletop and technical drills are signed off by BCC operations.

### Phase 3 — Verified public information and analytics

Create official notice publishing, approval history, source provenance, expiry, and correction flow. Add aggregate reporting SQL after status and timestamp semantics are stable. Label stale data and show calculation windows.

**Exit gate:** A public notice has an identifiable approver/source/validity window; expired notices disappear or are clearly expired; each displayed metric can be reproduced from a documented query and filters.

### Phase 4 — Resident reliability, GIS and controlled pilot

Build mobile offline drafts and idempotent sync, then verified boundaries and ward routing, then accessibility and localization. Pilot with one department and a bounded set of non-emergency service categories. Emergency use remains disabled until the Phase 2 operational gate and council authorization are satisfied.

**Exit gate:** Resident-to-staff-to-work-order-to-verified-resolution journey succeeds in poor connectivity and reconnect cases; duplicate retries do not create duplicate incidents; backup restore is demonstrated; support ownership and incident response procedures exist.

## 4. Target PostgreSQL/PostGIS model

The following is the target logical model. Implement it through ordered migrations rather than replacing a live database with a new schema dump. Use UUID primary keys, `timestamptz`, FK constraints, explicit check constraints, and server-generated timestamps. Keep incident domain types/status as lookup tables or constrained enums only if new values can be deployed safely; lookup tables are preferable for council-managed configuration.

```sql
-- Identity and organizational structure
users(id, email_normalized UNIQUE NULL, phone_e164 NULL, password_hash NULL,
      first_name, last_name, account_kind, is_active, created_at, updated_at)
roles(id, code UNIQUE, name)
user_roles(user_id FK, role_id FK, granted_by FK users, granted_at, revoked_at,
          PRIMARY KEY(user_id, role_id, granted_at))
departments(id, code UNIQUE, name, active)
staff_profiles(user_id PK/FK, department_id FK, employee_code UNIQUE NULL)
refresh_sessions(id, user_id FK, token_hash UNIQUE, expires_at, revoked_at, created_at)

-- Spatial reference data (source/version are mandatory metadata)
wards(id, code UNIQUE, name, boundary geography(MultiPolygon,4326),
      source_name, source_version, imported_at, active)
suburbs(id, ward_id FK, name, boundary geography(MultiPolygon,4326),
        source_name, source_version, imported_at)

-- Resident reports
incidents(id, reference_number UNIQUE, reporter_id FK NULL, reporter_name NULL,
          reporter_phone NULL, incident_type_id FK, description, status_code FK,
          priority_code FK, is_emergency boolean, location geography(Point,4326) NOT NULL,
          location_source CHECK (location_source IN ('gps','manual_pin')),
          location_accuracy_m numeric NULL, location_captured_at timestamptz NOT NULL,
          location_confirmed_at timestamptz NOT NULL, ward_id FK NULL, suburb_id FK NULL,
          address NULL, idempotency_key UNIQUE NULL, tracking_token_hash UNIQUE,
          created_at, updated_at, resolved_at NULL, closed_at NULL)
incident_types(id, code UNIQUE, label, department_id FK NULL, emergency boolean,
               active, requires_location_accuracy_m NULL)
incident_events(id, incident_id FK, event_type, from_status NULL, to_status NULL,
                actor_user_id FK NULL, actor_kind, occurred_at, public_note NULL,
                internal_note NULL, metadata jsonb)
incident_assignments(id, incident_id FK, team_id FK, assigned_by FK users,
                     assigned_at, accepted_by FK NULL, accepted_at NULL,
                     dispatch_at NULL, arrived_at NULL, released_at NULL)
evidence(id, incident_id FK, object_key UNIQUE, media_type, byte_size,
         uploaded_by FK NULL, sha256, created_at, retention_until NULL)

-- Teams, work orders and service policy
field_teams(id, department_id FK, code UNIQUE, name, active)
team_members(team_id FK, user_id FK, duty_from, duty_until NULL,
             PRIMARY KEY(team_id,user_id,duty_from))
team_status_events(id, team_id FK, status_code, actor_user_id FK, occurred_at, note)
work_orders(id, incident_id FK, reference UNIQUE, department_id FK, status_code,
            created_by FK, created_at, started_at NULL, completed_at NULL,
            verified_by FK NULL, verified_at NULL, completion_notes NULL)
work_order_tasks(id, work_order_id FK, description, status_code, sequence_no)
work_order_materials(id, work_order_id FK, item_code NULL, description, quantity, unit)
service_policies(id, incident_type_id FK, priority_code FK, acknowledge_minutes,
                 respond_minutes NULL, resolve_minutes NULL, calendar_code,
                 effective_from, effective_until NULL, approved_by FK users)
sla_instances(id, incident_id FK UNIQUE, policy_id FK, started_at, paused_seconds,
              acknowledge_due_at, respond_due_at NULL, resolve_due_at NULL,
              acknowledged_at NULL, breached_at NULL)

-- Notices, communications and reliable asynchronous delivery
bulletins(id, title, body, category, source_url NULL, source_name, source_retrieved_at NULL,
          status CHECK(status IN ('draft','review','published','withdrawn','expired')),
          published_by FK NULL, approved_by FK NULL, published_at NULL, starts_at NULL,
          expires_at NULL, created_at, updated_at)
bulletin_areas(bulletin_id FK, ward_id FK, suburb_id FK NULL)
bulletin_revisions(id, bulletin_id FK, revision_no, snapshot jsonb, actor_user_id FK,
                   changed_at, reason)
device_tokens(id, user_id FK, platform, token_ciphertext, token_hash UNIQUE, active,
              last_seen_at, created_at, updated_at)
notification_campaigns(id, bulletin_id FK NULL, incident_id FK NULL, channel,
                       created_by FK, status, created_at, scheduled_at NULL)
notification_deliveries(id, campaign_id FK, recipient_key, provider_message_id NULL,
                         status, attempt_count, last_attempt_at NULL, delivered_at NULL,
                         error_code NULL, UNIQUE(campaign_id,recipient_key))
outbox_events(id, aggregate_type, aggregate_id, event_type, payload jsonb,
              created_at, published_at NULL, attempt_count, last_error NULL)
audit_events(id, actor_user_id FK NULL, action, entity_type, entity_id,
             request_id, occurred_at, before_data jsonb NULL, after_data jsonb NULL)
```

**Spatial indexes:** GiST on incident location and active ward/suburb boundaries. B-tree on incident `(status_code, created_at DESC)`, `(ward_id, created_at DESC)`, type/priority, event `(incident_id, occurred_at)`, assignment team and open-work indexes. Add partial indexes only after query plans confirm them. Keep canonical point coordinates in PostGIS; remove parallel `lat/lng` columns after backfill and client cutover. Compute ward/suburb from authoritative polygons on the server and retain an override only as an audited staff correction.

**Migration strategy:** 1) snapshot and inventory schema/data; 2) create new tables and compatibility views/columns; 3) backfill users, incident points, teams, notices, and timeline; 4) validate row counts, nulls, references, and spatial ranges; 5) dual-read/compare; 6) switch writes; 7) remove old columns only in a later migration after rollback window. Do not make an incident insert depend on a best-effort timeline insert.

## 5. Incident and emergency workflows

### Ordinary municipal report

`Draft (device only) → Submitted/New → Triaged → Assigned → Accepted → InProgress → Resolved → Closed`

Allowed transitions are server-side and role-checked. A dispatcher may return a report to triage, reject with a reason, or merge a duplicate while preserving both references and history. A field team can accept/reject its assignment with reason, record arrival and work evidence, and submit completion. A supervisor verifies completion before closure where policy requires. Reopen creates an event and new work-order task; it never erases prior resolution.

### Emergency report

`Submitted → Acknowledged → Assessed → UnitAssigned → AcceptedByUnit → Dispatched → OnScene → Resolved → Closed`

An emergency may also enter `UnableToDispatch` or `Cancelled` with reason, actor, timestamp, resident-safe explanation, and escalation audit. “Submitted” means only that the API durably accepted the report. “Acknowledged” requires a dispatcher identity. “Dispatched” requires an accepted assignment and dispatch action. The app must show timestamps and only claim a team is en route after the dispatch event. Define staffed coverage, escalation timing, primary/secondary contacts, fallback telephone process, and incident command ownership with BCC before enabling this workflow publicly.

### Event integrity

Every command checks current state inside a transaction (`SELECT ... FOR UPDATE` or conditional update), writes the current state plus `incident_events`, and inserts the outbound event in `outbox_events`. The worker sends Socket.IO/FCM/SMS after commit and marks provider acceptance/failure. Clients reconcile from REST after reconnect; sockets are an update hint, not the system of record.

## 6. API contract proposal (versioned under `/api/v1`)

All JSON errors use `{ "error": { "code": "...", "message": "...", "request_id": "..." } }`. Paginated collection responses use `{ "data": [], "page": 1, "page_size": 50, "total": 0 }`. Validate with shared OpenAPI contract; timestamps are ISO-8601 UTC; coordinates are GeoJSON `[longitude, latitude]` to avoid axis ambiguity. Use `Idempotency-Key` on create and mutation retries.

| Method/path | Auth | Purpose / important contract |
| --- | --- | --- |
| `POST /auth/register` | Public, rate limited | Resident account only; returns short-lived access token and refresh-session rotation metadata. |
| `POST /auth/guest` | Public, rate limited | Creates scoped guest session; never creates staff role. |
| `POST /auth/session` / `DELETE /auth/session` | Public / authenticated | Login; revoke current refresh session. |
| `POST /auth/refresh` | Refresh credential | Rotate refresh token; revoke reuse and associated session. |
| `POST /incidents` | Resident/guest | Body: type, description, location point, `location_source`, accuracy, captured time, confirmation, optional contact/evidence metadata. Requires explicit location confirmation and idempotency key. Response contains reference, tracking secret once, accepted state, and no dispatch promise. |
| `GET /incidents/{id}` | Owner or staff | Owner gets resident-safe projection; staff gets authorized operational projection. |
| `GET /tracking/{reference}` | Tracking secret | Safe status and public event history only. No reporter data, internal notes, team private details, or exact personal contact. |
| `GET /staff/incidents` | Staff | Cursor/page filters: status, type, ward, department, emergency, created range. PII access audited. |
| `POST /staff/incidents/{id}/transitions` | Authorized staff | `{to, public_note?, internal_note?, reason?}`; server validates transition and atomically records actor/event/outbox. |
| `POST /staff/incidents/{id}/assignments` | Dispatcher | Team and optional staff assignment; returns assignment lifecycle. Uses optimistic concurrency/version. |
| `POST /staff/assignments/{id}/accept`, `/dispatch`, `/arrive`, `/release` | Assigned team/dispatcher as policy permits | Explicit, idempotent lifecycle commands; dispatch response is recorded only after durable command succeeds. |
| `POST /staff/incidents/{id}/work-orders` | Dispatcher/supervisor | Create linked work order. |
| `PATCH /staff/work-orders/{id}` | Assigned team/supervisor | Update task/material/work evidence; supervisor verification is separate action. |
| `GET /public/bulletins` | Public | Published/not-expired notice DTO, affected area and source/updated time only. |
| `POST /staff/bulletins`, `POST /staff/bulletins/{id}/approve`, `/publish`, `/withdraw` | Communications/approver | Draft/review/publish separation, revision history and approval actor. Creator cannot approve own notice if council policy requires separation. |
| `POST /devices`, `DELETE /devices/{id}` | Authenticated | Register/revoke current FCM token, platform and consent state. |
| `GET /staff/reports/summary` | Staff | Aggregates by time range, department, ward; response includes `as_of`, timezone, definitions, denominators and filters. |
| `GET /health/live`, `GET /health/ready` | Internal/monitoring | Liveness and readiness, with DB connectivity/schema version on readiness; no secrets/details in public response. |

Do not expose `GET /api/teams`, incident PII, socket rooms, notification campaign tools, or draft notices to anonymous callers. Socket handshake uses the same access token and room membership is derived from server authorization.

## 7. UI/UX wireframes and behavior

Wireframes describe structure and state, not polished visual styling. All screens need loading, empty, stale, network-error, permission-denied, and accessibility states.

### Citizen report — location-first confirmation

```text
┌──────────────────────────────────────────┐
│ Report a municipal issue       Step 2/3  │
│ What happened?  ✓   Where?  ●   Review ○ │
├──────────────────────────────────────────┤
│ Reported location                        │
│ [ map centered on current/selected point ]│
│                                          │
│ Location: GPS fix (± 18 m)                │
│ Captured 14:32  ·  Bulawayo boundary ✓    │
│ [Use current location] [Move pin]         │
│                                          │
│ Suburb / landmark: [___________________]  │
│ Map pin must be confirmed before submit.  │
│                                          │
│ [Back]                    [Confirm place]│
└──────────────────────────────────────────┘
```

If GPS is denied or inaccurate, explain the issue and offer manual pin selection. No coordinates are prefilled. Before final submit, show category, location source/accuracy, description, and privacy note. After submission show reference, `Submitted to BCC`, current timestamp, a track credential, and an emergency call action with only BCC-approved number(s). Clearly state that submission is not confirmation of dispatch.

### Staff operations dashboard

```text
┌ BCC SmartConnect · Operations · Data updated 14:36 · Staff: N. Dube ┐
│ [Emergency queue: 2 awaiting acknowledgement] [Open reports: 84]      │
│ [Unassigned: 12] [Breached by approved SLA: 4] [Data as of: 14:35]  │
├───────────────────────────┬─────────────────────────────────────────┤
│ Priority work queue       │ Map / ward filters                      │
│ Ref | age | ward | state  │ [incidents from authorized API]         │
│ ...                       │                                         │
├───────────────────────────┴─────────────────────────────────────────┤
│ Department workload (actual count, selected window, definition)    │
└────────────────────────────────────────────────────────────────────┘
```

Emergency queue is visually distinct and driven by durable state. Every metric has time window, last-updated time, drill-down, and defined calculation. If query fails or returns no records, show “Unavailable” or zero only when the query succeeded. Do not display comparison percentages without matching historical data.

### Incident detail and dispatch

```text
┌ BCC-2026-… · WATER LEAK · HIGH · Submitted 14:32 ─────────────────┐
│ State: New  | Acknowledgement due: policy timestamp (if configured)│
├────────────────────┬───────────────────────────────────────────────┤
│ Location + map      │ Resident-safe contact / private fields gate  │
│ ward, suburb, source│ Description + evidence (authorized links)     │
├────────────────────┴───────────────────────────────────────────────┤
│ Timeline: submitted → triaged → assigned → accepted → arrived ... │
│ Assignment: [team] [officer] [Assign]  [Create work order]         │
│ Internal note [........................................] [Save]   │
│ Resident update [......................................] [Send]   │
└───────────────────────────────────────────────────────────────────┘
```

Keep public updates separate from internal notes. Disable actions that are invalid for current state and show the reason. Confirm dispatch with team/recipient and location before action. The UI must not locally advance state before API acknowledgement.

### Notices and analytics

Notice editor states: `Draft → Review requested → Approved → Scheduled/Published → Withdrawn/Expired`; show source, affected wards, start/end time, last verified, approver, revision history and preview exactly as residents see it. Analytics page starts with filters and “Data through…” metadata; each chart has query definition, denominator, missing-data explanation, and downloadable aggregate data only.

## 8. Security, operations, and deployment baseline

- Production TLS validates CA certificates; secrets come from deployment secret storage; rotate secrets if exposed.
- Enforce authentication, role and resource ownership on every API and socket action. Default-deny. Apply least privilege to DB role and staff accounts.
- Public create/track endpoints have abuse controls, schema limits, idempotency and monitoring. Avoid returning raw DB errors or stack traces.
- Evidence objects are private, malware/content checked where appropriate, size-limited, retention-managed and accessed via short-lived signed URLs after authorization.
- Logs use request IDs and actor/entity IDs, redact tokens, passwords, contact data, exact coordinates and signed URLs. Audit logs are append-only to application roles.
- Separate liveness from readiness. Readiness confirms DB and migration compatibility. Add backup schedule, encrypted backup, restore drills, retention, RPO/RTO agreed with BCC.
- Background delivery uses an outbox/worker with bounded retries, dead-letter visibility and operator replay. In-process timers cannot own SLA/escalation correctness.
- Pin Node version from actual Vite/backend engine compatibility; keep dependency lockfiles and CI install reproducible. Document staging URLs separately from production.
- Deployment uses private durable object storage, managed PostgreSQL with verified TLS, health checks, migration job, rollback plan, and monitoring for API errors, DB pool, queue age, failed notifications, stale notices and access anomalies.

## 9. Verification plan and release checklist

Verification is required before each gate; this plan defines scope, not completed results.

**Domain/database:** migration from empty DB and legacy DB; invalid transitions; concurrent assignment; reference uniqueness; PostGIS range and ward resolution; transaction rollback when timeline/outbox fails; data-retention behavior.

**API/security:** anonymous/staff/resident role matrix; cross-resident access; tracking-token brute-force/rate-limit; socket room authorization; CORS; upload MIME spoofing/oversize/private access; validation; SQL parameterization; refresh reuse/revocation; error redaction.

**Mobile:** GPS accepted/denied/unavailable/inaccurate; manual pin confirmation; offline queue/retry/idempotency; upload interrupted; duplicate tap; session expiry; accessible text scaling; emergency copy in success/failure states.

**Operations:** notification provider timeout/retry; outbox restart; DB unavailable readiness; backup restore; deployment migration interruption; structured logs and incident runbook; dispatcher tabletop drill with fallback channels.

**Release checklist:**

- [ ] BCC operational owner approves emergency operating procedure, published emergency contacts, coverage and escalation.
- [ ] Security/privacy review signs off public data and evidence access.
- [ ] Real production dataset and boundary provenance approved.
- [ ] All screens distinguish queued, submitted, acknowledged, assigned, dispatched, and resolved.
- [ ] No sample or stale source content appears as live official data.
- [ ] Restore and rollback procedures demonstrated.
- [ ] Monitoring, support ownership, user feedback and withdrawal plan are staffed.
- [ ] Department pilot scope, training and success measures are agreed.

## 10. Decisions requiring named BCC owners

The engineering team can implement the safeguards without choosing policy values. BCC must supply/approve: official emergency and after-hours numbers; dispatch staffing and escalation duty; service categories and department ownership; acceptable GPS accuracy and service boundary; SLA targets/calendars; location/privacy retention; evidence retention; official ward/suburb GIS source; contact-channel verification; notice approval separation; resident consent and communication rules; pilot department and operating hours; recovery objectives.

Until approved values exist, keep the affected control disabled or show an explicit unavailable state. Never fill these gaps with invented sample values in a public deployment.

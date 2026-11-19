# BCC SmartConnect: Unified Municipal Citizen Portal & Emergency Dispatch Platform

[![City: Bulawayo](https://img.shields.io/badge/City-Bulawayo%2C%20Zimbabwe-0D5C3A.svg)](https://citybyo.co.zw)
[![Platform: Web & Mobile](https://img.shields.io/badge/Platform-Web%20%7C%20Android%20%7C%20iOS-blue.svg)](#)
[![Backend: Node.js / Express](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-339933.svg)](https://nodejs.org)
[![Database: PostgreSQL / PostGIS](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-336791.svg)](https://postgis.net)
[![Frontend: React 19 / Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg)](https://react.dev)
[![Mobile: Flutter 3 / Dart](https://img.shields.io/badge/Mobile-Flutter%203%20%2F%20Dart-02569B.svg)](https://flutter.dev)
[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#)

---

## 📖 Executive Overview

**BCC SmartConnect** is the unified municipal digital transformation platform for the **City of Bulawayo (BCC)**. It bridges residents, emergency dispatchers, field maintenance crews, and city leadership through synchronized real-time web and mobile applications:

- 📱 **Citizen Mobile App (`mobile/`)**: Cross-platform Flutter application (Android, iOS, Web) allowing residents to report water leaks, sewer bursts, road potholes, and power failures with GPS geotagging, upload photographic evidence, view live water shedding & dam capacity updates from `citybyo.co.zw`, access emergency helplines, and browse official ward WhatsApp communities.
- 💻 **Municipal Staff & Dispatch Portal (`frontend/`)**: Modern React 19 + Vite dashboard with interactive Leaflet GIS mapping, real-time Socket.io incident feeds, department ticket triage (Water, Health, Roads, Fire), SLA response timers, field team allocation, broadcast civic alerts, and automated analytics.
- ⚙️ **Backend Microservice API (`backend/`)**: High-performance Node.js / Express REST API and Socket.io gateway backed by PostgreSQL with PostGIS spatial geometry for proximity searches, JWT role-based security, Multer file handling, and Firebase Cloud Messaging (FCM) push notifications.

---

## 🖥️ Applications & Software Required for First-Time Setup

To set up, run, and test all tiers of BCC SmartConnect locally, install the following software packages on your machine:

| Software / Tool | Minimum Version | Required For | Download & Installation Link |
| :--- | :--- | :--- | :--- |
| **Node.js & npm** | `v18.0.0+` (LTS recommended, e.g. `v20.x`) | Backend API & Frontend React Portal | [Download Node.js](https://nodejs.org/) |
| **Git** | `v2.30+` | Source code version control | [Download Git](https://git-scm.com/) |
| **Flutter SDK** | `v3.19+` (includes Dart 3.x) | Citizen Mobile App (`mobile/`) | [Download Flutter SDK](https://docs.flutter.dev/get-started/install) |
| **Android Studio** | Latest Stable | Android SDK, Build-Tools & Emulator | [Download Android Studio](https://developer.android.com/studio) |
| **PostgreSQL & PostGIS** | `PostgreSQL 14+` with `PostGIS 3.x` | Relational & Geospatial Database | [Neon Cloud (Instant/Free)](https://neon.tech/) or [PostgreSQL Local](https://www.postgresql.org/download/) |
| **Visual Studio Code** | Latest Stable | Recommended Code Editor | [Download VS Code](https://code.visualstudio.com/) |
| **Google Chrome / Edge** | Latest Stable | Web preview & Flutter Web testing | [Download Chrome](https://www.google.com/chrome/) |
| **Xcode** *(macOS only)* | `v15+` | iOS Simulator & iOS Mobile Builds | [Mac App Store](https://developer.apple.com/xcode/) |

### Recommended VS Code Extensions
- **Flutter** & **Dart** (`Dart-Code.flutter`, `Dart-Code.dart-code`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **PostgreSQL** (`ckolkman.vscode-postgres` or `mtxr.sqltools`)
- **DotENV** (`mikestead.dotenv`)

---

## 🔍 Pre-Flight Verification Check

Before starting setup, verify that your core developer tools are installed and present in your system `PATH`:

```bash
# Verify Node and npm
node -v
npm -v

# Verify Git
git --version

# Verify Flutter and Android toolchain
flutter doctor -v
```

> [!TIP]
> If `flutter doctor` indicates that Android licenses have not been accepted, run:
> ```bash
> flutter doctor --android-licenses
> ```
> and type `y` to accept each license.

---

## 📂 Project Architecture & Directory Structure

```text
BCC-Smart-Connect/
├── backend/                  # Node.js + Express REST API & WebSockets
│   ├── sql/                  # Base schemas & database migration scripts
│   │   ├── migrations/       # Incremental SQL migrations (001, 002, 003)
│   │   └── schema.sql        # Core database schema with PostGIS definitions
│   ├── src/
│   │   ├── config/           # Database pool (pg) & environment configurations
│   │   ├── middleware/       # JWT auth verification & role access control
│   │   ├── routes/           # REST endpoints (auth, incidents, bulletins, teams, whatsapp)
│   │   ├── scripts/          # Migration runner (runMigrations.js)
│   │   ├── services/         # FCM push notifications & scraper service
│   │   └── sockets/          # Socket.io real-time incident & dispatch hub
│   ├── uploads/              # Local upload directory for incident photos
│   ├── .env.example          # Backend environment variable template
│   └── package.json          # Backend dependencies and scripts
│
├── frontend/                 # Municipal Staff & Dispatcher Web Portal (React 19 + Vite)
│   ├── public/               # Static icons, favicons, and branding assets
│   ├── src/
│   │   ├── components/       # UI cards, modals, tables, and Leaflet map views
│   │   ├── services/         # REST API client & Socket.io listeners
│   │   ├── App.jsx           # Main portal layout, navigation & triage state
│   │   └── index.css         # Modern design tokens, utility classes & responsive styles
│   ├── .env.example          # Frontend environment variable template
│   ├── package.json          # Frontend dependencies and build scripts
│   └── vite.config.js        # Vite bundler configuration
│
├── mobile/                   # Citizen Mobile Application (Flutter / Dart)
│   ├── android/              # Native Android wrapper and manifest
│   ├── ios/                  # Native iOS wrapper and entitlements
│   ├── lib/
│   │   ├── constants/        # BCC corporate colors, typography, Bulawayo wards
│   │   ├── models/           # Data models (incident, bulletin, team)
│   │   ├── screens/          # Home, reporting, map, bulletins, WhatsApp directory
│   │   ├── services/         # REST client, offline storage (shared_preferences)
│   │   └── widgets/          # Reusable cards, progress bars, photo pickers
│   └── pubspec.yaml          # Flutter dependencies and assets
│
├── supabase/
│   └── schema.sql            # Supabase-compatible relational schema
├── netlify.toml              # Netlify continuous deployment config for frontend
├── render.yaml               # Render web service deployment spec for backend
└── README.md                 # Project documentation & first-time setup guide
```

---

## 🚀 Step-by-Step First-Time Setup

### Step 1: Database Setup (PostgreSQL + PostGIS)

BCC SmartConnect uses spatial columns (`GEOGRAPHY(Point, 4326)`) to calculate distances to nearest municipal depots and filter incidents by council ward boundaries.

#### Option A: Serverless Cloud Postgres (Recommended — Neon or Supabase)
1. Create a free PostgreSQL database at [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/).
2. Copy your PostgreSQL connection string (URI format):
   ```text
   postgresql://username:password@ep-sample-pool.region.neon.tech/bcc_smartconnect?sslmode=require
   ```
3. Neon and Supabase come with `postgis` pre-installed.

#### Option B: Local PostgreSQL Installation
1. Start your local PostgreSQL server (default port `5432`).
2. Open `psql` or pgAdmin and create the database:
   ```sql
   CREATE DATABASE bcc_smartconnect;
   \c bcc_smartconnect;
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

---

### Step 2: Backend API Setup

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install all Node.js dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file from the template:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

4. Open `backend/.env` and configure your settings:
   ```ini
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/bcc_smartconnect
   JWT_SECRET=replace_with_a_secure_random_string_32_chars_minimum
   JWT_REFRESH_SECRET=replace_with_another_secure_random_string
   ADMIN_ORIGIN=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:19006,http://localhost:3000
   NODE_ENV=development
   # Optional: paste Firebase service account JSON string if testing FCM push notifications
   FIREBASE_SERVICE_ACCOUNT=
   ```

5. Initialize the database schema and apply all migrations:
   ```bash
   # First apply base schema
   # If using psql:
   psql -d bcc_smartconnect -f sql/schema.sql

   # Run automated incremental migrations (adds WhatsApp channels, timeline notes, reporter info)
   node src/scripts/runMigrations.js
   ```

6. Start the backend development server with hot-reloading:
   ```bash
   npm run dev
   ```

7. Verify the backend is running:
   Open `http://localhost:3000/api/teams` or `http://localhost:3000/api/whatsapp/channels` in your browser. You should receive a valid JSON response.

---

### Step 3: Frontend Staff Portal Setup (React 19 + Vite)

1. Open a new terminal tab/window and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Create the frontend environment file:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

4. Verify that `frontend/.env` points to your backend:
   ```ini
   VITE_API_URL=http://localhost:3000
   ```

5. Launch the Vite development server:
   ```bash
   npm run dev
   ```

6. Open your browser at **`http://localhost:5173`**.
   You will see the City of Bulawayo Unified Municipal Staff & Dispatcher portal with live interactive incident maps, emergency triage cards, field crew status, and water update feeds.

---

### Step 4: Citizen Mobile App Setup (Flutter)

The mobile application allows citizens to log incidents with GPS coordinates and images, view daily water supply shedding statuses, and join official Bulawayo Ward WhatsApp groups.

1. Open a new terminal tab/window and navigate to `mobile`:
   ```bash
   cd mobile
   ```

2. Ensure your Flutter environment is ready:
   ```bash
   flutter doctor
   ```

3. Install the Flutter and Dart dependencies:
   ```bash
   flutter pub get
   ```

4. Connect a device or launch an emulator:
   - **Android Emulator**: Start an Android Virtual Device from Android Studio Device Manager.
   - **Physical Device**: Connect an Android or iPhone via USB and enable Developer Options / USB Debugging.
   - **Chrome Web**: Ensure Google Chrome is installed.

5. Run the mobile app:

   #### A. Running on Android Emulator:
   > [!IMPORTANT]
   > Android emulators run inside a virtual network where `localhost` points to the emulator itself. To connect to the Express backend running on your host computer, point to `http://10.0.2.2:3000/api`:
   ```bash
   flutter run --dart-define=BCC_API_URL=http://10.0.2.2:3000/api
   ```

   #### B. Running in Chrome (Web):
   ```bash
   flutter run -d chrome --dart-define=BCC_API_URL=http://localhost:3000/api
   ```

   #### C. Running on Physical Device (Over Wi-Fi / LAN):
   Ensure your phone and computer are on the same Wi-Fi network:
   ```bash
   flutter run --dart-define=BCC_API_URL=http://<YOUR_COMPUTER_LOCAL_IP>:3000/api
   ```

   #### D. Default Cloud Mode:
   If no `--dart-define` flag is supplied, the app automatically connects to the live production cloud backend (`https://bcc-smart-connect.onrender.com/api`).

---

## 👥 User Roles & Access Control

The system supports four distinct user roles:

| Role | Permissions & Capabilities |
| :--- | :--- |
| **`Resident`** | Submit faults, track reported incidents, view public bulletins, browse ward WhatsApp channels. |
| **`Dispatcher`** | Triage new incidents, assign field maintenance crews, update incident statuses, view real-time GIS map. |
| **`Communications`** | Publish municipal bulletins, water shedding updates, and broadcast emergency alerts to residents. |
| **`Administrator`** | Full municipal oversight, manage staff accounts, adjust departmental assignments, audit logs. |

### Creating a Staff Account
1. You can register a user account directly via the API or mobile/web login modal:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"first_name":"BCC","last_name":"Dispatcher","email":"dispatcher@citybyo.co.zw","password":"StrongPassword123"}'
   ```
2. Promote the user in PostgreSQL:
   ```sql
   UPDATE users SET role = 'Dispatcher' WHERE email = 'dispatcher@citybyo.co.zw';
   ```

---

## 🛠️ Common Development Commands

### Root Workspace Commands
```bash
# Install backend dependencies from root
npm run build

# Start backend from root
npm run start
```

### Backend (`/backend`)
```bash
npm run dev      # Start backend with nodemon hot-reloading (Port 3000)
npm run start    # Start production backend server
node src/scripts/runMigrations.js # Run database migrations
```

### Frontend (`/frontend`)
```bash
npm run dev      # Start Vite dev server (Port 5173)
npm run build    # Compile minified production bundle in dist/
npm run preview  # Preview production build locally
npm run lint     # Run fast Oxlint static analysis
```

### Mobile (`/mobile`)
```bash
flutter pub get             # Download dependencies
flutter analyze             # Run static code analysis
flutter test                # Run widget & unit tests
flutter run                 # Launch app on default device/emulator
flutter build apk --release # Build release Android APK
flutter build web           # Build production web bundle
```

---

## 🌐 Production Cloud Deployment

### 1. Backend (Render)
The repository includes a [render.yaml](file:///c:/Users/brian/Videos/Programming%20Projects/BCC-Smart-Connect/render.yaml) specification:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `DATABASE_URL`: Connection string to your cloud Neon / Supabase instance.
  - `ALLOWED_ORIGINS`: `https://bccsmartconnect.netlify.app`
  - `JWT_SECRET` & `JWT_REFRESH_SECRET`: Random 32+ char secrets.

### 2. Frontend (Netlify)
The repository includes a [netlify.toml](file:///c:/Users/brian/Videos/Programming%20Projects/BCC-Smart-Connect/netlify.toml) configuration:
- **Base Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Redirects**: Single Page Application SPA fallback to `/index.html`.
- **Environment Variable**: `VITE_API_URL=https://bcc-smartconnect-api.onrender.com`

---

## ❓ Troubleshooting & FAQs

### 1. `PostGIS extension not found`
- **Cause**: The PostgreSQL instance does not have PostGIS binaries installed.
- **Fix**: If using local PostgreSQL on Windows, run the **StackBuilder** utility and check **Spatial Extensions -> PostGIS**. Alternatively, use **Neon** ([neon.tech](https://neon.tech/)) where PostGIS is enabled out-of-the-box.

### 2. `Network error / Connection refused` on Android Emulator
- **Cause**: Trying to reach `http://localhost:3000` from inside an Android emulator.
- **Fix**: Always run the Flutter app with `--dart-define=BCC_API_URL=http://10.0.2.2:3000/api`.

### 3. `CORS error` when calling API from Frontend
- **Cause**: Origin not permitted in backend `ALLOWED_ORIGINS`.
- **Fix**: Check `backend/.env` and ensure `ALLOWED_ORIGINS` contains `http://localhost:5173`.

### 4. `Android SDK / Licenses Error`
- **Fix**: Run `flutter doctor --android-licenses` in terminal and accept all prompts (`y`).

---

## 📄 License & Maintainer

Maintained and developed for the **City of Bulawayo Municipal Digital Services Initiative**.  
All rights reserved.

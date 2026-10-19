# Amplora

> **Tagline**: Good messages. Greater reach.

A premium, trustworthy mobile application and backend API that enables communities to fund the **advertising distribution of fact-checked messages** directly to targeted audiences outside existing echo chambers.

> **Core Philosophy**: Unlike traditional charities where direct donations fund internal operational overhead, Amplora pools community micro-pledges specifically to pay for cross-network advertising placements (search intent ads, social feeds, and geofenced local news corridors) anchored by verified sources.
>
> **Reach Benchmark**: An illustrative **$100 funds ≈ 2,703 targeted ad views** outside existing networks (~$37 CPM benchmark).

---

## 🏗️ Architecture & Technology Stack

The platform is designed as an enterprise-grade mobile application backed by an Express REST API with strict database-backed state transitions and official Google Gemini AI integration.

```
Campaign/
├── apps/
│   ├── mobile/                    # React Native (Expo SDK 58, Expo Router v5)
│   │   ├── app/                   # File-based routing & screen architecture
│   │   │   ├── (tabs)/            # 5 Core Bottom Tabs
│   │   │   │   ├── index.tsx      # Home (Brand, Hero Reach Formula, Featured Cards, Dynamic Avatar)
│   │   │   │   ├── explore.tsx    # Explore (Search, Unclipped Horizontal Categories, Sort)
│   │   │   │   ├── create.tsx     # Create (Manual & AI-assisted Wizard, Drafts)
│   │   │   │   ├── activity.tsx   # Activity Center (Notifications, Receipts, Read-state)
│   │   │   │   └── profile.tsx    # Authenticated Profile, Avatar Management & RBAC Console
│   │   │   ├── campaign/[id].tsx  # Campaign Details (Story, Sources, Breakdown, Follow)
│   │   │   ├── campaign/contribute.tsx # Simulated USD Contribution & Idempotent Checkout
│   │   │   ├── campaign/[id]/analytics.tsx # Live Campaign Funding & Delivery Analytics (USD)
│   │   │   ├── campaign/[id]/report.tsx    # Audited Delivery & Financial Reconciliation Report
│   │   │   ├── creator/dashboard.tsx       # Creator Command Center (Drafts, Lifecycle, Metrics)
│   │   │   ├── review/queue.tsx            # Protected Reviewer Console (Queue & Filter)
│   │   │   └── review/[id].tsx             # Reviewer Inspection (Approve, Request Changes, Reject)
│   │   ├── components/
│   │   │   ├── ai/                # Reusable Gemini AI (GeminiButton, GeminiAssistModal)
│   │   │   ├── create/            # 5 Creation Steps with Gemini AI Assist & Thumbnail Studio
│   │   │   └── ui/                # ScreenContainer, Avatar, EmptyState, Buttons
│   │   ├── services/
│   │   │   ├── authContext.tsx    # SecureStore session persistence & profile synchronization
│   │   │   ├── apiClient.ts       # Type-safe API client (Auth, AI, Campaigns, Review, Profile)
│   │   │   └── campaignStore.ts   # Client-side cache and saved bookmarks
│   │   ├── theme/                 # Design Tokens (Blue & White palette, Typography, Radii, Spacing)
│   │   ├── eas.json               # Android APK & internal build profiles
│   │   └── app.json               # Package identity (org.campaignamplification.app)
│   │
│   └── api/                       # Express Node.js & TypeScript Backend Service
│       ├── prisma/                # Prisma schema (PostgreSQL datasource & migrations)
│       ├── src/
│       │   ├── routes/            # Auth, AI, Campaigns, Drafts, Review, Activity routes
│       │   ├── services/          # ai.service.ts (Gemini & Imagen 3), dbStore, distributionGate
│       │   ├── middleware/        # Bearer Auth, Rate Limiter, Error Handler
│       │   ├── lib/               # State machine, reach calculator, SSRF URL validator
│       │   └── __tests__/         # 54 Integration tests (businessRules.test.ts, authAndAi.test.ts)
│       └── render.yaml            # Cloud deployment blueprint (Render Web Service)
```

### Technology Matrix
- **Mobile Client**: React Native 0.86, Expo SDK 58, TypeScript, Expo Router v5, Expo SecureStore.
- **Backend API**: Node.js, Express, TypeScript, Zod Schema Validation, Helmet, CORS, bcryptjs, jsonwebtoken.
- **Artificial Intelligence**: Official `@google/genai` SDK with Gemini 2.0 Flash, Imagen 3, and resilient heuristic fallback engine.
- **Database**: PostgreSQL with Prisma ORM (and in-memory transactional fallback for offline zero-config development).
- **Testing**: Node TAP test runner with 54 automated integration tests.
- **Android Target**: Android SDK 34+ compatible, EAS Build APK profile (`org.campaignamplification.app`).

---

## 🎨 Visual Identity — Professional Blue-and-White Theme

The application features a modern, clean, mobile-first blue-and-white theme:

| Token | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| **Primary Blue** | `#2563EB` | Primary buttons, active tabs, progress bars, accents, and key interactive controls |
| **Dark Blue** | `#1D4ED8` | Pressed states, headers, emphasis, and authoritative indicators |
| **Primary Surface** | `#EFF6FF` | Soft pale blue background tint for badges, chips, and hero containers |
| **Background** | `#F8FAFC` | Crisp slate-tinted off-white screen canvas |
| **Surface / Cards** | `#FFFFFF` | Card backgrounds with subtle slate borders and soft shadows |
| **Main Text** | `#0F172A` | High-contrast near-black slate typography |
| **Secondary Text** | `#64748B` | Slate secondary labels and descriptions |
| **Border Subtle** | `#E2E8F0` | Clean dividers and card outlines |
| **Success** | `#16A34A` | Accessible green for approved states and funded targets |
| **Warning / Error** | `#D97706` / `#DC2626` | Accessible amber and red for alerts and form errors |

---

## 👤 Connected User Profile & Dynamic Header Avatar

The user avatar in the Home page header and throughout the app is directly bound to the authenticated user's profile:

1. **Connected Home Header Avatar**: The header displays the authenticated user's `avatarUrl`. Tapping the avatar immediately navigates to `/(tabs)/profile`.
2. **Initials Fallback**: If the user has no avatar or the image URL fails to load, the `Avatar` component gracefully renders the user's uppercase initials over a primary blue background.
3. **Guest State**: When signed out, an intuitive guest icon is shown with an invitation to sign in.
4. **Profile Editing & Instant Sync**: Users can edit their display name, bio, and profile photo (custom photo URL, verified editorial presets, or initials-only) directly via `PATCH /api/auth/profile`. Updates immediately propagate across the Home header, Profile screen, and authored campaigns via `AuthContext`.
5. **Seeded Test Profiles**: Every pre-seeded demo user (Admin, Reviewer, Creator Elena, Backer Alex) has a unique, high-resolution portrait.

---

## 💵 USD Currency Standardization ($)

All financial presentations and campaign calculations are standardized on **USD ($)**:

1. **Shared Currency Formatter**: Uses `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` throughout `reachCalculator.ts` and UI components.
2. **Preset Pledge Amounts**: Formatted in USD: `$25`, `$50`, `$100`, `$250`, `$500`.
3. **Media Allocation Model**: Preserves the 95% media distribution and 5% platform fee structure in numeric integer minor units (cents), preventing floating-point drift.
4. **Industry Benchmark**: Reach estimates are based on a verified **$37 CPM benchmark** ($0.037 per impression) for public-interest search and feed ad inventory.

---

## 🤖 Google Gemini AI & AI Campaign Thumbnail Generation

The platform provides end-to-end AI assistance powered by `@google/genai`:

> **Critical Security Rule**: The Gemini API key (`GEMINI_API_KEY`) is stored **strictly server-side** in `apps/api/.env`. It is never embedded in client code, Expo public bundles, or public repositories.

### AI Campaign Thumbnail Studio (Stage 3: Campaign & Ad Visuals)

In Stage 3 of the Campaign Creation Wizard, creators have access to a dedicated AI Thumbnail Studio:
- **Context-Aware Prompt Synthesis**: Gemini reads the campaign title, category, summary, target audience, and objective to draft a vivid 16:9 photographic prompt.
- **Visual Style Selection**: Creators can choose from 5 curated styles:
  - `Editorial Documentary`
  - `High-Impact Civic`
  - `Photojournalistic`
  - `Modern Minimalist`
  - `Clean Diagram/Blueprint`
- **Custom Direction**: Optional input field for specific scene instructions (e.g., lighting, focal subjects, emotional tone).
- **Imagen 3 & Resilient Fallback**: The backend attempts direct image generation with Google Imagen 3 (`imagen-3.0-generate-002`). If the API key tier does not support image generation or quotas are limited, it synthesizes the visual direction and pairs it with a verified category-matched editorial photograph without failing.
- **Interactive Review & Lifecycle**:
  - `Accept Thumbnail`: Attaches the image to `draft.coverImage` and saves it immediately to persistent draft storage.
  - `Regenerate`: Re-runs generation with updated instructions.
  - `Upload Photo Instead`: Opens the native device image picker.
  - `Remove / Clear`: Discards the generated thumbnail.
- **Persistence**: Accepted thumbnails are saved to backend draft storage (`PATCH /api/drafts/:id`), restored when resuming the draft, and displayed on discovery cards, campaign details, and reviewer dossiers.

---

## 🔐 Role Architecture: Exactly Two Roles (`ADMIN` and `CREATOR`)

The platform implements a strict role-based access control (RBAC) model with **exactly two application roles**:

- **`ADMIN`**:
  - Securely provisioned exclusively via the idempotent database seed script (`prisma/seed.ts`).
  - Accesses the protected **Admin Review Dashboard** (`/review/queue` and `/review/[id]`).
  - Inspects all five campaign creation stages (Story, Primary Sources/Evidence, Visuals, Reach & Budget, Submit).
  - Authors review decisions: **Approve** (advances campaign to `APPROVED`), **Request Changes** (requires feedback ≥ 5 characters, transitions to `CHANGES_REQUESTED`), or **Reject** (requires rejection reason ≥ 5 characters, transitions to `REJECTED`).
  - Governs distribution authorization gates and financial reconciliations.
  - Prohibited from reviewing or approving their own authored campaigns (self-review prevention).

- **`CREATOR`**:
  - Standard user registration (`/api/auth/register`) strictly and unconditionally assigns `CREATOR`.
  - Self-promotion to `ADMIN` is strictly blocked at the schema and route layers.
  - Can author drafts, use Gemini AI assistance, record voice memos, save/resume drafts, and complete all 5 creation steps.
  - Submits campaigns for administrator review (`SUBMITTED_FOR_REVIEW`).
  - Reads administrator moderation feedback, updates story or evidence citations, and resubmits (`CHANGES_REQUESTED` → `SUBMITTED_FOR_REVIEW`).
  - Publishes approved campaigns to public community funding (`APPROVED` → `AVAILABLE_FOR_FUNDING`).
  - Inspects live ad delivery telemetry, backer contributions, receipts, and audience reach analytics.

> **Zero Obsolete Roles**: `JUDGE`, `REVIEWER`, and `BACKER` have been completely removed from schema enums, API middleware, and mobile UI. Review history and audit logs from prior reviewer accounts are safely migrated to `ADMIN` without data loss.

---

## ⚙️ Environment Configuration & Administrator Provisioning

### Required Environment Variables (`apps/api/.env`)

```env
# Server Port & Mode
PORT=4000
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campaigns?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/campaigns?schema=public"

# CORS & JWT Secret
CLIENT_ORIGIN="*"
AUTH_SECRET="dev-super-secret-key-campaign-amplification-2026"

# Google Gemini AI Key (Server-Side Only)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyGoesHere"

# Initial Administrator Credentials (Required for Seeding)
ADMIN_EMAIL="admin@campaign.com"
ADMIN_PASSWORD="AdminSecurePassword2026!"
```

### Initial Administrator Provisioning Command
The initial platform administrator account is provisioned idempotently using the Prisma seed script:

```bash
# Provision or safely update administrator from apps/api
npm run prisma:seed
```

**Seed Script Security Highlights (`apps/api/prisma/seed.ts`)**:
1. Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment variables.
2. Validates email format and requires a minimum 8-character password.
3. Hashes the password using `bcryptjs` with salt factor 10. Plaintext passwords are never stored or logged.
4. Uses `prisma.user.upsert` to update or verify the administrator safely without creating duplicate accounts.
5. In production mode, seeding requires `ALLOW_PRODUCTION_SEED=true`.

### Mobile App (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 🚀 Setup & Execution Instructions

### 1. Install Dependencies
```bash
# From repository root
npm install
```

### 2. Apply Database Migration & Seed Administrator
```bash
cd apps/api
# Generate Prisma client
npx prisma generate

# Apply two-role safe migration to PostgreSQL
npx prisma migrate deploy

# Provision the initial administrator account
npm run prisma:seed
```

### 3. Start the Backend API
```bash
npm run api
# Live on http://localhost:4000/api
# Healthcheck: http://localhost:4000/api/health
```

### 4. Start the Mobile Client
```bash
npm run mobile
# Press 'a' for Android emulator, 'w' for Web preview, or scan QR with Expo Go
```

### 5. Run Automated Tests
```bash
# Run complete test suites (business rules, RBAC, two-role enforcement, AI)
npm test --prefix apps/api

# Typecheck both workspaces
npx tsc --noEmit --project apps/api
npx tsc --noEmit --project apps/mobile
```

---

## 🧪 Automated Testing & Verification

The test suite runs 54 automated integration tests across 14 test suites with **100% pass rate**:

1. **Campaign Lifecycle State Machine**: Enforces legal transitions: `DRAFT` → `SUBMITTED_FOR_REVIEW` → `APPROVED` → `AVAILABLE_FOR_FUNDING` → `PROMOTING` → `COMPLETED`.
2. **SSRF & Security Guards**: Blocks illegal URLs and internal loopback attempts in supporting source links.
3. **Self-Review Prevention**: Creators are forbidden from reviewing or approving their own submissions.
4. **Idempotent Checkout**: Multi-step payment state machine with simulated receipts (`REC-...`).
5. **Authentication & RBAC**: Tests registration, bcrypt hash verification, duplicate prevention, and JWT Bearer validation.
6. **Gemini AI Endpoints**: Tests all endpoints (`/api/ai/basics`, `/api/ai/story`, `/api/ai/visuals`, `/api/ai/thumbnail`, `/api/ai/reach`, `/api/ai/review`) with schema validation and resilient fallbacks.

---

## 📱 Generating Standalone Android APK

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Navigate to `apps/mobile`: `cd apps/mobile`
4. Build APK: `eas build -p android --profile preview`
5. Download the `.apk` from the provided Expo build URL and install on any Android device.

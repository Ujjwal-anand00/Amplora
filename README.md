# Campaigns — Mobile-First Campaign Amplification Platform

A premium, trustworthy mobile-first application that enables communities to fund the **advertising distribution of fact-checked messages** directly to targeted audiences outside existing echo chambers.

> **Core Philosophy**: Unlike traditional non-profits where direct donations fund operational overhead, campaign amplification pools community micro-pledges specifically to pay for cross-network advertising placements (Meta Ads, Google Search, Local News Outlets, Geo-fenced mobile corridors) certified under the Universal Trust Standard (UUTS).
> 
> **Reach Benchmark**: **$1 ≈ 27 people reached** outside existing networks (~$37 CPM).

---

## 🏗️ Repository Architecture

This repository is organized as a modular workspace:

```text
Campaign/
├── apps/
│   ├── mobile/                    # React Native Expo Mobile Application
│   │   ├── app/                   # Expo Router file-based navigation
│   │   │   ├── (tabs)/            # 5 Persistent Bottom Tabs
│   │   │   │   ├── index.tsx      # Home (Brand header, Editorial Hero, Reach formula, Featured cards)
│   │   │   │   ├── explore.tsx    # Explore (Search, Category chips, Sort pills, Campaign feed)
│   │   │   │   ├── create.tsx     # Create (Manual workflow, Voice outline prototype, Saved drafts)
│   │   │   │   ├── activity.tsx   # Activity (Live pulse bar, Audited receipts empty state)
│   │   │   │   └── profile.tsx    # Profile (Backer impact, UUTS level, Account controls)
│   │   │   ├── campaign/[id].tsx  # Campaign Detail (Target audience, Ad channels, Pledging modal)
│   │   │   ├── create/manual.tsx  # Campaign Creation wizard (React Hook Form + Zod validation)
│   │   │   └── _layout.tsx        # Stack layout with TanStack Query provider
│   │   ├── components/
│   │   │   ├── ui/                # Button, IconButton, ScreenContainer, SectionHeader,
│   │   │   │                      # ProgressBar, Avatar, SearchInput, EmptyState, LoadingState, ErrorState
│   │   │   └── campaigns/         # CampaignCard (Reach pill, UUTS trust badge, funding progress)
│   │   ├── theme/                 # Centralized Design Tokens (colors, typography, spacing, radii, shadows)
│   │   ├── types/                 # Domain models (Campaign, PlatformMetrics, CampaignDraft)
│   │   └── services/              # Resilient API client & offline-ready fallback store
│   │
│   └── api/                       # Node.js Express & TypeScript Backend Service
│       ├── prisma/                # Prisma schema (PostgreSQL datasource, Campaign & Contribution models)
│       └── src/
│           ├── schemas/           # Zod validation schemas
│           ├── services/          # Business logic & reach calculations
│           ├── controllers/       # HTTP request handlers
│           ├── routes/            # REST endpoints (/api/campaigns, /api/campaigns/:id/back, /api/metrics)
│           ├── middleware/        # Centralized Zod & error translation
│           └── server.ts          # Express server entry point
│
├── package.json                   # Root workspace scripts
└── .gitignore
```

---

## 🎨 Visual Identity & Design System

The application strictly implements the design specifications for public-interest trust and high readability:

- **Warm Off-White Background**: `#F8F7F3`
- **Deep Forest Green (Primary)**: `#174D3A`
- **Near-Black Primary Text**: `#20231F`
- **Muted Secondary Text**: `#777B73`
- **Restrained Lime Accent**: `#C8F169`
- **Light Tint Badge Background**: `#EBF4F0`
- **Subtle Warm Borders**: `#ECE9E2`
- **Touch Target Compliance**: Minimum 44pt accessible touch targets across buttons, chips, and controls.
- **Spacing Scale**: Consistent 4-point spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48).

---

## 🚀 Quickstart Commands

### 1. Starting the Mobile Application

To run the mobile app on Android (via Expo Go or Emulator):
```bash
# From workspace root:
npm run mobile:android

# Or directly in apps/mobile:
cd apps/mobile
npm run android
```

To run the mobile app with Metro bundler (press `a` for Android, `w` for Web, or scan QR code):
```bash
npm run mobile
```

To view in web browser immediately:
```bash
npm run mobile:web
```

### 2. Starting the Backend API

To run the Express TypeScript API in development mode:
```bash
# From workspace root:
npm run api

# Or directly in apps/api:
cd apps/api
npm run dev
```

The API runs on `http://localhost:4000`:
- Health check: `http://localhost:4000/api/health`
- Campaigns list & filters: `http://localhost:4000/api/campaigns`
- Platform metrics: `http://localhost:4000/api/campaigns/metrics`
- Back a campaign: `POST http://localhost:4000/api/campaigns/:id/back`

---

## 🧪 Validation & Health Status

| Component | Check | Status |
| :--- | :--- | :--- |
| `apps/mobile` | TypeScript Typecheck (`npx tsc --noEmit`) | **Passed (0 errors)** |
| `apps/mobile` | Expo Public Config (`npx expo config`) | **SDK 58.0.0 Verified** |
| `apps/mobile` | Full Bundle Export (`npx expo export --platform web`) | **Exported 16 bundles cleanly** |
| `apps/api` | TypeScript Compile (`npm run build`) | **Passed (0 errors)** |
| `apps/api` | Healthcheck & Endpoints (`GET /api/health`, `/api/campaigns`) | **HTTP 200 OK** |

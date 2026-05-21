# FMPS Marketing & Trade Show Coordination Tool

## Project Overview

A browser-based coordination tool that replaces the "FMPS Marketing & Tradeshows" Excel workbook with a real-time, multi-user web application hosted on SharePoint. Anyone with the link can view and edit events, reserve resources, and track team travel — all changes sync instantly for every user.

---

## Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + TypeScript | Modern SPA with rich UI components |
| **UI Framework** | Fluent UI (Microsoft) | Native SharePoint look & feel |
| **Data/Backend** | SharePoint Lists via Microsoft Graph API | Zero infrastructure — built-in multi-user sync, versioning, permissions |
| **Auth** | MSAL.js (Microsoft Authentication Library) | Seamless SSO with existing Microsoft 365 credentials |
| **Packaging** | SharePoint Framework (SPFx) Web Part | Deploys directly to SharePoint App Catalog |
| **Build** | Vite + SPFx Toolchain | Fast dev experience with production SPFx packaging |

### Why This Stack?

1. **No additional servers** — SharePoint Lists ARE the database
2. **Automatic multi-user sync** — SharePoint handles concurrency and versioning
3. **Permission management** — Leverages existing SharePoint/M365 permissions
4. **Simple deployment** — Upload .sppkg to App Catalog, add web part to a page, share URL
5. **Offline capability** — SharePoint Lists support offline sync via Graph API

---

## Features (mapped from Excel workbook)

### 1. Event Calendar & Scheduling (Primary View)
**Source: Trade Show - Roadshow 25 sheet**

- Interactive calendar view (month/quarter/year) with event cards
- Color-coded status indicators (Done, Displaying, Walking, Vacation, Placeholder)
- Filterable/sortable event table with all columns:
  - Event Type, Event Name, Theater/Region
  - Tradeshow Owner, BU Owner, FMP Team Members
  - Display Type, Status
  - Speaker Opportunity Deadline
  - Monthly date placement (Jan–Dec)
  - Budget, Support, Show Start Date
  - Graphics deadline (auto-calculated 8 weeks prior)
  - Display equipment, Who is traveling
  - Leads Data capture, Show Notes
- Drag-and-drop rescheduling
- Conflict detection (team member double-booked)

### 2. Resource & Asset Management
**Source: Trade-show Assets, Roadshow Assets, TSE DEMO Units sheets**

- Asset inventory with part numbers and quantities
- Real-time availability checking (asset booked for overlapping dates = unavailable)
- Reservation system: assign assets to events
- Categories:
  - Mobile Demos, Full Demos, Rack Displays
  - Pelican Boxes, Banners, Kiosks, Backdrops
  - Components (PXTC1ARA, PXU1AJANNNXX, PXTM1AF, PXR1AJD, etc.)
- Visual availability timeline per asset

### 3. Team Travel Tracker
**Source: "Who is traveling?" column + team member lists**

- Per-person travel calendar showing all assigned events
- Travel conflict alerts
- Workload balance view (trips per person per quarter)
- PTO/Vacation blocking (prevents scheduling during time off)

### 4. Thought Leadership & Speaking Tracker
**Source: Thought Leadership sheet**

- Track submissions, deadlines, and approvals
- Fields: Event/Publication, Submission Deadline, Date/Time, Title
- Speaker/Author assignment, Target Audience, Learning Objectives
- Abstract content, Media links, Speaker Bios
- Deadline reminders and status workflow

### 5. Booth & Display Configuration
**Source: Dropdown Lists for Shows, Trade Show Style and Sizes**

- Booth size catalog with visual representations
- Property/equipment checklist per booth type
- Auto-suggest equipment based on booth size selection
- Booth property options: Demo kits, Racks, Towers, Backdrops, Kiosks, Bannerstands

### 6. Monthly Sales Meetings Reference
**Source: Monthly Sales Meetings sheet**

- Read-only reference panel showing recurring meeting schedule
- Regional groups with contacts and cadence
- Quick link to meeting invites

### 7. Dropdown/Reference Data Management
**Source: Dropdown Lists for Shows sheet**

- Admin panel to manage all picklist values:
  - Event Types (Trade Show, Partner Kickoff, Local Event, Webinar, PEC Event, etc.)
  - Booth Sizes (10x10 through 30x30, Innovation Area, etc.)
  - Booth Property Needed (full equipment catalog)
  - Team Members, Event Owners, BU/Corp Owners
  - Theater/Region (NA, LATAM, EMEA, APAC)
- Changes propagate immediately to all forms

---

## SharePoint List Schema (Data Model)

### List: Events
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Event Name |
| EventType | Choice | From dropdown list |
| Theater | Choice | NA, LATAM, EMEA, APAC |
| TradeshowOwner | Person | SharePoint user lookup |
| BUOwner | Choice | ENT-BU, Ventures, Broadband, etc. |
| TeamMembers | Person (multi) | Multiple team members |
| DisplayType | Choice | From booth property list |
| Status | Choice | Confirmed, Placeholder, Cancelled, Done |
| SpeakerDeadline | Date | Submission deadline |
| StartDate | Date | Event start |
| EndDate | Date | Event end |
| GraphicsDeadline | Date | Calculated: StartDate - 56 days |
| Budget | Currency | Event budget |
| Support | Single line | Support details |
| TravelDetails | Multi-line | Who is traveling + logistics |
| LeadsData | Multi-line | Post-show leads info |
| ShowNotes | Multi-line | General notes |
| Year | Number | Event year |
| BoothSize | Choice | 10x10, 10x20, etc. |

### List: Assets
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Asset name/description |
| PartNumber | Single line | e.g., PXTC1ARA |
| Category | Choice | Mobile Demo, Rack Display, Banner, etc. |
| TotalQuantity | Number | Total available |
| Location | Single line | Current storage location |
| Notes | Multi-line | Condition, details |

### List: AssetReservations
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Auto: Asset + Event name |
| Asset | Lookup | → Assets list |
| Event | Lookup | → Events list |
| Quantity | Number | Units reserved |
| StartDate | Date | Pickup/ship date |
| EndDate | Date | Return date |
| ReservedBy | Person | Who made the reservation |
| Status | Choice | Reserved, Checked Out, Returned |

### List: ThoughtLeadership
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Event/Publication name |
| SubmissionDeadline | Date | |
| EventDateTime | DateTime | |
| PresentationTitle | Single line | |
| Speakers | Person (multi) | |
| TargetAudience | Multi-line | |
| LearningObjectives | Multi-line | |
| Abstract | Multi-line (rich) | |
| MediaLink | Hyperlink | |
| SpeakerBios | Multi-line (rich) | |
| Status | Choice | Draft, Submitted, Approved, Presented |

### List: DropdownConfig
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Option value |
| Category | Choice | EventType, BoothSize, BoothProperty, Region, BUOwner |
| SortOrder | Number | Display ordering |
| IsActive | Yes/No | Soft delete |

### List: TeamMembers
| Column | Type | Notes |
|--------|------|-------|
| Title | Single line | Display name |
| Email | Single line | M365 email |
| Role | Choice | TSE, Manager, Admin |
| IsActive | Yes/No | Currently on team |

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  FMPS Marketing & Trade Show Coordination Tool    [User] ▼  │
├──────┬──────────────────────────────────────────────────────┤
│ NAV  │                                                      │
│      │  ┌─── Dashboard ────────────────────────────────┐   │
│ 📅   │  │  Calendar View (Month/Quarter)               │   │
│ Cal  │  │  ┌───┬───┬───┬───┬───┬───┬───┐             │   │
│      │  │  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│             │   │
│ 📋   │  │  ├───┴───┴───┴───┴───┴───┴───┤             │   │
│ List │  │  │  [Event Cards with color]   │             │   │
│      │  │  └─────────────────────────────┘             │   │
│ 📦   │  │                                              │   │
│ Assets│  │  Quick Stats: 5 upcoming | 2 conflicts      │   │
│      │  └──────────────────────────────────────────────┘   │
│ 🎤   │                                                      │
│ TL   │  ┌─── Event Table (filterable) ─────────────────┐   │
│      │  │  [Search] [Filter: Type ▼] [Status ▼] [+New] │   │
│ 👥   │  │  ┌────────────────────────────────────────┐  │   │
│ Team │  │  │ Type │ Name │ Date │ Team │ Status │    │  │   │
│      │  │  ├────────────────────────────────────────┤  │   │
│ ⚙️   │  │  │ ...  │ ...  │ ...  │ ...  │ ...    │    │  │   │
│ Admin│  │  └────────────────────────────────────────┘  │   │
│      │  └──────────────────────────────────────────────┘   │
└──────┴──────────────────────────────────────────────────────┘
```

---

## Deployment Strategy

### Phase 1: Development (Local)
1. Develop React SPA with mock data
2. Test all CRUD operations and UI flows

### Phase 2: SharePoint Integration
1. Create SharePoint Lists on target site
2. Register Azure AD App for Graph API access
3. Connect frontend to SharePoint Lists via Graph API
4. Test with real data

### Phase 3: SPFx Packaging & Deployment
1. Wrap React app in SPFx web part
2. Build .sppkg package
3. Upload to SharePoint App Catalog (tenant or site-level)
4. Add web part to a SharePoint page
5. Share page URL — done!

### Alternative Deployment (if SPFx is not available):
- Deploy React SPA to Azure Static Web Apps (free tier)
- Connect to SharePoint Lists via Graph API with MSAL auth
- Share the Azure URL internally

---

## Publishing Recommendation

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **SharePoint App Catalog (SPFx)** | Native, no extra hosting, SSO | Requires admin approval for catalog | ✅ **Primary** |
| **Azure Static Web Apps** | Free tier, CI/CD from GitHub | Separate URL, needs MSAL config | Backup option |
| **GitHub Pages + Graph API** | Free, simple | Auth complexity, public URL | Not recommended for internal |

**Recommended**: Deploy as SPFx web part to SharePoint App Catalog → Add to a SharePoint page → Share the page URL.

---

## File Structure

```
Travel Coordination Tool/
├── .github/
│   └── workflows/
│       └── build.yml              # CI/CD pipeline
├── src/
│   ├── components/
│   │   ├── Calendar/
│   │   │   ├── CalendarView.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── MonthGrid.tsx
│   │   ├── Events/
│   │   │   ├── EventTable.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventDetail.tsx
│   │   │   └── EventFilters.tsx
│   │   ├── Assets/
│   │   │   ├── AssetInventory.tsx
│   │   │   ├── AssetReservation.tsx
│   │   │   └── AvailabilityTimeline.tsx
│   │   ├── ThoughtLeadership/
│   │   │   ├── TLTable.tsx
│   │   │   └── TLForm.tsx
│   │   ├── Team/
│   │   │   ├── TeamCalendar.tsx
│   │   │   └── TravelConflicts.tsx
│   │   ├── Admin/
│   │   │   └── DropdownManager.tsx
│   │   └── Layout/
│   │       ├── AppShell.tsx
│   │       ├── Navigation.tsx
│   │       └── Header.tsx
│   ├── services/
│   │   ├── graphClient.ts         # Microsoft Graph API client
│   │   ├── eventsService.ts       # CRUD for Events list
│   │   ├── assetsService.ts       # CRUD for Assets lists
│   │   ├── tlService.ts           # Thought Leadership CRUD
│   │   └── configService.ts       # Dropdown/config CRUD
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useAssets.ts
│   │   ├── useTeam.ts
│   │   └── useRealTimeSync.ts     # Polling/subscription for live updates
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── conflictDetection.ts
│   │   └── colorCoding.ts
│   ├── config/
│   │   └── authConfig.ts          # MSAL configuration
│   ├── App.tsx
│   └── main.tsx
├── spfx/                          # SPFx wrapper (for SharePoint deployment)
│   ├── src/
│   │   └── webparts/
│   │       └── fmpsCoordination/
│   │           ├── FmpsCoordinationWebPart.ts
│   │           └── FmpsCoordinationWebPart.manifest.json
│   ├── config/
│   ├── gulpfile.js
│   └── package.json
├── scripts/
│   ├── create-sharepoint-lists.ps1  # PowerShell to provision SP Lists
│   └── import-excel-data.ps1        # Migrate existing Excel data
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PROJECT_PLAN.md
└── README.md
```

---

## Getting Started (Development)

```bash
cd "Travel Coordination Tool"
npm install
npm run dev          # Start local dev server with mock data
npm run build        # Production build
npm run package-spfx # Package for SharePoint deployment
```

---

## Data Migration Plan

1. Run `scripts/import-excel-data.ps1` to read the Excel file
2. Creates SharePoint Lists with proper schema
3. Imports all existing events from 2024/2025/2026/2027 sheets
4. Imports asset inventory
5. Imports thought leadership entries
6. Imports dropdown configuration values
7. Validates data integrity post-import

---

## Multi-User Sync Strategy

- **Read**: Graph API GET with `$select` and `$filter` for efficient queries
- **Write**: Graph API PATCH/POST with ETag-based optimistic concurrency
- **Real-time**: Poll SharePoint List changes every 30 seconds via `delta` query
- **Conflict resolution**: Last-write-wins with visual notification if someone else edited the same record
- **Offline**: Service Worker caches last-known state; queues changes for sync when reconnected

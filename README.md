# FMPS Marketing & Trade Show Coordination Tool

A browser-based coordination tool for managing FMPS trade shows, roadshows, team travel, asset reservations, and thought leadership — replacing the shared Excel workbook with a real-time, multi-user web application.

## Quick Start

### Prerequisites
- Node.js 18+
- SharePoint site with admin access (for list provisioning)
- Azure AD App Registration (for authentication)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Authentication
Edit `src/config/authConfig.ts` and replace:
- `YOUR_CLIENT_ID` — Azure AD App Registration Client ID
- `YOUR_TENANT_ID` — Your Microsoft 365 tenant ID
- `YOUR_SHAREPOINT_SITE_URL` — Target SharePoint site URL

### 3. Provision SharePoint Lists
```powershell
# Requires PnP.PowerShell module
Install-Module PnP.PowerShell -Scope CurrentUser
cd scripts
.\create-sharepoint-lists.ps1 -SiteUrl "https://panduit.sharepoint.com/sites/FMPSCoordination"
```

### 4. Import Existing Data
```powershell
.\import-excel-data.ps1 -SiteUrl "https://panduit.sharepoint.com/sites/FMPSCoordination" -ExcelPath "..\FMPS Marketing & Tradeshows.xlsx"
```

### 5. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

---

## Deployment to SharePoint

### Option A: SharePoint App Catalog (Recommended)
1. Build: `npm run build`
2. Package the SPFx web part (see `spfx/` folder)
3. Upload `.sppkg` to your SharePoint App Catalog
4. Add the web part to a SharePoint page
5. Share the page URL with your team

### Option B: Azure Static Web Apps
1. Push to GitHub
2. Create Azure Static Web App linked to this repo
3. Configure MSAL redirect URIs in Azure AD
4. Share the Azure URL

---

## Features

| Feature | Description |
|---------|-------------|
| 📅 Calendar View | Interactive monthly/quarterly calendar with color-coded events |
| 📋 Event Management | Full CRUD for trade shows, roadshows, local events, webinars |
| 📦 Asset Tracking | Inventory management with real-time availability & reservations |
| 🎤 Thought Leadership | Track speaking submissions, deadlines, and abstracts |
| 👥 Team Travel | Per-person travel calendars with conflict detection |
| ⚙️ Admin Config | Manage all dropdown/picklist values in one place |
| 🔄 Real-time Sync | Auto-refreshes every 30 seconds + on-focus updates |
| 🔒 SSO Auth | Single sign-on with Microsoft 365 credentials |

---

## Architecture

```
Browser (React + Fluent UI)
    ↕ Microsoft Graph API
SharePoint Lists (Data Store)
    ↕ Built-in versioning & permissions
Microsoft 365 (Auth via MSAL)
```

No additional servers or databases needed. SharePoint Lists provide:
- Multi-user concurrent access
- Version history on every change
- Permission-based access control
- 30-second polling for real-time sync

---

## Azure AD App Registration Setup

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Name: `FMPS Coordination Tool`
4. Supported account types: "Accounts in this organizational directory only"
5. Redirect URI: `http://localhost:3000` (add production URL later)
6. Under API permissions, add:
   - `Microsoft Graph` → `User.Read` (delegated)
   - `Microsoft Graph` → `Sites.ReadWrite.All` (delegated)
7. Grant admin consent
8. Copy the **Application (client) ID** and **Directory (tenant) ID** into `authConfig.ts`

---

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Layout/         # App shell, header, navigation
│   ├── Calendar/       # Calendar view with event cards
│   ├── Events/         # Event table, forms, detail views
│   ├── Assets/         # Asset inventory & reservations
│   ├── ThoughtLeadership/  # Speaking/content tracking
│   ├── Team/           # Team travel calendar
│   └── Admin/          # Configuration management
├── services/           # SharePoint Graph API integration
├── hooks/              # React hooks for data management
├── types/              # TypeScript interfaces
└── config/             # Authentication & site config
scripts/
├── create-sharepoint-lists.ps1   # Provision SP lists
└── import-excel-data.ps1         # Migrate from Excel
```

---

## License

Internal use only — Panduit Corporation.

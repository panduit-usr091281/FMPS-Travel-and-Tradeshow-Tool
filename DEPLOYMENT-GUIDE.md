# Method of Procedure: Zero-Setup Web App Deployment

## GitHub Pages + Power Automate + SharePoint

**Scope:** Any browser-based tool (HTML/JS/CSS) that needs shared data storage across a team without requiring admin permissions, servers, or client-side installs.

**Audience:** Developers, team leads, and power users deploying internal web tools within a Microsoft 365 organization.

---

## Use Cases

This pattern works for any project where you need:

- A lightweight internal web app accessible via a single link
- Shared data that multiple users can read/write
- No IT tickets, no admin approvals, no infrastructure
- Version-controlled code with automatic deployments

**Examples:** project trackers, inventory tools, scheduling apps, dashboards, calculators, form builders, status boards, knowledge bases.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  User's Browser                                              │
│  (opens your GitHub Pages URL — one click, zero setup)       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Your App (static HTML + JS + CSS)                   │    │
│  │  Served from GitHub Pages (free, auto-deploys)       │    │
│  └──────────────┬──────────────────────┬───────────────┘    │
└─────────────────┼──────────────────────┼────────────────────┘
                  │ GET data             │ POST data
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Power Automate (included in M365 license)                   │
│                                                              │
│  Flow 1: "Read"         Flow 2: "Write"                     │
│  HTTP GET trigger →     HTTP POST trigger →                  │
│  Read file from SP →    Write file to SP →                  │
│  Return JSON            Return 200 OK                        │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SharePoint Document Library                                 │
│  (your-data-file.json)                                       │
│                                                              │
│  You own it. You control access. Single source of truth.     │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Component | Purpose | Cost |
|-----------|---------|------|
| GitHub account | Host the app code (HTML/JS/CSS) | Free |
| Microsoft 365 license | Power Automate + SharePoint | Already have it |
| SharePoint folder | Store the shared data file | Already have it |

---

## Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `your-tool-name`
3. **Visibility:** Public (required for free GitHub Pages)
4. Click **Create repository**
5. Push your app files:

```bash
cd your-project-folder
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/your-tool-name.git
git push -u origin master
```

---

## Step 2: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `master` / folder: `/ (root)`
4. Click **Save**
5. Your site will be live at: `https://YOUR-USERNAME.github.io/your-tool-name/`

> **Tip:** If your main HTML file isn't named `index.html`, add a redirect:
> ```html
> <!-- index.html -->
> <!DOCTYPE html>
> <html>
> <head><meta http-equiv="refresh" content="0;url=your-actual-file.html"></head>
> <body></body>
> </html>
> ```

---

## Step 3: Create Your SharePoint Data Folder

1. Go to your SharePoint site
2. Create a Document Library (e.g., `AppData`)
3. Note the site URL: `https://yourcompany.sharepoint.com/sites/YourSite`
4. Note the library name: `AppData`

This is where `fmps-data.json` (your shared data file) will live.

---

## Step 4: Create Power Automate Flows

### Flow 1: "Get Data" (reads the JSON file)

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Click **+ Create** → **Instant cloud flow** → **Skip**
3. Search for trigger: **"When an HTTP request is received"**
4. Method: **GET**
5. Click **+ New step** → search **"Get file content"** (SharePoint)
6. Configure:
   - **Site Address:** `https://yourcompany.sharepoint.com/sites/YourSite`
   - **File Identifier:** Click folder icon → navigate to your library → select `fmps-data.json`
   
   > **First time:** The file won't exist yet. Create an empty `fmps-data.json` in your library with content: `{}`
   
7. Click **+ New step** → search **"Response"**
8. Configure:
   - **Status Code:** `200`
   - **Headers:** `Content-Type` = `application/json`
   - **Body:** Select the **File Content** from the previous step
9. Click **Save**
10. Go back to the trigger step → copy the **HTTP POST URL** (this is your GET endpoint)

> **Save this URL** — it looks like:
> `https://prod-XX.westus.logic.azure.com:443/workflows/abc123.../triggers/manual/paths/invoke?api-version=...&sp=...&sv=...&sig=...`

---

### Flow 2: "Save Data" (writes the JSON file)

1. Click **+ Create** → **Instant cloud flow** → **Skip**
2. Trigger: **"When an HTTP request is received"**
3. Method: **POST**
4. JSON Schema (paste this):
```json
{
    "type": "object"
}
```
5. Click **+ New step** → search **"Create file"** (SharePoint)
6. Configure:
   - **Site Address:** `https://yourcompany.sharepoint.com/sites/YourSite`
   - **Folder Path:** `/AppData`
   - **File Name:** `fmps-data.json`
   - **File Content:** Select **Body** from the trigger

   > **Important:** Use "Create file" with overwrite, OR use "Update file" action.
   > Better approach: Use **"Get file metadata using path"** to get the file ID,
   > then **"Update file content"** with that ID.

   **Recommended steps:**
   
   a. **Get file metadata using path** (SharePoint)
      - Site: your site
      - File Path: `/AppData/fmps-data.json`
   
   b. **Update file content** (SharePoint)
      - Site: your site  
      - File Identifier: Select **Id** from step (a)
      - File Content: Select **Body** from the trigger

7. Click **+ New step** → **Response**
   - Status Code: `200`
   - Body: `{"ok": true}`
8. Click **Save**
9. Copy the **HTTP POST URL** from the trigger step

---

### Flow 2 Alternative (simpler — Create with overwrite)

If "Update file" is tricky, use this approach instead:

1. Trigger: "When an HTTP request is received" (POST)
2. **Delete file** (SharePoint) — Path: `/AppData/fmps-data.json` — Configure to not fail if missing
3. **Create file** (SharePoint) — Folder: `/AppData`, Name: `fmps-data.json`, Content: trigger Body
4. **Response** — 200 OK

---

## Step 5: Add Flow URLs to Your App

In your app's JavaScript storage layer, add a "cloud" mode that calls the flow URLs:

```javascript
class StorageManager {
    constructor() {
        this.mode = 'cloud'; // 'local' or 'cloud'
        this.getFlowUrl = 'YOUR_GET_FLOW_URL_HERE';
        this.saveFlowUrl = 'YOUR_SAVE_FLOW_URL_HERE';
    }

    async load() {
        if (this.mode === 'cloud') {
            try {
                const resp = await fetch(this.getFlowUrl);
                if (resp.ok) {
                    const data = await resp.json();
                    this.data = data;
                    return data;
                }
            } catch (e) {
                console.warn('Cloud load failed, using local cache');
            }
        }
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('app_data') || '{}');
    }

    async save(data) {
        data.lastModified = new Date().toISOString();
        // Always save locally as cache
        localStorage.setItem('app_data', JSON.stringify(data));

        if (this.mode === 'cloud') {
            await fetch(this.saveFlowUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        }
    }
}
```

---

## Step 6: Configure & Deploy

1. Paste your two flow URLs into the app's config (Settings page or hardcoded)
2. Commit and push:
```bash
git add -A
git commit -m "Add cloud sync via Power Automate"
git push
```
3. Wait ~60 seconds for GitHub Pages to redeploy
4. Share the link with your team: `https://YOUR-USERNAME.github.io/your-tool-name/`

---

## How It Works for Your Team

| Role | Action | Requirements |
|------|--------|--------------|
| **App Owner** | Set up repo, create flows, configure SharePoint library | GitHub account + M365 license |
| **End Users** | Click the link and use the app | A web browser. That's it. |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Flow URLs are "public" | They contain a long cryptographic SAS token. Treat them like API keys — never commit them to a public repo. |
| Who can call the flows? | Anyone with the URL. Acceptable for internal tools. For sensitive data, add validation in the flow (custom header, IP check, or M365 group membership check). |
| Data in SharePoint | Standard SharePoint permissions apply. Only users with library access can view files directly. |
| Public GitHub repo | Only code is public — data stays in SharePoint. Keep flow URLs out of the repo (see below). |

### Protecting Flow URLs

| Method | Complexity | Best For |
|--------|-----------|----------|
| **Settings prompt** — user pastes URLs once, stored in browser localStorage | Low | Small teams where you share URLs via Teams/email |
| **Config flow** — a third flow that validates a shared passphrase and returns the real URLs | Medium | Larger teams, extra security layer |
| **Private repo** — GitHub Pro/Team/Enterprise allows Pages on private repos | Low | Orgs with GitHub Enterprise |
| **Environment config file** — `.env` or `config.js` excluded from repo via `.gitignore` | Low | Local/hybrid deployments |

Example (Settings prompt approach):
```javascript
// On first load, prompt user for flow URLs (shared via secure channel)
let config = JSON.parse(localStorage.getItem('app_flow_config') || 'null');
if (!config) {
    config = {
        getUrl: prompt('Paste the GET flow URL:'),
        saveUrl: prompt('Paste the SAVE flow URL:'),
    };
    localStorage.setItem('app_flow_config', JSON.stringify(config));
}
```

---

## Ongoing Maintenance

### Updating the App Code
```bash
# Edit files locally, then:
git add -A
git commit -m "Description of changes"
git push
# GitHub Pages auto-deploys in ~60 seconds
# All users see updates on next page refresh — no action required from them
```

### Updating Data Schema
If you add new fields to your data model:
1. Update the app code to handle missing fields gracefully (defaults/fallbacks)
2. Push to GitHub
3. Existing data files continue to work — no migration needed

### Flow Maintenance
- Power Automate connections expire periodically — re-authorize if flows start failing
- Monitor flow run history at [make.powerautomate.com](https://make.powerautomate.com) → My Flows → Run History

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Failed to fetch" | Flow URL incorrect or expired | Verify URL in browser (GET) or Postman (POST) |
| Data not loading | Data file doesn't exist in SharePoint | Create it manually with `{}` content |
| Flow returns 401/403 | SharePoint connector auth expired | Open flow → re-authorize the SharePoint connection |
| Stale data across users | Poll interval too long | Reduce sync interval or add a "Refresh" button |
| CORS errors | URL is wrong (not a Power Automate URL) | Power Automate HTTP triggers allow CORS by default |
| GitHub Pages 404 | Branch/path misconfigured | Check Settings → Pages → ensure correct branch and path |
| Changes not deploying | GitHub Actions build failed | Check repo → Actions tab for errors |

---

## Scaling This Pattern

### Multiple Data Files
For apps with separate data collections, create additional flows or parameterize:
```
GET /data?file=events.json
GET /data?file=users.json
```
In the flow, use a query parameter to determine which file to read.

### Multiple Environments
| Environment | GitHub Branch | Flow Set | SharePoint Library |
|-------------|---------------|----------|-------------------|
| Production | `main` | Prod flows | `/AppData/` |
| Development | `dev` | Dev flows | `/AppData-Dev/` |

### Access Control
Add user validation in your Save flow:
1. Add an "Initialize variable" step: `AllowedEmails = ["user1@company.com", "user2@company.com"]`
2. Add a "Condition": Check if the request header `X-User-Email` is in the list
3. If no → Response 403
4. If yes → proceed with save

### Concurrent Edits (Conflict Resolution)
For tools where multiple users may save simultaneously:
1. Include a `lastModified` timestamp in your data
2. Before saving, read current file and compare timestamps
3. If the file was modified since last read → return 409 Conflict
4. App handles conflict by reloading and notifying user

---

## Checklist: New Project Deployment

Use this checklist when deploying a new tool using this pattern:

- [ ] **Code ready** — app works locally with localStorage
- [ ] **GitHub repo created** — public or private with Pages support
- [ ] **GitHub Pages enabled** — site is live at `*.github.io` URL
- [ ] **SharePoint library created** — folder exists for data file
- [ ] **Seed data file created** — initial `data.json` uploaded to library (can be `{}`)
- [ ] **GET flow created** — tested in browser, returns JSON
- [ ] **SAVE flow created** — tested via Postman/curl, writes to SharePoint
- [ ] **Flow URLs configured** — stored securely, not in public repo
- [ ] **App tested end-to-end** — load data, modify, save, reload confirms persistence
- [ ] **Shared with team** — link sent via Teams/email
- [ ] **Documentation** — brief README for your team explaining the tool

---

## Quick Reference

| Resource | URL |
|----------|-----|
| GitHub Pages docs | [pages.github.com](https://pages.github.com) |
| Power Automate | [make.powerautomate.com](https://make.powerautomate.com) |
| SharePoint admin | `https://YOURCOMPANY-admin.sharepoint.com` |
| Flow HTTP trigger docs | [Microsoft Learn](https://learn.microsoft.com/en-us/power-automate/triggers-introduction#request-triggers) |

---

## Summary

| Layer | Technology | Role |
|-------|-----------|------|
| **Hosting** | GitHub Pages | Serves static app files (HTML/JS/CSS) |
| **API** | Power Automate | Reads/writes data without a server |
| **Storage** | SharePoint | Enterprise file storage with permissions |
| **Auth** | SAS token in flow URL | Secures API access without Azure AD |
| **Sync** | OneDrive (optional) | Real-time sync for local folder mode |

**Total infrastructure cost: $0** (uses existing M365 + free GitHub tier)

**Time to deploy a new project: ~30 minutes** (once you've done it once)

---

*This MOP is technology-agnostic for the frontend — works with any static HTML/JS/CSS application regardless of framework or complexity.*

# FMPS Coordination Tool — Deployment Guide

## Zero-Setup Hosting with GitHub Pages + Power Automate + SharePoint

This guide explains how to deploy a browser-based tool so that:

- **Your team clicks one link** — no installs, no downloads, no folder sync
- **All data saves to YOUR SharePoint folder** — you're the host
- **Changes sync across all users in real time**
- **No admin permissions required**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Team Member's Browser                                       │
│  (opens GitHub Pages URL)                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Your App (HTML + JS + CSS)                          │    │
│  │  Hosted on GitHub Pages (free, auto-deploys)         │    │
│  └──────────────┬──────────────────────┬───────────────┘    │
└─────────────────┼──────────────────────┼────────────────────┘
                  │ GET data             │ POST data
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Power Automate (your M365 license)                          │
│                                                              │
│  Flow 1: "Get Data"    Flow 2: "Save Data"                  │
│  HTTP trigger →        HTTP trigger →                        │
│  Read file from SP →   Write file to SP →                   │
│  Return JSON           Return 200 OK                         │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│  YOUR SharePoint Folder                                      │
│  (e.g., /sites/YourSite/FMPSData/fmps-data.json)           │
│                                                              │
│  You own it. You control permissions. One source of truth.   │
└─────────────────────────────────────────────────────────────┘
```

---

## What You Need

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

| Who | What they do | What they need |
|-----|--------------|----------------|
| **You (admin)** | Set up repo, flows, SharePoint folder | GitHub account + M365 |
| **Team members** | Click the link and use the tool | A web browser. That's it. |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Flow URLs are "public" | They contain a long cryptographic signature (SAS token). Treat them like passwords — don't post them publicly. Store them in a config file or env variable. |
| Who can call the flows? | Anyone with the URL. For internal tools, this is acceptable. For sensitive data, add a check in the flow (e.g., verify the caller's IP or add a custom header/token). |
| Data in SharePoint | Standard SharePoint permissions apply. Only users with access to the library can see the data in SharePoint directly. |
| GitHub repo is public | Only your HTML/JS/CSS code is public. Your DATA stays in SharePoint. Don't put flow URLs in the public repo — load them from a config endpoint or prompt the user. |

### Protecting Flow URLs in a Public Repo

**Option A:** Store URLs in localStorage (user enters them once in Settings):
```javascript
// Don't hardcode — prompt user or load from config
const flowUrls = JSON.parse(localStorage.getItem('flow_config') || '{}');
```

**Option B:** Create a tiny "config" flow that returns the actual URLs after verifying the caller:
```
App loads → calls config flow with a shared secret → gets back the real flow URLs
```

**Option C:** Make the GitHub repo private (requires GitHub Pro/Team for Pages on private repos).

---

## Updating the App

```bash
# Make your code changes locally, then:
git add -A
git commit -m "Description of changes"
git push
# GitHub Pages auto-deploys in ~60 seconds
# All users see the update on their next page refresh
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Failed to fetch" errors | Check that your flow URLs are correct. Test them in a browser (GET flow) or Postman (POST flow). |
| Data not loading | Make sure `fmps-data.json` exists in your SharePoint library. Create it manually with `{}` if needed. |
| Flow returning 401/403 | The flow's SharePoint connection may have expired. Open the flow in Power Automate and re-authorize the SharePoint connector. |
| Stale data | Add a timestamp check or reduce the sync poll interval. |
| CORS errors | Power Automate HTTP triggers allow cross-origin by default. If you see CORS errors, the URL may be wrong. |

---

## Replicating This Pattern for Other Tools

This pattern works for **any** browser-based tool:

1. **Frontend:** Static HTML/JS/CSS → GitHub Pages (free hosting, version controlled)
2. **Backend:** Power Automate flows → read/write SharePoint files (no server needed)
3. **Data:** SharePoint document library → enterprise-grade storage with permissions

### Steps to replicate:
1. Build your tool as static HTML/JS
2. Create a GitHub repo, enable Pages
3. Create a SharePoint library for data
4. Create 2 Power Automate flows (GET + POST)
5. Wire the flow URLs into your app
6. Share the link

**Total cost: $0 beyond existing M365 licensing.**

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Your app | `https://YOUR-USERNAME.github.io/your-tool-name/` |
| GitHub repo | `https://github.com/YOUR-USERNAME/your-tool-name` |
| SharePoint data | `https://yourcompany.sharepoint.com/sites/YourSite/AppData/` |
| Power Automate | [make.powerautomate.com](https://make.powerautomate.com) |
| GitHub Pages docs | [pages.github.com](https://pages.github.com) |

---

*Created for Panduit FMPS Team — adaptable to any M365 organization.*

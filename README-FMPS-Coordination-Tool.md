# FMPS Marketing & Trade Show Coordination Tool

A lightweight, browser-based coordination tool that replaces the shared Excel workbook. No servers, no databases, no build tools — just HTML/CSS/JS files hosted on SharePoint.

## How It Works

```
┌──────────────────────────────────────────────┐
│  SharePoint Document Library ("FMPSData")    │
│                                              │
│  📄 fmps-coordination-tool.html  ← The app (open this)      │
│  📄 fmps-tool-styles.css         ← Styling                   │
│  📄 fmps-config-defaults.js      ← Default config            │
│  📄 fmps-storage-sync.js         ← Sync engine               │
│  📄 fmps-app-main.js             ← Application logic         │
│  📄 fmps-data.json               ← Shared data (auto)        │
│                                              │
└──────────────────────────────────────────────┘
         ↕ Everyone reads the same link
    All changes write to fmps-data.json
    App polls every 15s for updates from others
```

**Sync mechanism**: The app stores all data in a single JSON file (`fmps-data.json`) in the same SharePoint document library. When anyone makes a change, it saves to that file. Every 15 seconds, the app checks if someone else made changes and refreshes automatically.

---

## Deployment (5 minutes)

### Step 1: Create a Document Library
1. Go to your SharePoint site (e.g., `https://panduit.sharepoint.com/sites/FMPS`)
2. Click **+ New** → **Document Library**
3. Name it `FMPSData`

### Step 2: Upload the App Files
Upload these files to the `FMPSData` library:
- `fmps-coordination-tool.html`
- `fmps-tool-styles.css`
- `fmps-config-defaults.js`
- `fmps-storage-sync.js`
- `fmps-app-main.js`

### Step 3: Configure the App
1. Open `fmps-coordination-tool.html` from the library (it will open in browser)
2. Go to **⚙️ Settings** tab
3. Enter your SharePoint site URL and library name
4. Click **Save & Connect**

### Step 4: Share the Link
Copy the URL to `fmps-coordination-tool.html` and share it with your team. That's it!

> **Alternative**: If SharePoint blocks running HTML directly, create a SharePoint page and add a **File Viewer** or **Embed** web part pointing to the `fmps-coordination-tool.html` file.

---

## Features

| Feature | Description |
|---------|-------------|
| 📅 Calendar | Monthly calendar view with color-coded events |
| 📋 Events | Full event management — add, edit, filter, delete |
| 📦 Assets | Inventory tracking with reservation system |
| 👥 Team Travel | Per-person travel schedule at a glance |
| 🎤 Speaking | Thought leadership submissions & deadlines |
| ⚙️ Settings | Manage dropdowns, team members, connection |
| 🔄 Auto-Sync | Polls for changes every 15 seconds |

---

## Local Development / Testing

Just open `fmps-coordination-tool.html` in a browser. Without a SharePoint connection, data saves to `localStorage` (single-user only). Configure a SharePoint site in Settings to enable multi-user sync.

---

## Data Stored

All tool data lives in one JSON file with this structure:
- **events** — trade shows, roadshows, local events, webinars
- **assets** — inventory items with part numbers and quantities
- **reservations** — which assets are booked for which events
- **thoughtLeadership** — speaking submissions and deadlines
- **config** — dropdown options, team member list

---

## No Build Tools Required

This is plain HTML, CSS, and JavaScript. No npm, no Node.js, no React, no compilation. Edit any file in a text editor and re-upload to SharePoint.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "HTML opens as download" | Use a SharePoint Embed web part or set content type |
| "Can't connect" | Verify site URL ends without slash, library name matches exactly |
| "Changes not syncing" | Check Settings → Test Connection; verify library permissions |
| "Data seems lost" | Check `fmps-data.json` in the library — all data is there |

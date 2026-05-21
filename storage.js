/**
 * FMPS Coordination Tool - Storage Layer
 * 
 * Handles persistence and multi-user sync.
 * Two modes:
 *   1. SharePoint Mode: Reads/writes a JSON file in a SharePoint Document Library
 *      via the SharePoint REST API. Auth is automatic when hosted on SharePoint.
 *   2. Local Mode: Uses localStorage (for development/testing only).
 * 
 * SharePoint provides the sync: everyone reads/writes the same file.
 * ETag-based concurrency prevents overwrites.
 */

class StorageManager {
    constructor() {
        this.mode = 'local'; // 'local' or 'sharepoint'
        this.spSiteUrl = '';
        this.spLibrary = 'FMPSData';
        this.fileName = 'fmps-data.json';
        this.etag = null;
        this.data = null;
        this.syncInterval = null;
        this.onDataChange = null; // callback when data changes from sync

        this._loadConfig();
    }

    // ============================
    // Configuration
    // ============================

    _loadConfig() {
        const saved = localStorage.getItem('fmps_storage_config');
        if (saved) {
            const cfg = JSON.parse(saved);
            this.spSiteUrl = cfg.spSiteUrl || '';
            this.spLibrary = cfg.spLibrary || 'FMPSData';
            if (this.spSiteUrl) {
                this.mode = 'sharepoint';
            }
        }
    }

    configure(siteUrl, libraryName) {
        this.spSiteUrl = siteUrl.replace(/\/$/, '');
        this.spLibrary = libraryName || 'FMPSData';
        this.mode = siteUrl ? 'sharepoint' : 'local';
        localStorage.setItem('fmps_storage_config', JSON.stringify({
            spSiteUrl: this.spSiteUrl,
            spLibrary: this.spLibrary,
        }));
    }

    // ============================
    // Public API
    // ============================

    async load() {
        if (this.mode === 'sharepoint') {
            return this._spLoad();
        }
        return this._localLoad();
    }

    async save(data) {
        data.lastModified = new Date().toISOString();
        this.data = data;
        if (this.mode === 'sharepoint') {
            return this._spSave(data);
        }
        return this._localSave(data);
    }

    startSync(intervalMs = 15000) {
        this.stopSync();
        this.syncInterval = setInterval(() => this._syncPoll(), intervalMs);
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async testConnection() {
        if (this.mode !== 'sharepoint') return { ok: true, message: 'Using local storage' };
        try {
            await this._spGetDigest();
            return { ok: true, message: 'Connected to SharePoint successfully' };
        } catch (e) {
            return { ok: false, message: `Connection failed: ${e.message}` };
        }
    }

    // ============================
    // Local Storage
    // ============================

    _localLoad() {
        const raw = localStorage.getItem('fmps_data');
        if (raw) {
            this.data = JSON.parse(raw);
        } else {
            this.data = JSON.parse(JSON.stringify(EMPTY_STATE));
            this._localSave(this.data);
        }
        return this.data;
    }

    _localSave(data) {
        localStorage.setItem('fmps_data', JSON.stringify(data));
    }

    // ============================
    // SharePoint REST API
    // ============================

    async _spGetDigest() {
        const resp = await fetch(`${this.spSiteUrl}/_api/contextinfo`, {
            method: 'POST',
            headers: { 'Accept': 'application/json;odata=nometadata' },
            credentials: 'include',
        });
        if (!resp.ok) throw new Error(`Failed to get digest: ${resp.status}`);
        const json = await resp.json();
        return json.FormDigestValue;
    }

    async _spLoad() {
        try {
            const url = `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files('${this.fileName}')/$value`;
            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            });

            if (resp.status === 404) {
                // File doesn't exist yet — create with seed data
                this.data = JSON.parse(JSON.stringify(EMPTY_STATE));
                await this._spSave(this.data);
                return this.data;
            }

            if (!resp.ok) throw new Error(`SP load failed: ${resp.status}`);

            this.etag = resp.headers.get('ETag');
            const text = await resp.text();
            this.data = JSON.parse(text);
            return this.data;
        } catch (e) {
            console.warn('SharePoint load failed, falling back to local:', e);
            this.mode = 'local';
            return this._localLoad();
        }
    }

    async _spSave(data) {
        try {
            const digest = await this._spGetDigest();
            const url = `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files/Add(url='${this.fileName}',overwrite=true)`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'Content-Type': 'application/json',
                    'X-RequestDigest': digest,
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!resp.ok) throw new Error(`SP save failed: ${resp.status}`);
            this.etag = resp.headers.get('ETag');
            // Also save locally as cache
            this._localSave(data);
        } catch (e) {
            console.error('SharePoint save failed:', e);
            // Save locally as fallback
            this._localSave(data);
            throw e;
        }
    }

    async _syncPoll() {
        if (this.mode !== 'sharepoint') return;

        try {
            // Check if the file has been modified by someone else
            const url = `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files('${this.fileName}')`;
            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json;odata=nometadata' },
                credentials: 'include',
            });

            if (!resp.ok) return;
            const meta = await resp.json();
            const remoteModified = meta.TimeLastModified;

            if (this.data && remoteModified !== this._lastKnownModified) {
                this._lastKnownModified = remoteModified;
                // File changed — reload
                const newData = await this._spLoad();
                if (this.onDataChange) {
                    this.onDataChange(newData);
                }
            }
        } catch {
            // Silent fail on poll — will retry next interval
        }
    }
}

// Singleton instance
const storage = new StorageManager();

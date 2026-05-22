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
 * ETag-based optimistic concurrency prevents silent overwrites.
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
        this._saveInProgress = false;

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
        if (this._saveInProgress) {
            // Queue: just cache locally and let the next sync pick it up
            this._localSave(data);
            return;
        }
        this._saveInProgress = true;
        try {
            data.lastModified = new Date().toISOString();
            this.data = data;
            if (this.mode === 'sharepoint') {
                await this._spSave(data);
            } else {
                this._localSave(data);
            }
        } finally {
            this._saveInProgress = false;
        }
    }

    /**
     * Migrate current in-memory/local data to a SharePoint store.
     * Called once when user first configures a SharePoint connection.
     * If the remote file already has data, prefer the remote version.
     */
    async migrateToSharePoint(localData) {
        try {
            const url = `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files('${this.fileName}')/$value`;
            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            });

            if (resp.status === 404) {
                // Remote doesn't exist yet — push local data up
                await this._spSave(localData);
                return localData;
            }

            if (resp.ok) {
                // Remote exists — use remote as source of truth
                this.etag = resp.headers.get('ETag');
                const text = await resp.text();
                this.data = JSON.parse(text);
                this._lastKnownModified = this.data.lastModified || new Date().toISOString();
                this._localSave(this.data);
                return this.data;
            }

            throw new Error(`SP migration check failed: ${resp.status}`);
        } catch (e) {
            throw new Error(`Migration failed: ${e.message}`);
        }
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

        if (!resp.ok) {
            // Load from local cache but stay in SharePoint mode for retries
            console.warn('SharePoint load failed, using local cache:', resp.status);
            return this._localLoad();
        }

        this.etag = resp.headers.get('ETag');
        const text = await resp.text();
        this.data = JSON.parse(text);
        this._lastKnownModified = this.data.lastModified || new Date().toISOString();
        // Keep local cache up to date
        this._localSave(this.data);
        return this.data;
    }

    async _spSave(data) {
        const digest = await this._spGetDigest();
        const headers = {
            'Accept': 'application/json;odata=nometadata',
            'Content-Type': 'application/json',
            'X-RequestDigest': digest,
        };

        // If we have an ETag, use If-Match for optimistic concurrency
        if (this.etag) {
            headers['If-Match'] = this.etag;
            headers['X-HTTP-Method'] = 'PUT';
        }

        const url = this.etag
            ? `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files('${this.fileName}')/$value`
            : `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files/Add(url='${this.fileName}',overwrite=true)`;

        const resp = await fetch(url, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (resp.status === 412) {
            // Conflict — someone else saved first. Reload remote and throw so UI can handle.
            await this._spLoad();
            throw new Error('CONFLICT: Another user saved changes. Your view has been refreshed. Please re-apply your changes.');
        }

        if (!resp.ok) throw new Error(`SP save failed: ${resp.status}`);
        this.etag = resp.headers.get('ETag');
        this._lastKnownModified = data.lastModified;
        // Also save locally as cache
        this._localSave(data);
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

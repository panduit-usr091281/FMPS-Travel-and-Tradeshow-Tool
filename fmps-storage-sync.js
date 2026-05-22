/**
 * FMPS Coordination Tool - Storage Layer
 * 
 * Handles persistence and multi-user sync.
 * Three modes:
 *   1. File System Mode: Reads/writes a JSON file to a local folder using the
 *      File System Access API. If the folder is inside OneDrive/SharePoint sync,
 *      changes automatically sync across users.
 *   2. SharePoint Mode: Reads/writes via SharePoint REST API (requires same-origin).
 *   3. Local Mode: Uses localStorage (fallback).
 */

class StorageManager {
    constructor() {
        this.mode = 'local'; // 'local', 'filesystem', or 'sharepoint'
        this.spSiteUrl = '';
        this.spLibrary = 'FMPSData';
        this.fileName = 'fmps-data.json';
        this.etag = null;
        this.data = null;
        this.syncInterval = null;
        this.onDataChange = null;
        this._saveInProgress = false;
        this._dirHandle = null;
        this._fileLastModified = null;

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
            this.mode = cfg.mode || 'local';
            if (this.mode === 'sharepoint' && !this.spSiteUrl) {
                this.mode = 'local';
            }
        }
    }

    _saveConfig() {
        localStorage.setItem('fmps_storage_config', JSON.stringify({
            spSiteUrl: this.spSiteUrl,
            spLibrary: this.spLibrary,
            mode: this.mode,
        }));
    }

    configure(siteUrl, libraryName) {
        this.spSiteUrl = siteUrl.replace(/\/$/, '');
        this.spLibrary = libraryName || 'FMPSData';
        this.mode = siteUrl ? 'sharepoint' : 'local';
        this._saveConfig();
    }

    // ============================
    // Public API
    // ============================

    async load() {
        if (this.mode === 'filesystem') {
            return this._fsLoad();
        }
        if (this.mode === 'sharepoint') {
            return this._spLoad();
        }
        return this._localLoad();
    }

    async save(data) {
        if (this._saveInProgress) {
            this._localSave(data);
            return;
        }
        this._saveInProgress = true;
        try {
            data.lastModified = new Date().toISOString();
            this.data = data;
            if (this.mode === 'filesystem') {
                await this._fsSave(data);
            } else if (this.mode === 'sharepoint') {
                await this._spSave(data);
            } else {
                this._localSave(data);
            }
        } finally {
            this._saveInProgress = false;
        }
    }

    // ============================
    // File System Access API
    // ============================

    /**
     * Prompt user to pick a local folder. Returns true if connected.
     */
    async connectFolder() {
        if (!('showDirectoryPicker' in window)) {
            throw new Error('Your browser does not support the File System Access API. Use Edge or Chrome.');
        }

        try {
            this._dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            this.mode = 'filesystem';
            this._saveConfig();
            // Persist the handle for next session
            await this._persistHandle();
            return true;
        } catch (e) {
            if (e.name === 'AbortError') return false; // user cancelled
            throw e;
        }
    }

    /**
     * Try to restore a previously-granted folder handle (requires IndexedDB).
     */
    async restoreFolder() {
        try {
            const db = await this._openDB();
            const tx = db.transaction('handles', 'readonly');
            const store = tx.objectStore('handles');
            const request = store.get('dataFolder');
            const handle = await this._idbRequest(request);
            if (!handle) return false;

            // Verify permission is still granted
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') {
                this._dirHandle = handle;
                return true;
            }
            // Try to re-request (requires user gesture — will work on click)
            const req = await handle.requestPermission({ mode: 'readwrite' });
            if (req === 'granted') {
                this._dirHandle = handle;
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async _persistHandle() {
        try {
            const db = await this._openDB();
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            store.put(this._dirHandle, 'dataFolder');
            await this._idbTx(tx);
        } catch { /* IndexedDB not available — handle won't persist */ }
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('fmps_storage', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('handles');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    _idbRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _idbTx(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async _fsLoad() {
        if (!this._dirHandle) {
            console.warn('No folder connected, falling back to local');
            return this._localLoad();
        }

        try {
            const fileHandle = await this._dirHandle.getFileHandle(this.fileName);
            const file = await fileHandle.getFile();
            this._fileLastModified = file.lastModified;
            const text = await file.text();
            this.data = JSON.parse(text);
            this._localSave(this.data); // keep localStorage as cache
            return this.data;
        } catch (e) {
            if (e.name === 'NotFoundError') {
                // File doesn't exist yet — create with current data or empty state
                this.data = this._localLoad();
                await this._fsSave(this.data);
                return this.data;
            }
            console.warn('File system load failed, using local cache:', e.message);
            return this._localLoad();
        }
    }

    async _fsSave(data) {
        if (!this._dirHandle) {
            this._localSave(data);
            return;
        }

        try {
            const fileHandle = await this._dirHandle.getFileHandle(this.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            // Update last modified timestamp
            const file = await fileHandle.getFile();
            this._fileLastModified = file.lastModified;

            // Also cache locally
            this._localSave(data);
        } catch (e) {
            console.error('File system save failed:', e);
            this._localSave(data);
            throw new Error(`File save failed: ${e.message}. Data saved to browser cache.`);
        }
    }

    async _fsSyncPoll() {
        if (!this._dirHandle) return;

        try {
            const fileHandle = await this._dirHandle.getFileHandle(this.fileName);
            const file = await fileHandle.getFile();

            if (file.lastModified !== this._fileLastModified) {
                this._fileLastModified = file.lastModified;
                const text = await file.text();
                const newData = JSON.parse(text);

                if (newData.lastModified !== this.data?.lastModified) {
                    this.data = newData;
                    this._localSave(newData);
                    if (this.onDataChange) {
                        this.onDataChange(newData);
                    }
                }
            }
        } catch {
            // Silent fail — file might be temporarily locked by OneDrive sync
        }
    }

    /**
     * Migrate local data to the connected folder.
     */
    async migrateToFileSystem(localData) {
        if (!this._dirHandle) throw new Error('No folder connected');

        try {
            // Check if file already exists with data
            const fileHandle = await this._dirHandle.getFileHandle(this.fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            const existing = JSON.parse(text);

            if (existing.events && existing.events.length > 0) {
                // Remote has data — use it as source of truth
                this.data = existing;
                this._fileLastModified = file.lastModified;
                this._localSave(this.data);
                return this.data;
            }
        } catch (e) {
            if (e.name !== 'NotFoundError') {
                throw new Error(`Migration failed: ${e.message}`);
            }
        }

        // No existing data — push local data to file
        await this._fsSave(localData);
        return localData;
    }

    // ============================
    // Sync (works for both FS and SharePoint)
    // ============================

    startSync(intervalMs = 5000) {
        this.stopSync();
        this.syncInterval = setInterval(() => {
            if (this.mode === 'filesystem') {
                this._fsSyncPoll();
            } else if (this.mode === 'sharepoint') {
                this._spSyncPoll();
            }
        }, intervalMs);
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async testConnection() {
        if (this.mode === 'filesystem') {
            if (!this._dirHandle) return { ok: false, message: 'No folder connected' };
            try {
                const perm = await this._dirHandle.queryPermission({ mode: 'readwrite' });
                if (perm === 'granted') {
                    return { ok: true, message: `Connected to folder: ${this._dirHandle.name}` };
                }
                return { ok: false, message: 'Permission denied — click Connect Folder to re-authorize' };
            } catch (e) {
                return { ok: false, message: e.message };
            }
        }
        if (this.mode === 'sharepoint') {
            try {
                await this._spGetDigest();
                return { ok: true, message: 'Connected to SharePoint successfully' };
            } catch (e) {
                return { ok: false, message: `Connection failed: ${e.message}` };
            }
        }
        return { ok: true, message: 'Using browser local storage (single device only)' };
    }

    /**
     * Disconnect folder and revert to local mode.
     */
    async disconnect() {
        this.stopSync();
        this._dirHandle = null;
        this.mode = 'local';
        this._saveConfig();
        try {
            const db = await this._openDB();
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').delete('dataFolder');
            await this._idbTx(tx);
        } catch { /* ignore */ }
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
    // SharePoint REST API (for same-origin hosting)
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
            this.data = JSON.parse(JSON.stringify(EMPTY_STATE));
            await this._spSave(this.data);
            return this.data;
        }

        if (!resp.ok) {
            console.warn('SharePoint load failed, using local cache:', resp.status);
            return this._localLoad();
        }

        this.etag = resp.headers.get('ETag');
        const text = await resp.text();
        this.data = JSON.parse(text);
        this._lastKnownModified = this.data.lastModified || new Date().toISOString();
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
            await this._spLoad();
            throw new Error('CONFLICT: Another user saved changes. Your view has been refreshed.');
        }

        if (!resp.ok) throw new Error(`SP save failed: ${resp.status}`);
        this.etag = resp.headers.get('ETag');
        this._lastKnownModified = data.lastModified;
        this._localSave(data);
    }

    async _spSyncPoll() {
        try {
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
                const newData = await this._spLoad();
                if (this.onDataChange) {
                    this.onDataChange(newData);
                }
            }
        } catch {
            // Silent fail on poll
        }
    }

    /**
     * Migrate to SharePoint (for same-origin hosting scenario).
     */
    async migrateToSharePoint(localData) {
        try {
            const url = `${this.spSiteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.spLibrary}')/Files('${this.fileName}')/$value`;
            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            });

            if (resp.status === 404) {
                await this._spSave(localData);
                return localData;
            }

            if (resp.ok) {
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
}

// Singleton instance
const storage = new StorageManager();

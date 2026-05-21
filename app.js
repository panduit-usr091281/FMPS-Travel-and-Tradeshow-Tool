/**
 * FMPS Coordination Tool - Main Application
 * Vanilla JS, no build tools, no frameworks.
 */

let appData = null;

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    appData = await storage.load();

    // Set up sync callback
    storage.onDataChange = (newData) => {
        appData = newData;
        renderCurrentView();
        showSyncStatus('synced');
    };
    storage.startSync(15000);

    initNavigation();
    initCalendar();
    initEventFilters();
    initSettings();
    initModal();
    renderCurrentView();
    showSyncStatus('synced');
});

// ============================================================
// Navigation
// ============================================================

let currentView = 'calendar';

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${currentView}`).classList.add('active');
            renderCurrentView();
        });
    });
}

function renderCurrentView() {
    switch (currentView) {
        case 'calendar': renderCalendar(); break;
        case 'events': renderEventsTable(); break;
        case 'assets': renderAssets(); break;
        case 'travel': renderTeamTravel(); break;
        case 'thought-leadership': renderThoughtLeadership(); break;
        case 'settings': renderSettings(); break;
    }
}

// ============================================================
// Sync Status
// ============================================================

function showSyncStatus(state) {
    const el = document.getElementById('sync-status');
    el.className = 'sync-badge';
    switch (state) {
        case 'synced': el.textContent = '● Synced'; break;
        case 'syncing': el.textContent = '● Syncing...'; el.classList.add('syncing'); break;
        case 'error': el.textContent = '● Offline'; el.classList.add('error'); break;
    }
}

// ============================================================
// Calendar
// ============================================================

let calYear, calMonth;

function initCalendar() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

    document.getElementById('prev-month').addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    const yearSelect = document.getElementById('year-select');
    for (let y = 2024; y <= 2028; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === calYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
    yearSelect.addEventListener('change', (e) => {
        calYear = parseInt(e.target.value);
        renderCalendar();
    });
}

function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('current-month-label').textContent = `${monthNames[calMonth]} ${calYear}`;
    document.getElementById('year-select').value = calYear;

    // Stats
    const today = new Date();
    const upcoming = appData.events.filter(e => new Date(e.startDate) >= today && e.status !== 'Cancelled').length;
    const confirmed = appData.events.filter(e => e.status === 'Confirmed').length;
    const placeholder = appData.events.filter(e => e.status === 'Placeholder' || e.status === 'Pending').length;
    document.getElementById('stat-upcoming').textContent = upcoming;
    document.getElementById('stat-confirmed').textContent = confirmed;
    document.getElementById('stat-placeholder').textContent = placeholder;

    // Build grid
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Day headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
        grid.innerHTML += `<div class="cal-header">${d}</div>`;
    });

    // Days
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Previous month padding
    const prevMonthLast = new Date(calYear, calMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
        grid.innerHTML += `<div class="cal-day other-month"><div class="cal-day-num">${prevMonthLast - i}</div></div>`;
    }

    // Current month days
    const todayStr = today.toISOString().split('T')[0];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayEvents = getEventsForDate(dateStr);

        let eventsHtml = '';
        dayEvents.slice(0, 3).forEach(ev => {
            const statusClass = `status-${(ev.status || 'pending').toLowerCase()}`;
            eventsHtml += `<div class="cal-event ${statusClass}" title="${escHtml(ev.title)}" onclick="openEventDetail('${ev.id}')">${escHtml(ev.title)}</div>`;
        });
        if (dayEvents.length > 3) {
            eventsHtml += `<div class="cal-event" style="font-style:italic">+${dayEvents.length - 3} more</div>`;
        }

        grid.innerHTML += `<div class="cal-day${isToday ? ' today' : ''}"><div class="cal-day-num">${d}</div>${eventsHtml}</div>`;
    }

    // Next month padding
    const totalCells = startDow + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        grid.innerHTML += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
    }
}

function getEventsForDate(dateStr) {
    return appData.events.filter(ev => {
        if (!ev.startDate) return false;
        const start = ev.startDate.split('T')[0];
        const end = (ev.endDate || ev.startDate).split('T')[0];
        return dateStr >= start && dateStr <= end;
    });
}

// ============================================================
// Events Table
// ============================================================

function initEventFilters() {
    document.getElementById('event-search').addEventListener('input', renderEventsTable);
    document.getElementById('filter-status').addEventListener('change', renderEventsTable);
    document.getElementById('filter-type').addEventListener('change', renderEventsTable);
    document.getElementById('add-event-btn').addEventListener('click', () => openEventForm());
}

function renderEventsTable() {
    // Populate type filter
    const typeFilter = document.getElementById('filter-type');
    if (typeFilter.options.length <= 1) {
        (appData.config.eventTypes || DEFAULT_CONFIG.eventTypes).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            typeFilter.appendChild(opt);
        });
    }

    const search = document.getElementById('event-search').value.toLowerCase();
    const statusVal = document.getElementById('filter-status').value;
    const typeVal = document.getElementById('filter-type').value;

    const filtered = appData.events.filter(ev => {
        if (search && !ev.title.toLowerCase().includes(search) && !(ev.teamMembers || []).join(' ').toLowerCase().includes(search)) return false;
        if (statusVal && ev.status !== statusVal) return false;
        if (typeVal && ev.eventType !== typeVal) return false;
        return true;
    }).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = filtered.map(ev => `
        <tr>
            <td>${escHtml(ev.eventType || '')}</td>
            <td><strong>${escHtml(ev.title)}</strong></td>
            <td>${escHtml(ev.theater || '')}</td>
            <td>${escHtml((ev.teamMembers || []).join(', '))}</td>
            <td>${formatDateRange(ev.startDate, ev.endDate)}</td>
            <td>${escHtml(ev.displayType || '')}</td>
            <td><span class="badge badge-${(ev.status || 'pending').toLowerCase()}">${escHtml(ev.status || 'Pending')}</span></td>
            <td>
                <button class="btn btn-sm" onclick="openEventForm('${ev.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent('${ev.id}')">✕</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// Event Form (Modal)
// ============================================================

function openEventForm(eventId) {
    const ev = eventId ? appData.events.find(e => e.id === eventId) : null;
    const isEdit = !!ev;
    const config = appData.config || DEFAULT_CONFIG;

    const teamOptions = (config.teamMembers || DEFAULT_CONFIG.teamMembers).map(m =>
        `<label class="checkbox-label"><input type="checkbox" name="teamMembers" value="${escHtml(m)}" ${(ev?.teamMembers || []).includes(m) ? 'checked' : ''}> ${escHtml(m)}</label>`
    ).join('');

    const eventTypeOptions = (config.eventTypes || DEFAULT_CONFIG.eventTypes).map(t =>
        `<option value="${escHtml(t)}" ${ev?.eventType === t ? 'selected' : ''}>${escHtml(t)}</option>`
    ).join('');

    const displayOptions = (config.displayTypes || DEFAULT_CONFIG.displayTypes).map(d =>
        `<option value="${escHtml(d)}" ${ev?.displayType === d ? 'selected' : ''}>${escHtml(d)}</option>`
    ).join('');

    document.getElementById('modal-title').textContent = isEdit ? 'Edit Event' : 'New Event';
    document.getElementById('modal-body').innerHTML = `
        <form id="event-form">
            <input type="hidden" name="id" value="${ev?.id || ''}">
            <div class="form-group">
                <label>Event Name *</label>
                <input type="text" name="title" class="input input-wide" required value="${escHtml(ev?.title || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Event Type *</label>
                    <select name="eventType" class="input input-wide" required>
                        <option value="">Select...</option>
                        ${eventTypeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="input input-wide">
                        ${['Pending','Confirmed','Placeholder','Done','Cancelled'].map(s => `<option value="${s}" ${ev?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="date" name="startDate" class="input input-wide" required value="${ev?.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" class="input input-wide" value="${ev?.endDate || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Region</label>
                    <select name="theater" class="input input-wide">
                        ${['NA','LATAM','EMEA','APAC'].map(r => `<option value="${r}" ${ev?.theater === r ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Display Type</label>
                    <select name="displayType" class="input input-wide">
                        <option value="">Select...</option>
                        ${displayOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tradeshow Owner</label>
                    <input type="text" name="tradeshowOwner" class="input input-wide" value="${escHtml(ev?.tradeshowOwner || '')}">
                </div>
                <div class="form-group">
                    <label>BU Owner</label>
                    <input type="text" name="buOwner" class="input input-wide" value="${escHtml(ev?.buOwner || '')}">
                </div>
            </div>
            <div class="form-group">
                <label>Team Members</label>
                <div style="display:flex;flex-wrap:wrap;gap:0.3rem 1rem;max-height:100px;overflow-y:auto;border:1px solid var(--neutral-border);padding:0.5rem;border-radius:var(--radius)">
                    ${teamOptions}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Booth Size</label>
                    <select name="boothSize" class="input input-wide">
                        <option value="">Select...</option>
                        ${(config.boothSizes || DEFAULT_CONFIG.boothSizes).map(s => `<option value="${escHtml(s)}" ${ev?.boothSize === s ? 'selected' : ''}>${escHtml(s)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Speaker Deadline</label>
                    <input type="date" name="speakerDeadline" class="input input-wide" value="${ev?.speakerDeadline || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Who is Traveling?</label>
                <textarea name="travelDetails" class="input">${escHtml(ev?.travelDetails || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Show Notes</label>
                <textarea name="showNotes" class="input">${escHtml(ev?.showNotes || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Budget</label>
                <input type="number" name="budget" class="input" value="${ev?.budget || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Event</button>
            </div>
        </form>
    `;

    document.getElementById('event-form').addEventListener('submit', handleEventSubmit);
    openModal();
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = formData.get('id') || generateId();
    const teamMembers = Array.from(form.querySelectorAll('input[name="teamMembers"]:checked')).map(cb => cb.value);

    const event = {
        id,
        title: formData.get('title'),
        eventType: formData.get('eventType'),
        status: formData.get('status'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate') || formData.get('startDate'),
        theater: formData.get('theater'),
        displayType: formData.get('displayType'),
        tradeshowOwner: formData.get('tradeshowOwner'),
        buOwner: formData.get('buOwner'),
        teamMembers,
        boothSize: formData.get('boothSize'),
        speakerDeadline: formData.get('speakerDeadline'),
        travelDetails: formData.get('travelDetails'),
        showNotes: formData.get('showNotes'),
        budget: formData.get('budget') ? parseFloat(formData.get('budget')) : null,
    };

    // Auto-calculate graphics deadline (8 weeks prior)
    if (event.startDate) {
        const d = new Date(event.startDate);
        d.setDate(d.getDate() - 56);
        event.graphicsDeadline = d.toISOString().split('T')[0];
    }

    const idx = appData.events.findIndex(ev => ev.id === id);
    if (idx >= 0) {
        appData.events[idx] = event;
    } else {
        appData.events.push(event);
    }

    await saveData();
    closeModal();
    renderCurrentView();
}

function openEventDetail(eventId) {
    openEventForm(eventId);
}

async function deleteEvent(eventId) {
    if (!confirm('Delete this event?')) return;
    appData.events = appData.events.filter(e => e.id !== eventId);
    await saveData();
    renderCurrentView();
}

// ============================================================
// Assets
// ============================================================

function renderAssets() {
    const tbody = document.getElementById('assets-tbody');
    tbody.innerHTML = appData.assets.map(asset => {
        const reserved = getReservedQuantity(asset.id);
        const available = asset.totalQuantity - reserved;
        return `
            <tr>
                <td><strong>${escHtml(asset.title)}</strong></td>
                <td>${escHtml(asset.partNumber)}</td>
                <td>${escHtml(asset.category)}</td>
                <td>${asset.totalQuantity}</td>
                <td>${reserved}</td>
                <td><span style="color:${available > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600">${available}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="openReserveForm('${asset.id}')">Reserve</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAsset('${asset.id}')">✕</button>
                </td>
            </tr>
        `;
    }).join('');

    // Reservations
    const resTbody = document.getElementById('reservations-tbody');
    const activeRes = appData.reservations.filter(r => r.status !== 'Cancelled');
    resTbody.innerHTML = activeRes.map(res => {
        const asset = appData.assets.find(a => a.id === res.assetId);
        const event = appData.events.find(e => e.id === res.eventId);
        return `
            <tr>
                <td>${escHtml(asset?.title || res.assetId)}</td>
                <td>${escHtml(event?.title || res.eventId)}</td>
                <td>${res.quantity}</td>
                <td>${formatDateRange(res.startDate, res.endDate)}</td>
                <td>${escHtml(res.reservedBy || '')}</td>
                <td><span class="badge badge-${res.status === 'Returned' ? 'done' : 'confirmed'}">${res.status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="returnReservation('${res.id}')">Return</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelReservation('${res.id}')">Cancel</button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('add-asset-btn').onclick = () => openAssetForm();
}

function getReservedQuantity(assetId) {
    return appData.reservations
        .filter(r => r.assetId === assetId && r.status !== 'Returned' && r.status !== 'Cancelled')
        .reduce((sum, r) => sum + r.quantity, 0);
}

function openAssetForm() {
    document.getElementById('modal-title').textContent = 'Add Asset';
    document.getElementById('modal-body').innerHTML = `
        <form id="asset-form">
            <div class="form-group">
                <label>Asset Name *</label>
                <input type="text" name="title" class="input input-wide" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Part Number *</label>
                    <input type="text" name="partNumber" class="input input-wide" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="input input-wide">
                        ${DEFAULT_CONFIG.assetCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Quantity</label>
                    <input type="number" name="totalQuantity" class="input input-wide" value="1" min="1">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" class="input input-wide">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Asset</button>
            </div>
        </form>
    `;
    document.getElementById('asset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        appData.assets.push({
            id: generateId(),
            title: fd.get('title'),
            partNumber: fd.get('partNumber'),
            category: fd.get('category'),
            totalQuantity: parseInt(fd.get('totalQuantity')) || 1,
            location: fd.get('location'),
        });
        await saveData();
        closeModal();
        renderAssets();
    });
    openModal();
}

function openReserveForm(assetId) {
    const asset = appData.assets.find(a => a.id === assetId);
    const eventOptions = appData.events.filter(e => e.status !== 'Cancelled' && e.status !== 'Done')
        .map(e => `<option value="${e.id}">${escHtml(e.title)} (${e.startDate || 'no date'})</option>`).join('');

    document.getElementById('modal-title').textContent = `Reserve: ${asset.title}`;
    document.getElementById('modal-body').innerHTML = `
        <form id="reserve-form">
            <input type="hidden" name="assetId" value="${assetId}">
            <div class="form-group">
                <label>Event *</label>
                <select name="eventId" class="input input-wide" required>
                    <option value="">Select event...</option>
                    ${eventOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" class="input input-wide" value="1" min="1" max="${asset.totalQuantity}">
                </div>
                <div class="form-group">
                    <label>Reserved By</label>
                    <input type="text" name="reservedBy" class="input input-wide">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" class="input input-wide">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" class="input input-wide">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Reserve</button>
            </div>
        </form>
    `;
    // Auto-fill dates when event is selected
    document.querySelector('#reserve-form select[name="eventId"]').addEventListener('change', (e) => {
        const ev = appData.events.find(ev => ev.id === e.target.value);
        if (ev) {
            document.querySelector('#reserve-form input[name="startDate"]').value = ev.startDate || '';
            document.querySelector('#reserve-form input[name="endDate"]').value = ev.endDate || '';
        }
    });
    document.getElementById('reserve-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const qty = parseInt(fd.get('quantity')) || 1;
        const available = asset.totalQuantity - getReservedQuantity(assetId);
        if (qty > available) {
            alert(`Only ${available} units available!`);
            return;
        }
        appData.reservations.push({
            id: generateId(),
            assetId: fd.get('assetId'),
            eventId: fd.get('eventId'),
            quantity: qty,
            startDate: fd.get('startDate'),
            endDate: fd.get('endDate'),
            reservedBy: fd.get('reservedBy'),
            status: 'Reserved',
        });
        await saveData();
        closeModal();
        renderAssets();
    });
    openModal();
}

async function deleteAsset(assetId) {
    if (!confirm('Delete this asset?')) return;
    appData.assets = appData.assets.filter(a => a.id !== assetId);
    appData.reservations = appData.reservations.filter(r => r.assetId !== assetId);
    await saveData();
    renderAssets();
}

async function returnReservation(resId) {
    const res = appData.reservations.find(r => r.id === resId);
    if (res) { res.status = 'Returned'; }
    await saveData();
    renderAssets();
}

async function cancelReservation(resId) {
    const res = appData.reservations.find(r => r.id === resId);
    if (res) { res.status = 'Cancelled'; }
    await saveData();
    renderAssets();
}

// ============================================================
// Team Travel
// ============================================================

function renderTeamTravel() {
    const grid = document.getElementById('team-grid');
    const members = appData.config?.teamMembers || DEFAULT_CONFIG.teamMembers;
    const today = new Date();

    grid.innerHTML = members.map(member => {
        const memberEvents = appData.events.filter(e =>
            (e.teamMembers || []).some(m => m.toLowerCase() === member.toLowerCase()) &&
            e.status !== 'Cancelled'
        );
        const upcoming = memberEvents
            .filter(e => new Date(e.endDate || e.startDate) >= today)
            .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

        const eventsList = upcoming.slice(0, 6).map(e =>
            `<li><span>${escHtml(e.title.substring(0, 35))}${e.title.length > 35 ? '...' : ''}</span><span>${formatShortDate(e.startDate)}</span></li>`
        ).join('');

        return `
            <div class="team-card">
                <h4>${escHtml(member)}</h4>
                <div class="trip-count">${upcoming.length} upcoming trip${upcoming.length !== 1 ? 's' : ''}</div>
                <ul class="team-card-events">
                    ${eventsList || '<li style="color:var(--neutral-subtle);font-style:italic">No upcoming travel</li>'}
                </ul>
                ${upcoming.length > 6 ? `<div style="font-size:0.75rem;color:var(--neutral-subtle);margin-top:0.3rem">+${upcoming.length - 6} more</div>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================================
// Thought Leadership
// ============================================================

function renderThoughtLeadership() {
    const tbody = document.getElementById('tl-tbody');
    tbody.innerHTML = appData.thoughtLeadership.map(item => `
        <tr>
            <td><strong>${escHtml(item.eventName)}</strong></td>
            <td>${escHtml(item.presentationTitle || '')}</td>
            <td>${escHtml((item.speakers || []).join(', '))}</td>
            <td>${item.submissionDeadline ? formatShortDate(item.submissionDeadline) : '-'}</td>
            <td><span class="badge badge-${(item.status || 'pending').toLowerCase()}">${escHtml(item.status || 'Draft')}</span></td>
            <td>
                <button class="btn btn-sm" onclick="openTLForm('${item.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTL('${item.id}')">✕</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('add-tl-btn').onclick = () => openTLForm();
}

function openTLForm(itemId) {
    const item = itemId ? appData.thoughtLeadership.find(i => i.id === itemId) : null;
    document.getElementById('modal-title').textContent = item ? 'Edit Submission' : 'New Submission';
    document.getElementById('modal-body').innerHTML = `
        <form id="tl-form">
            <input type="hidden" name="id" value="${item?.id || ''}">
            <div class="form-group">
                <label>Event / Publication *</label>
                <input type="text" name="eventName" class="input input-wide" required value="${escHtml(item?.eventName || '')}">
            </div>
            <div class="form-group">
                <label>Presentation Title</label>
                <input type="text" name="presentationTitle" class="input input-wide" value="${escHtml(item?.presentationTitle || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Speakers (comma-separated)</label>
                    <input type="text" name="speakers" class="input input-wide" value="${escHtml((item?.speakers || []).join(', '))}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="input input-wide">
                        ${['Draft','Submitted','Approved','Presented'].map(s => `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Submission Deadline</label>
                    <input type="date" name="submissionDeadline" class="input input-wide" value="${item?.submissionDeadline || ''}">
                </div>
                <div class="form-group">
                    <label>Event Date</label>
                    <input type="date" name="eventDateTime" class="input input-wide" value="${item?.eventDateTime || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Abstract</label>
                <textarea name="abstract" class="input">${escHtml(item?.abstract || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Speaker Bios</label>
                <textarea name="speakerBios" class="input">${escHtml(item?.speakerBios || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${item ? 'Update' : 'Create'}</button>
            </div>
        </form>
    `;
    document.getElementById('tl-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const id = fd.get('id') || generateId();
        const entry = {
            id,
            eventName: fd.get('eventName'),
            presentationTitle: fd.get('presentationTitle'),
            speakers: fd.get('speakers').split(',').map(s => s.trim()).filter(Boolean),
            status: fd.get('status'),
            submissionDeadline: fd.get('submissionDeadline'),
            eventDateTime: fd.get('eventDateTime'),
            abstract: fd.get('abstract'),
            speakerBios: fd.get('speakerBios'),
        };
        const idx = appData.thoughtLeadership.findIndex(i => i.id === id);
        if (idx >= 0) { appData.thoughtLeadership[idx] = entry; }
        else { appData.thoughtLeadership.push(entry); }
        await saveData();
        closeModal();
        renderThoughtLeadership();
    });
    openModal();
}

async function deleteTL(itemId) {
    if (!confirm('Delete this entry?')) return;
    appData.thoughtLeadership = appData.thoughtLeadership.filter(i => i.id !== itemId);
    await saveData();
    renderThoughtLeadership();
}

// ============================================================
// Settings
// ============================================================

function initSettings() {
    document.getElementById('sp-site-url').value = storage.spSiteUrl || '';
    document.getElementById('sp-library-name').value = storage.spLibrary || 'FMPSData';

    document.getElementById('save-config-btn').addEventListener('click', async () => {
        const url = document.getElementById('sp-site-url').value.trim();
        const lib = document.getElementById('sp-library-name').value.trim();
        storage.configure(url, lib);
        if (url) {
            appData = await storage.load();
            storage.startSync(15000);
            renderCurrentView();
            alert('Connected to SharePoint! Data will now sync across users.');
        } else {
            alert('Saved in local mode (no sync).');
        }
    });

    document.getElementById('test-connection-btn').addEventListener('click', async () => {
        const result = await storage.testConnection();
        alert(result.message);
    });

    document.getElementById('config-category').addEventListener('change', renderSettings);
    document.getElementById('config-add-btn').addEventListener('click', addConfigValue);
}

function renderSettings() {
    const category = document.getElementById('config-category').value;
    const values = appData.config?.[category] || DEFAULT_CONFIG[category] || [];
    const list = document.getElementById('config-list');
    list.innerHTML = values.map((v, i) => `
        <div class="config-item">
            <span>${escHtml(v)}</span>
            <button class="btn btn-sm btn-danger" onclick="removeConfigValue('${category}', ${i})">✕</button>
        </div>
    `).join('');
}

async function addConfigValue() {
    const category = document.getElementById('config-category').value;
    const input = document.getElementById('config-new-value');
    const value = input.value.trim();
    if (!value) return;

    if (!appData.config) appData.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!appData.config[category]) appData.config[category] = [];
    appData.config[category].push(value);
    input.value = '';
    await saveData();
    renderSettings();
}

async function removeConfigValue(category, index) {
    if (!appData.config?.[category]) return;
    appData.config[category].splice(index, 1);
    await saveData();
    renderSettings();
}

// ============================================================
// Modal
// ============================================================

function initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function openModal() { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ============================================================
// Helpers
// ============================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDateRange(start, end) {
    if (!start) return '-';
    const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!end || end === start) return s;
    const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function saveData() {
    showSyncStatus('syncing');
    try {
        await storage.save(appData);
        showSyncStatus('synced');
    } catch (e) {
        showSyncStatus('error');
        console.error('Save failed:', e);
    }
}

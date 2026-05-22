/**
 * FMPS Coordination Tool - Main Application
 * Dashboard-first design with charts, map, icons, and enhanced filtering.
 */

let appData = null;
let dashMap = null;
let fullMap = null;
let travelChart = null;
let weeklyOffset = 0; // 0 = current week of the month

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Restore file system handle if previously connected
    if (storage.mode === 'filesystem') {
        await storage.restoreFolder();
    }

    appData = await storage.load();

    // Seed data: if no events exist, load from spreadsheet data
    if (!appData.events || appData.events.length === 0) {
        appData.events = SEED_EVENTS.map(e => ({...e}));
    }
    if (!appData.thoughtLeadership || appData.thoughtLeadership.length === 0) {
        appData.thoughtLeadership = SEED_SPEAKING.map(e => ({...e}));
    }
    if (!appData.assets || appData.assets.length === 0) {
        appData.assets = SEED_TRADE_SHOW_ASSETS.map(e => ({...e}));
    }

    storage.onDataChange = (newData) => {
        appData = newData;
        renderCurrentView();
        showSyncStatus('synced');
    };
    storage.startSync(storage.mode === 'filesystem' ? 5000 : 15000);

    initNavigation();
    initCalendar();
    initEventFilters();
    initSettings();
    initModal();
    initGlobalSearch();
    renderCurrentView();
    showSyncStatus('synced');
});

// ============================================================
// Navigation
// ============================================================

let currentView = 'dashboard';

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.view);
        });
    });
}

function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    renderCurrentView();
}

function renderCurrentView() {
    switch (currentView) {
        case 'dashboard': renderDashboard(); break;
        case 'calendar': renderCalendar(); break;
        case 'events': renderEventsTable(); break;
        case 'map': renderMap(); break;
        case 'assets': renderAssets(); break;
        case 'travel': renderTeamTravel(); break;
        case 'thought-leadership': renderThoughtLeadership(); break;
        case 'settings': renderSettings(); break;
    }
}

// ============================================================
// Global Search
// ============================================================

function initGlobalSearch() {
    const input = document.getElementById('global-search');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = input.value.trim().toLowerCase();
            if (q) {
                navigateTo('events');
                document.getElementById('event-search').value = q;
                renderEventsTable();
            }
        }
    });
}

// ============================================================
// Sync Status
// ============================================================

function showSyncStatus(state) {
    const el = document.getElementById('sync-status');
    el.className = 'sync-badge ' + state;
    const label = el.querySelector('span:last-child');
    switch (state) {
        case 'synced': label.textContent = 'Synced'; break;
        case 'syncing': label.textContent = 'Syncing...'; break;
        case 'error': label.textContent = 'Offline'; break;
    }
}

// ============================================================
// Event Category Helpers
// ============================================================

function getEventCategory(eventType) {
    return EVENT_CATEGORY_MAP[eventType] || 'other';
}

function getCategoryIcon(category) {
    const icons = {
        tradeshow: '<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M5 6V4a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5"/></svg>',
        training: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 2l6 3-6 3-6-3 6-3z" stroke="currentColor" stroke-width="1.5"/><path d="M14 7v4M4 6.5v4a4 4 0 008 0v-4" stroke="currentColor" stroke-width="1.5"/></svg>',
        speaking: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 2v6M6 5l2 3 2-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 9a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.5"/><path d="M8 13v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        sales: '<svg viewBox="0 0 16 16" fill="none"><path d="M3 11l3-3 2 2 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 5h3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        exhibit: '<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="4" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M6 4V2h4v2" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h10" stroke="currentColor" stroke-width="1.5"/></svg>',
        other: '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    };
    return icons[category] || icons.other;
}

// ============================================================
// Dashboard
// ============================================================

function renderDashboard() {
    const today = new Date();
    const todayStr = todayLocal();
    const events = appData.events || [];

    // Stats - only current and future events
    const upcoming = events.filter(e => (e.endDate || e.startDate) >= todayStr && e.status !== 'Cancelled');
    document.getElementById('dash-total-events').textContent = upcoming.length;
    document.getElementById('dash-confirmed').textContent = upcoming.filter(e => e.status === 'Confirmed').length;

    // People traveling this month
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const travelingThisMonth = new Set();
    events.forEach(e => {
        if (e.status === 'Cancelled') return;
        const start = new Date(e.startDate);
        if (start.getMonth() === thisMonth && start.getFullYear() === thisYear) {
            (e.teamMembers || []).forEach(m => travelingThisMonth.add(m));
        }
    });
    document.getElementById('dash-people-out').textContent = travelingThisMonth.size;

    // Equipment reserved
    const activeReservations = (appData.reservations || []).filter(r => r.status !== 'Returned' && r.status !== 'Cancelled');
    const totalReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
    document.getElementById('dash-equipment-out').textContent = totalReserved;

    // Upcoming events list
    renderUpcomingList(upcoming);

    // Weekly availability
    renderWeeklyAvailability();

    // Mini map
    setTimeout(() => renderDashMap(), 100);
}

function renderUpcomingList(upcoming) {
    const list = document.getElementById('dash-upcoming-list');
    const sorted = upcoming.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')).slice(0, 8);

    list.innerHTML = sorted.map(ev => {
        const cat = getEventCategory(ev.eventType);
        return `
            <div class="event-item" onclick="openEventForm('${ev.id}')">
                <div class="event-type-icon ${cat}">${getCategoryIcon(cat)}</div>
                <div class="event-item-info">
                    <div class="event-item-title">${escHtml(ev.title)}</div>
                    <div class="event-item-meta">${escHtml(ev.eventType || '')} · ${escHtml((ev.teamMembers || []).slice(0, 2).join(', '))}</div>
                </div>
                <div class="event-item-date">${formatShortDate(ev.startDate)}</div>
            </div>
        `;
    }).join('') || '<div style="padding:1rem;text-align:center;color:var(--strong-gray);font-size:0.85rem">No upcoming events</div>';
}

function getWeekRangesForMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let start = new Date(firstDay);
    // Align to Monday
    const dow = start.getDay();
    if (dow !== 1) start.setDate(start.getDate() - ((dow + 6) % 7));
    while (start <= lastDay) {
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        weeks.push({ start: new Date(start), end: new Date(end) });
        start.setDate(start.getDate() + 7);
    }
    return weeks;
}

function renderWeeklyAvailability() {
    const grid = document.getElementById('weekly-availability-grid');
    if (!grid) return;

    const today = new Date();
    const targetMonth = today.getMonth() + weeklyOffset;
    const targetDate = new Date(today.getFullYear(), targetMonth, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const weeks = getWeekRangesForMonth(year, month);
    const coreTeam = appData.config?.coreTeam || DEFAULT_CONFIG.coreTeam || DEFAULT_CONFIG.teamMembers.slice(0, 5);
    const events = appData.events || [];

    // Update label
    const label = document.getElementById('week-label');
    if (label) label.textContent = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Render weeks with core team availability
    grid.innerHTML = weeks.map((w, idx) => {
        const wStart = `${w.start.getFullYear()}-${String(w.start.getMonth()+1).padStart(2,'0')}-${String(w.start.getDate()).padStart(2,'0')}`;
        const wEnd = `${w.end.getFullYear()}-${String(w.end.getMonth()+1).padStart(2,'0')}-${String(w.end.getDate()).padStart(2,'0')}`;
        const dateLabel = `${w.start.toLocaleDateString('en-US', {month:'short', day:'numeric'})} \u2013 ${w.end.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;

        // Count weekdays in this week range (Mon-Fri = 5 max)
        const weekdays = 5;

        // For each core team member, count days they are busy this week
        const memberAvail = coreTeam.map(m => {
            let busyDays = 0;
            events.forEach(ev => {
                if (ev.status === 'Cancelled' || !ev.startDate) return;
                const evStart = ev.startDate;
                const evEnd = ev.endDate || ev.startDate;
                if (evStart <= wEnd && evEnd >= wStart) {
                    if ((ev.teamMembers || []).some(tm => tm.toLowerCase() === m.toLowerCase())) {
                        // Count overlapping weekdays
                        const overlapStart = new Date(Math.max(new Date(evStart), w.start));
                        const overlapEnd = new Date(Math.min(new Date(evEnd), w.end));
                        let d = new Date(overlapStart);
                        while (d <= overlapEnd) {
                            const dow = d.getDay();
                            if (dow >= 1 && dow <= 5) busyDays++;
                            d.setDate(d.getDate() + 1);
                        }
                    }
                }
            });
            const availDays = Math.max(0, weekdays - busyDays);
            return { name: m, availDays };
        });

        const memberBubbles = memberAvail.map(ma => {
            let cls = 'wa-green';
            if (ma.availDays === 4) cls = 'wa-yellow';
            else if (ma.availDays <= 3) cls = 'wa-red';
            return `<span class="wa-bubble ${cls}" title="${ma.name}: ${ma.availDays} days available">${escHtml(ma.name)}</span>`;
        }).join('');

        return `
            <div class="wa-week">
                <div class="wa-week-header">${dateLabel}</div>
                <div class="wa-bubble-list">${memberBubbles}</div>
            </div>
        `;
    }).join('');

    // Navigation listeners
    document.getElementById('week-prev').onclick = () => { weeklyOffset--; renderWeeklyAvailability(); };
    document.getElementById('week-next').onclick = () => { weeklyOffset++; renderWeeklyAvailability(); };
}

// ============================================================
// Dashboard Map
// ============================================================

function renderDashMap() {
    const container = document.getElementById('dash-map');
    if (!container) return;

    if (!dashMap) {
        dashMap = L.map('dash-map', { zoomControl: false, attributionControl: false }).setView([30, -20], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
        }).addTo(dashMap);
    }

    // Clear existing markers
    dashMap.eachLayer(l => { if (l instanceof L.CircleMarker) dashMap.removeLayer(l); });

    // Add event markers (upcoming only)
    const todayStr = todayLocal();
    const events = (appData.events || []).filter(e => e.status !== 'Cancelled' && e.location && (e.endDate || e.startDate) >= todayStr);
    events.forEach(ev => {
        const loc = resolveLocation(ev.location);
        if (loc) {
            const cat = getEventCategory(ev.eventType);
            const color = getCategoryColor(cat);
            L.circleMarker([loc.lat, loc.lng], {
                radius: 6,
                fillColor: color,
                fillOpacity: 0.8,
                color: '#fff',
                weight: 1.5,
            }).bindPopup(`<strong>${escHtml(ev.title)}</strong><br>${formatShortDate(ev.startDate)}`).addTo(dashMap);
        }
    });

    setTimeout(() => dashMap.invalidateSize(), 200);
}

// ============================================================
// Full Map View
// ============================================================

function renderMap() {
    const container = document.getElementById('event-map');
    if (!container) return;

    if (!fullMap) {
        fullMap = L.map('event-map', { attributionControl: false }).setView([30, -20], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(fullMap);
    }

    const filterStatus = document.getElementById('map-filter-status').value;
    document.getElementById('map-filter-status').onchange = () => renderMap();

    // Clear markers
    fullMap.eachLayer(l => { if (l instanceof L.CircleMarker) fullMap.removeLayer(l); });

    const todayStr = todayLocal();
    const events = (appData.events || []).filter(e => {
        if (e.status === 'Cancelled') return false;
        if (filterStatus && e.status !== filterStatus) return false;
        // Only show current and future events on the map
        if ((e.endDate || e.startDate) < todayStr) return false;
        return e.location;
    });

    events.forEach(ev => {
        const loc = resolveLocation(ev.location);
        if (loc) {
            const cat = getEventCategory(ev.eventType);
            const color = getCategoryColor(cat);
            L.circleMarker([loc.lat, loc.lng], {
                radius: 8,
                fillColor: color,
                fillOpacity: 0.85,
                color: '#fff',
                weight: 2,
            }).bindPopup(`
                <strong>${escHtml(ev.title)}</strong><br>
                <em>${escHtml(ev.eventType || '')}</em><br>
                ${formatDateRange(ev.startDate, ev.endDate)}<br>
                ${escHtml((ev.teamMembers || []).join(', '))}
            `).addTo(fullMap);
        }
    });

    setTimeout(() => fullMap.invalidateSize(), 200);
}

function resolveLocation(locationStr) {
    if (!locationStr) return null;
    // Try direct match
    if (VENUE_LOCATIONS[locationStr]) return VENUE_LOCATIONS[locationStr];
    // Partial match
    const lower = locationStr.toLowerCase();
    for (const [key, val] of Object.entries(VENUE_LOCATIONS)) {
        if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return val;
    }
    return null;
}

function getCategoryColor(cat) {
    const colors = {
        tradeshow: '#0071B2',
        training: '#00856A',
        speaking: '#193E92',
        sales: '#F4B223',
        exhibit: '#4FA838',
        other: '#595959',
    };
    return colors[cat] || colors.other;
}

// ============================================================
// Calendar
// ============================================================

let calYear, calMonth;
let calFilter = 'all';

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

    // Filter chips
    document.getElementById('cal-filter-chips').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('#cal-filter-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        calFilter = chip.dataset.filter;
        renderCalendar();
    });
}

function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('current-month-label').textContent = `${monthNames[calMonth]} ${calYear}`;
    document.getElementById('year-select').value = calYear;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
        grid.innerHTML += `<div class="cal-header">${d}</div>`;
    });

    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const todayStr = todayLocal();

    // Previous month padding
    const prevMonthLast = new Date(calYear, calMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
        grid.innerHTML += `<div class="cal-day other-month"><div class="cal-day-num">${prevMonthLast - i}</div></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayEvents = getEventsForDate(dateStr);

        let eventsHtml = '';
        dayEvents.slice(0, 3).forEach(ev => {
            const cat = getEventCategory(ev.eventType);
            eventsHtml += `<div class="cal-event cat-${cat}" title="${escHtml(ev.title)}" onclick="openEventForm('${ev.id}')">${escHtml(ev.title)}</div>`;
        });
        if (dayEvents.length > 3) {
            eventsHtml += `<div class="cal-event cat-other" style="font-style:italic">+${dayEvents.length - 3} more</div>`;
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
    return (appData.events || []).filter(ev => {
        if (!ev.startDate || ev.status === 'Cancelled') return false;
        // Category filter
        if (calFilter !== 'all') {
            const cat = getEventCategory(ev.eventType);
            if (cat !== calFilter) return false;
        }
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
    document.getElementById('filter-region').addEventListener('change', renderEventsTable);
    document.getElementById('filter-timeframe').addEventListener('change', renderEventsTable);
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
    const regionVal = document.getElementById('filter-region').value;
    const timeframe = document.getElementById('filter-timeframe').value;
    const today = todayLocal();

    const filtered = (appData.events || []).filter(ev => {
        // Timeframe filter (past vs current/upcoming)
        if (timeframe === 'upcoming') {
            if ((ev.endDate || ev.startDate) < today) return false;
        } else if (timeframe === 'past') {
            if ((ev.endDate || ev.startDate) >= today) return false;
        } else if (timeframe === 'this-year') {
            const year = new Date().getFullYear().toString();
            if (!ev.startDate || !ev.startDate.startsWith(year)) return false;
        }
        // Text search
        if (search && !ev.title.toLowerCase().includes(search) && !(ev.teamMembers || []).join(' ').toLowerCase().includes(search) && !(ev.location || '').toLowerCase().includes(search)) return false;
        if (statusVal && ev.status !== statusVal) return false;
        if (typeVal && ev.eventType !== typeVal) return false;
        if (regionVal && ev.theater !== regionVal) return false;
        return true;
    }).sort((a, b) => {
        // Past events: sort newest first; upcoming: sort soonest first
        if (timeframe === 'past') return (b.startDate || '').localeCompare(a.startDate || '');
        return (a.startDate || '').localeCompare(b.startDate || '');
    });

    // Show count
    const countEl = document.getElementById('events-count');
    if (countEl) countEl.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = filtered.map(ev => {
        const cat = getEventCategory(ev.eventType);
        return `
        <tr>
            <td><span class="event-type-badge ${cat}">${getCategoryIcon(cat)} ${escHtml(getShortType(ev.eventType))}</span></td>
            <td><strong>${escHtml(ev.title)}</strong></td>
            <td>${escHtml(ev.theater || '')}</td>
            <td>${escHtml((ev.teamMembers || []).join(', '))}</td>
            <td>${formatDateRange(ev.startDate, ev.endDate)}</td>
            <td>${escHtml(ev.displayType || '')}</td>
            <td><span class="badge badge-${(ev.status || 'pending').toLowerCase()}">${escHtml(ev.status || 'Pending')}</span></td>
            <td>
                <div class="table-actions">
                    <button class="neo-btn-icon" onclick="exportEventICS('${ev.id}')" title="Export to Calendar (.ics)">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M12 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1zM5 1v2M11 1v2M3 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                    <button class="neo-btn-icon" onclick="openEventForm('${ev.id}')" title="Edit">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-7 7H4.5v-2l7-7z" stroke="currentColor" stroke-width="1.5"/></svg>
                    </button>
                    <button class="neo-btn-icon neo-btn-danger" onclick="deleteEvent('${ev.id}')" title="Delete">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M4 5h8M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5v7a1 1 0 001 1h4a1 1 0 001-1V5" stroke="currentColor" stroke-width="1.5"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function getShortType(type) {
    if (!type) return '';
    if (type.length <= 12) return type;
    // Abbreviate common types
    return type.replace('Trade Show + ', 'TS+').replace('Trade Show', 'Trade Show');
}

// ============================================================
// Event Form (Modal)
// ============================================================

function openEventForm(eventId) {
    const ev = eventId ? (appData.events || []).find(e => e.id === eventId) : null;
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

    // Build asset checkboxes - check which are already reserved for this event
    const existingReservations = eventId
        ? (appData.reservations || []).filter(r => r.eventId === eventId && r.status !== 'Cancelled' && r.status !== 'Returned')
        : [];
    const reservedAssetIds = new Set(existingReservations.map(r => r.assetId));
    const assetOptions = (appData.assets || []).filter(a => a.totalQuantity > 0).map(a => {
        const checked = reservedAssetIds.has(a.id) ? 'checked' : '';
        const qtyLabel = a.totalQuantity > 100 ? '∞' : a.totalQuantity;
        return `<label class="checkbox-label asset-check"><input type="checkbox" name="eventAssets" value="${a.id}" ${checked}> <span>${escHtml(a.title)}</span><span class="asset-qty-badge">${qtyLabel}</span></label>`;
    }).join('');

    document.getElementById('modal-title').textContent = isEdit ? 'Edit Event' : 'New Event';
    document.getElementById('modal-body').innerHTML = `
        <form id="event-form">
            <input type="hidden" name="id" value="${ev?.id || ''}">
            <div class="form-group">
                <label>Event Name *</label>
                <input type="text" name="title" class="neo-input neo-input-full" required value="${escHtml(ev?.title || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Event Type *</label>
                    <select name="eventType" class="neo-select neo-input-full" required>
                        <option value="">Select...</option>
                        ${eventTypeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="neo-select neo-input-full">
                        ${['Pending','Confirmed','Placeholder','Done','Cancelled'].map(s => `<option value="${s}" ${ev?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="date" name="startDate" class="neo-input neo-input-full" required value="${ev?.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" class="neo-input neo-input-full" value="${ev?.endDate || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Region</label>
                    <select name="theater" class="neo-select neo-input-full">
                        ${['NA','LATAM','EMEA','APAC'].map(r => `<option value="${r}" ${ev?.theater === r ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Location / City</label>
                    <input type="text" name="location" class="neo-input neo-input-full" value="${escHtml(ev?.location || '')}" placeholder="e.g. Las Vegas, Chicago" list="location-list">
                    <datalist id="location-list">
                        ${Object.keys(VENUE_LOCATIONS).map(l => `<option value="${l}">`).join('')}
                    </datalist>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Display Type</label>
                    <select name="displayType" class="neo-select neo-input-full">
                        <option value="">Select...</option>
                        ${displayOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Booth Size</label>
                    <select name="boothSize" class="neo-select neo-input-full">
                        <option value="">Select...</option>
                        ${(config.boothSizes || DEFAULT_CONFIG.boothSizes).map(s => `<option value="${escHtml(s)}" ${ev?.boothSize === s ? 'selected' : ''}>${escHtml(s)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tradeshow Owner</label>
                    <input type="text" name="tradeshowOwner" class="neo-input neo-input-full" value="${escHtml(ev?.tradeshowOwner || '')}">
                </div>
                <div class="form-group">
                    <label>BU Owner</label>
                    <input type="text" name="buOwner" class="neo-input neo-input-full" value="${escHtml(ev?.buOwner || '')}">
                </div>
            </div>
            <div class="form-group">
                <label>Team Members</label>
                <div class="checkbox-wrap">
                    ${teamOptions}
                </div>
            </div>
            <div class="form-group">
                <label>Equipment / Assets</label>
                <div class="asset-checklist">
                    ${assetOptions}
                </div>
                <p class="form-hint">Select equipment needed. Limited items have a 2-day buffer on each side.</p>
            </div>
            <div class="form-group">
                <label>Speaker Deadline</label>
                <input type="date" name="speakerDeadline" class="neo-input neo-input-full" value="${ev?.speakerDeadline || ''}">
            </div>
            <div class="form-group">
                <label>Who is Traveling?</label>
                <textarea name="travelDetails" class="neo-input neo-input-full" rows="2">${escHtml(ev?.travelDetails || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Show Notes</label>
                <textarea name="showNotes" class="neo-input neo-input-full" rows="2">${escHtml(ev?.showNotes || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Budget</label>
                <input type="number" name="budget" class="neo-input neo-input-full" value="${ev?.budget || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="neo-btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="neo-btn neo-btn-primary">${isEdit ? 'Update' : 'Create'} Event</button>
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
    const selectedAssets = Array.from(form.querySelectorAll('input[name="eventAssets"]:checked')).map(cb => cb.value);

    const event = {
        id,
        title: formData.get('title'),
        eventType: formData.get('eventType'),
        status: formData.get('status'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate') || formData.get('startDate'),
        theater: formData.get('theater'),
        location: formData.get('location'),
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

    if (event.startDate) {
        event.graphicsDeadline = shiftDate(event.startDate, -56);
    }

    const idx = (appData.events || []).findIndex(ev => ev.id === id);
    if (idx >= 0) {
        appData.events[idx] = event;
    } else {
        if (!appData.events) appData.events = [];
        appData.events.push(event);
    }

    // Sync asset reservations for this event
    if (!appData.reservations) appData.reservations = [];
    // Remove old reservations for this event that are no longer selected
    const existingRes = appData.reservations.filter(r => r.eventId === id && r.status !== 'Cancelled' && r.status !== 'Returned');
    const existingAssetIds = new Set(existingRes.map(r => r.assetId));
    const newAssetIds = new Set(selectedAssets);

    // Cancel deselected assets
    existingRes.forEach(r => {
        if (!newAssetIds.has(r.assetId)) {
            r.status = 'Cancelled';
        } else {
            // Keep reservation but update dates/owner to match event edits
            r.startDate = event.startDate;
            r.endDate = event.endDate;
            r.reservedBy = teamMembers[0] || r.reservedBy;
        }
    });

    // Add newly selected assets
    for (const assetId of selectedAssets) {
        if (!existingAssetIds.has(assetId)) {
            const asset = (appData.assets || []).find(a => a.id === assetId);
            if (!asset) continue;
            // Check availability with buffer
            const reserved = getReservedQuantityForDates(assetId, event.startDate, event.endDate);
            if (reserved >= asset.totalQuantity && asset.totalQuantity <= 100) continue; // skip if unavailable
            appData.reservations.push({
                id: generateId(),
                assetId,
                eventId: id,
                quantity: 1,
                startDate: event.startDate,
                endDate: event.endDate,
                reservedBy: teamMembers[0] || '',
                status: 'Reserved',
            });
        }
    }

    const saved = await saveData();
    if (saved === false) return; // keep modal open on failure
    closeModal();
    renderCurrentView();
}

function openEventDetail(eventId) {
    openEventForm(eventId);
}

async function deleteEvent(eventId) {
    if (!confirm('Delete this event?')) return;
    // Remove only the first matching event (safeguard against duplicate IDs)
    const idx = (appData.events || []).findIndex(e => e.id === eventId);
    if (idx >= 0) appData.events.splice(idx, 1);
    // Clean up orphaned reservations for this event
    (appData.reservations || []).forEach(r => {
        if (r.eventId === eventId && r.status !== 'Returned' && r.status !== 'Cancelled') {
            r.status = 'Cancelled';
        }
    });
    await saveData();
    renderCurrentView();
}

// ============================================================
// ICS Calendar Export
// ============================================================

function formatICSDate(dateStr) {
    // Convert YYYY-MM-DD to YYYYMMDD (all-day event format)
    return dateStr.replace(/-/g, '');
}

function generateICS(events) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FMPS Coordination Tool//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    events.forEach(ev => {
        if (!ev.startDate) return;
        const start = formatICSDate(ev.startDate);
        // End date for all-day events needs to be the day AFTER
        const endDate = ev.endDate || ev.startDate;
        const endStr = shiftDate(endDate, 1).replace(/-/g, '');

        const description = [
            ev.eventType ? `Type: ${ev.eventType}` : '',
            ev.location ? `Location: ${ev.location}` : '',
            (ev.teamMembers || []).length > 0 ? `Team: ${ev.teamMembers.join(', ')}` : '',
            ev.displayType ? `Display: ${ev.displayType}` : '',
            ev.showNotes ? `Notes: ${ev.showNotes}` : '',
        ].filter(Boolean).join('\\n');

        lines.push('BEGIN:VEVENT');
        lines.push(`DTSTART;VALUE=DATE:${start}`);
        lines.push(`DTEND;VALUE=DATE:${endStr}`);
        lines.push(`SUMMARY:${escICS(ev.title)}`);
        if (ev.location) lines.push(`LOCATION:${escICS(ev.location)}`);
        if (description) lines.push(`DESCRIPTION:${escICS(description)}`);
        lines.push(`STATUS:${ev.status === 'Confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`);
        lines.push(`UID:${ev.id}@fmps-coordination-tool`);
        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

function escICS(str) {
    return (str || '').replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
}

function exportEventICS(eventId) {
    const ev = (appData.events || []).find(e => e.id === eventId);
    if (!ev) return;
    downloadICS(generateICS([ev]), `${ev.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.ics`);
}

function exportAllEventsICS() {
    const todayStr = todayLocal();
    const upcoming = (appData.events || []).filter(e =>
        e.status !== 'Cancelled' && (e.endDate || e.startDate) >= todayStr
    );
    if (upcoming.length === 0) { alert('No upcoming events to export.'); return; }
    downloadICS(generateICS(upcoming), 'FMPS_Events.ics');
}

function downloadICS(icsContent, filename) {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Assets
// ============================================================

function renderAssets() {
    const tbody = document.getElementById('assets-tbody');
    tbody.innerHTML = (appData.assets || []).map(asset => {
        const reserved = getReservedQuantityNow(asset.id);
        const available = asset.totalQuantity - reserved;
        const showAvail = asset.totalQuantity > 100 ? '∞' : available;
        return `
            <tr>
                <td><strong>${escHtml(asset.title)}</strong></td>
                <td>${escHtml(asset.category || '')}</td>
                <td>${asset.totalQuantity > 100 ? '∞' : asset.totalQuantity}</td>
                <td>${reserved}</td>
                <td><span style="color:${available > 0 ? 'var(--accent-green)' : 'var(--alert-red)'}; font-weight:600">${showAvail}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="neo-btn-icon neo-btn-danger" onclick="deleteAsset('${asset.id}')" title="Delete">
                            <svg viewBox="0 0 16 16" fill="none"><path d="M4 5h8M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5v7a1 1 0 001 1h4a1 1 0 001-1V5" stroke="currentColor" stroke-width="1.5"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Reservations
    const resTbody = document.getElementById('reservations-tbody');
    const activeRes = (appData.reservations || []).filter(r => r.status !== 'Cancelled');
    resTbody.innerHTML = activeRes.map(res => {
        const asset = (appData.assets || []).find(a => a.id === res.assetId);
        const event = (appData.events || []).find(e => e.id === res.eventId);
        return `
            <tr>
                <td>${escHtml(asset?.title || res.assetId)}</td>
                <td>${escHtml(event?.title || res.eventId)}</td>
                <td>${res.quantity}</td>
                <td>${formatDateRange(res.startDate, res.endDate)}</td>
                <td>${escHtml(res.reservedBy || '')}</td>
                <td><span class="badge badge-${res.status === 'Returned' ? 'done' : 'reserved'}">${res.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="neo-btn-icon" onclick="returnReservation('${res.id}')" title="Return">
                            <svg viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="neo-btn-icon neo-btn-danger" onclick="cancelReservation('${res.id}')" title="Cancel">
                            <svg viewBox="0 0 16 16" fill="none"><path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('add-asset-btn').onclick = () => openAssetForm();
    document.getElementById('register-show-btn')?.addEventListener('click', () => openRegisterShowForm());
}

function getReservedQuantityNow(assetId) {
    return (appData.reservations || [])
        .filter(r => r.assetId === assetId && r.status !== 'Returned' && r.status !== 'Cancelled')
        .reduce((sum, r) => sum + r.quantity, 0);
}

function getReservedQuantityForDates(assetId, startDate, endDate) {
    const asset = (appData.assets || []).find(a => a.id === assetId);
    const needsBuffer = asset && asset.totalQuantity <= 100;
    // Add 2-day buffer on each side for limited-quantity assets
    let checkStart = startDate;
    let checkEnd = endDate;
    if (needsBuffer) {
        checkStart = shiftDate(startDate, -2);
        checkEnd = shiftDate(endDate, 2);
    }
    return (appData.reservations || [])
        .filter(r => r.assetId === assetId && r.status !== 'Returned' && r.status !== 'Cancelled'
            && r.startDate <= checkEnd && r.endDate >= checkStart)
        .reduce((sum, r) => sum + r.quantity, 0);
}

function openAssetForm() {
    document.getElementById('modal-title').textContent = 'Add Asset';
    document.getElementById('modal-body').innerHTML = `
        <form id="asset-form">
            <div class="form-group">
                <label>Asset Name *</label>
                <input type="text" name="title" class="neo-input neo-input-full" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Part Number *</label>
                    <input type="text" name="partNumber" class="neo-input neo-input-full" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="neo-select neo-input-full">
                        ${DEFAULT_CONFIG.assetCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Quantity</label>
                    <input type="number" name="totalQuantity" class="neo-input neo-input-full" value="1" min="1">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" class="neo-input neo-input-full">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="neo-btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="neo-btn neo-btn-primary">Add Asset</button>
            </div>
        </form>
    `;
    document.getElementById('asset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (!appData.assets) appData.assets = [];
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
    openRegisterShowForm(assetId);
}

function openRegisterShowForm(preselectedAssetId) {
    const assets = appData.assets || [];
    const eventOptions = (appData.events || []).filter(e => e.status !== 'Cancelled' && e.status !== 'Done')
        .map(e => `<option value="${e.id}">${escHtml(e.title)} (${e.startDate || 'no date'})</option>`).join('');

    const assetCheckboxes = assets.filter(a => a.totalQuantity > 0).map(a => {
        const checked = a.id === preselectedAssetId ? 'checked' : '';
        const qtyLabel = a.totalQuantity > 100 ? '∞' : a.totalQuantity;
        return `<label class="checkbox-label asset-check">
            <input type="checkbox" name="assets" value="${a.id}" ${checked}>
            <span>${escHtml(a.title)}</span>
            <span class="asset-qty-badge">${qtyLabel}</span>
        </label>`;
    }).join('');

    document.getElementById('modal-title').textContent = 'Register Show Equipment';
    document.getElementById('modal-body').innerHTML = `
        <form id="register-show-form">
            <div class="form-group">
                <label>Event *</label>
                <select name="eventId" class="neo-select neo-input-full" required>
                    <option value="">Select event...</option>
                    ${eventOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" class="neo-input neo-input-full">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" class="neo-input neo-input-full">
                </div>
            </div>
            <div class="form-group">
                <label>Reserved By</label>
                <input type="text" name="reservedBy" class="neo-input neo-input-full">
            </div>
            <div class="form-group">
                <label>Select Equipment (multiple allowed)</label>
                <div class="asset-checklist">${assetCheckboxes}</div>
                <p class="form-hint">Items with limited quantity include a 2-day buffer on each side of the event dates.</p>
            </div>
            <div id="register-show-warnings" class="form-warnings"></div>
            <div class="form-actions">
                <button type="button" class="neo-btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="neo-btn neo-btn-primary">Register Equipment</button>
            </div>
        </form>
    `;

    // Auto-fill dates when event is selected
    document.querySelector('#register-show-form select[name="eventId"]').addEventListener('change', (e) => {
        const ev = (appData.events || []).find(ev => ev.id === e.target.value);
        if (ev) {
            document.querySelector('#register-show-form input[name="startDate"]').value = ev.startDate || '';
            document.querySelector('#register-show-form input[name="endDate"]').value = ev.endDate || '';
            updateRegisterShowWarnings();
        }
    });

    // Check availability when dates or assets change
    document.querySelectorAll('#register-show-form input[name="assets"], #register-show-form input[name="startDate"], #register-show-form input[name="endDate"]')
        .forEach(el => el.addEventListener('change', updateRegisterShowWarnings));

    document.getElementById('register-show-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const eventId = fd.get('eventId');
        const startDate = fd.get('startDate');
        const endDate = fd.get('endDate');
        const reservedBy = fd.get('reservedBy');
        const selectedAssets = fd.getAll('assets');

        if (selectedAssets.length === 0) {
            alert('Please select at least one equipment item.');
            return;
        }

        if (!appData.reservations) appData.reservations = [];

        // Create a reservation for each selected asset
        const errors = [];
        for (const assetId of selectedAssets) {
            const asset = assets.find(a => a.id === assetId);
            if (!asset) continue;
            const reservedForDates = getReservedQuantityForDates(assetId, startDate, endDate);
            const available = asset.totalQuantity - reservedForDates;
            if (available <= 0) {
                errors.push(`${asset.title} is not available for these dates (including buffer).`);
                continue;
            }
            appData.reservations.push({
                id: generateId(),
                assetId,
                eventId,
                quantity: 1,
                startDate,
                endDate,
                reservedBy,
                status: 'Reserved',
            });
        }

        if (errors.length > 0) {
            alert('Some items could not be reserved:\\n' + errors.join('\\n'));
        }

        await saveData();
        closeModal();
        renderAssets();
    });
    openModal();
}

function updateRegisterShowWarnings() {
    const form = document.getElementById('register-show-form');
    if (!form) return;
    const startDate = form.querySelector('input[name="startDate"]').value;
    const endDate = form.querySelector('input[name="endDate"]').value;
    const warnings = document.getElementById('register-show-warnings');
    if (!startDate || !endDate) { warnings.innerHTML = ''; return; }

    const selected = Array.from(form.querySelectorAll('input[name="assets"]:checked')).map(cb => cb.value);
    const msgs = [];
    for (const assetId of selected) {
        const asset = (appData.assets || []).find(a => a.id === assetId);
        if (!asset || asset.totalQuantity > 100) continue;
        const reserved = getReservedQuantityForDates(assetId, startDate, endDate);
        const available = asset.totalQuantity - reserved;
        if (available <= 0) {
            msgs.push(`⚠ ${asset.title} unavailable (reserved with 2-day buffer)`);
        } else if (available === 1) {
            msgs.push(`⚡ ${asset.title}: last unit available`);
        }
    }
    warnings.innerHTML = msgs.map(m => `<div class="form-warning">${escHtml(m)}</div>`).join('');
}

async function deleteAsset(assetId) {
    if (!confirm('Delete this asset?')) return;
    appData.assets = (appData.assets || []).filter(a => a.id !== assetId);
    appData.reservations = (appData.reservations || []).filter(r => r.assetId !== assetId);
    await saveData();
    renderAssets();
}

async function returnReservation(resId) {
    const res = (appData.reservations || []).find(r => r.id === resId);
    if (res) { res.status = 'Returned'; }
    await saveData();
    renderAssets();
}

async function cancelReservation(resId) {
    const res = (appData.reservations || []).find(r => r.id === resId);
    if (res) { res.status = 'Cancelled'; }
    await saveData();
    renderAssets();
}

// ============================================================
// Team Travel
// ============================================================

function renderTeamTravel() {
    renderTravelChart();
    renderTeamCards();
}

function renderTravelChart() {
    const ctx = document.getElementById('chart-travel');
    if (!ctx) return;

    const period = document.getElementById('travel-period').value;
    const today = new Date();
    const members = appData.config?.teamMembers || DEFAULT_CONFIG.teamMembers;
    const events = appData.events || [];

    const daysOut = {};
    members.forEach(m => daysOut[m] = 0);

    events.forEach(ev => {
        if (ev.status === 'Cancelled' || !ev.startDate) return;
        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate || ev.startDate);

        let inPeriod = false;
        if (period === 'month') {
            inPeriod = start.getMonth() === today.getMonth() && start.getFullYear() === today.getFullYear();
        } else if (period === 'quarter') {
            const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
            const qEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
            inPeriod = start <= qEnd && end >= qStart;
        } else {
            inPeriod = start.getFullYear() === today.getFullYear();
        }

        if (inPeriod) {
            const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
            (ev.teamMembers || []).forEach(m => {
                if (daysOut[m] !== undefined) daysOut[m] += days;
            });
        }
    });

    const labels = members;
    const data = members.map(m => daysOut[m]);

    if (travelChart) travelChart.destroy();
    travelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Travel Days',
                data,
                backgroundColor: data.map(d => d > 10 ? 'rgba(208, 2, 27, 0.6)' : d > 5 ? 'rgba(244, 178, 35, 0.6)' : 'rgba(0, 133, 106, 0.6)'),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });

    document.getElementById('travel-period').onchange = () => renderTeamTravel();
}

function renderTeamCards() {
    const grid = document.getElementById('team-grid');
    const members = appData.config?.teamMembers || DEFAULT_CONFIG.teamMembers;
    const today = new Date();

    grid.innerHTML = members.map(member => {
        const memberEvents = (appData.events || []).filter(e =>
            (e.teamMembers || []).some(m => m.toLowerCase() === member.toLowerCase()) &&
            e.status !== 'Cancelled'
        );
        const upcoming = memberEvents
            .filter(e => new Date(e.endDate || e.startDate) >= today)
            .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

        const initials = member.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

        const eventsList = upcoming.slice(0, 5).map(e => {
            const cat = getEventCategory(e.eventType);
            return `<li><span>${escHtml(e.title.substring(0, 30))}${e.title.length > 30 ? '...' : ''}</span><span class="event-date">${formatShortDate(e.startDate)}</span></li>`;
        }).join('');

        return `
            <div class="team-card">
                <div class="team-card-header">
                    <div class="team-avatar">${initials}</div>
                    <div>
                        <h4>${escHtml(member)}</h4>
                        <div class="trip-count">${upcoming.length} upcoming trip${upcoming.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <ul class="team-card-events">
                    ${eventsList || '<li style="color:var(--strong-gray);font-style:italic">No upcoming travel</li>'}
                </ul>
            </div>
        `;
    }).join('');
}

// ============================================================
// Thought Leadership
// ============================================================

function renderThoughtLeadership() {
    const tbody = document.getElementById('tl-tbody');
    tbody.innerHTML = (appData.thoughtLeadership || []).map(item => `
        <tr>
            <td><strong>${escHtml(item.eventName)}</strong></td>
            <td>${escHtml(item.presentationTitle || '')}</td>
            <td>${escHtml((item.speakers || []).join(', '))}</td>
            <td>${item.submissionDeadline ? formatShortDate(item.submissionDeadline) : '-'}</td>
            <td><span class="badge badge-${(item.status || 'draft').toLowerCase()}">${escHtml(item.status || 'Draft')}</span></td>
            <td>
                <div class="table-actions">
                    <button class="neo-btn-icon" onclick="openTLForm('${item.id}')" title="Edit">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-7 7H4.5v-2l7-7z" stroke="currentColor" stroke-width="1.5"/></svg>
                    </button>
                    <button class="neo-btn-icon neo-btn-danger" onclick="deleteTL('${item.id}')" title="Delete">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M4 5h8M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5v7a1 1 0 001 1h4a1 1 0 001-1V5" stroke="currentColor" stroke-width="1.5"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    document.getElementById('add-tl-btn').onclick = () => openTLForm();
}

function openTLForm(itemId) {
    const item = itemId ? (appData.thoughtLeadership || []).find(i => i.id === itemId) : null;
    document.getElementById('modal-title').textContent = item ? 'Edit Submission' : 'New Submission';
    document.getElementById('modal-body').innerHTML = `
        <form id="tl-form">
            <input type="hidden" name="id" value="${item?.id || ''}">
            <div class="form-group">
                <label>Event / Publication *</label>
                <input type="text" name="eventName" class="neo-input neo-input-full" required value="${escHtml(item?.eventName || '')}">
            </div>
            <div class="form-group">
                <label>Presentation Title</label>
                <input type="text" name="presentationTitle" class="neo-input neo-input-full" value="${escHtml(item?.presentationTitle || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Speakers (comma-separated)</label>
                    <input type="text" name="speakers" class="neo-input neo-input-full" value="${escHtml((item?.speakers || []).join(', '))}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="neo-select neo-input-full">
                        ${['Draft','Submitted','Approved','Presented'].map(s => `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Submission Deadline</label>
                    <input type="date" name="submissionDeadline" class="neo-input neo-input-full" value="${item?.submissionDeadline || ''}">
                </div>
                <div class="form-group">
                    <label>Event Date</label>
                    <input type="date" name="eventDateTime" class="neo-input neo-input-full" value="${item?.eventDateTime || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Abstract</label>
                <textarea name="abstract" class="neo-input neo-input-full" rows="3">${escHtml(item?.abstract || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="neo-btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="neo-btn neo-btn-primary">${item ? 'Update' : 'Create'}</button>
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
        };
        if (!appData.thoughtLeadership) appData.thoughtLeadership = [];
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
    appData.thoughtLeadership = (appData.thoughtLeadership || []).filter(i => i.id !== itemId);
    await saveData();
    renderThoughtLeadership();
}

// ============================================================
// Settings
// ============================================================

function initSettings() {
    document.getElementById('sp-site-url').value = storage.spSiteUrl || '';
    document.getElementById('sp-library-name').value = storage.spLibrary || 'FMPSData';

    // File System Access — Connect Folder button
    document.getElementById('connect-folder-btn').addEventListener('click', async () => {
        try {
            const connected = await storage.connectFolder();
            if (!connected) return; // user cancelled picker
            appData = await storage.migrateToFileSystem(appData);
            storage.startSync(5000);
            renderCurrentView();
            updateFsStatus();
            alert('Connected! Data will now save to your selected folder. If it\'s inside OneDrive/SharePoint Sync, other users will see changes automatically.');
        } catch (e) {
            alert(e.message);
        }
    });

    document.getElementById('disconnect-btn').addEventListener('click', async () => {
        if (!confirm('Disconnect folder? Data will revert to browser-only storage.')) return;
        await storage.disconnect();
        updateFsStatus();
        alert('Disconnected. Using browser storage only.');
    });

    // Restore previously connected folder on settings load
    (async () => {
        if (storage.mode === 'filesystem') {
            const restored = await storage.restoreFolder();
            if (restored) {
                storage.startSync(5000);
            }
            updateFsStatus();
        }
    })();

    // SharePoint REST (advanced)
    document.getElementById('save-config-btn').addEventListener('click', async () => {
        const url = document.getElementById('sp-site-url').value.trim();
        const lib = document.getElementById('sp-library-name').value.trim();
        storage.configure(url, lib);
        if (url) {
            try {
                appData = await storage.migrateToSharePoint(appData);
                storage.startSync(15000);
                renderCurrentView();
                updateFsStatus();
                alert('Connected to SharePoint! Data will now sync across users.');
            } catch (e) {
                alert(e.message);
            }
        } else {
            storage.stopSync();
            alert('Saved in local mode (no sync).');
        }
    });

    document.getElementById('test-connection-btn').addEventListener('click', async () => {
        const result = await storage.testConnection();
        alert(result.message);
    });

    document.getElementById('config-category').addEventListener('change', renderSettings);
    document.getElementById('config-add-btn').addEventListener('click', addConfigValue);

    updateFsStatus();
}

function updateFsStatus() {
    const statusText = document.getElementById('fs-status-text');
    const disconnectBtn = document.getElementById('disconnect-btn');
    if (storage.mode === 'filesystem' && storage._dirHandle) {
        statusText.textContent = `Connected to folder: "${storage._dirHandle.name}" — syncing every 5 seconds`;
        statusText.style.color = 'green';
        disconnectBtn.style.display = '';
    } else if (storage.mode === 'sharepoint') {
        statusText.textContent = `SharePoint mode: ${storage.spSiteUrl}`;
        statusText.style.color = 'green';
        disconnectBtn.style.display = 'none';
    } else {
        statusText.textContent = 'Not connected (using browser storage only)';
        statusText.style.color = '';
        disconnectBtn.style.display = 'none';
    }
}

function renderSettings() {
    const category = document.getElementById('config-category').value;
    const values = appData.config?.[category] || DEFAULT_CONFIG[category] || [];
    const list = document.getElementById('config-list');
    list.innerHTML = values.map((v, i) => `
        <div class="config-item">
            <span>${escHtml(v)}</span>
            <button class="neo-btn-icon neo-btn-danger" onclick="removeConfigValue('${category}', ${i})" style="width:24px;height:24px;">
                <svg viewBox="0 0 16 16" fill="none"><path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
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
    const existing = new Set([
        ...(appData?.events || []).map(e => e.id),
        ...(appData?.reservations || []).map(r => r.id),
        ...(appData?.assets || []).map(a => a.id),
        ...(appData?.thoughtLeadership || []).map(t => t.id),
    ]);
    let id;
    do {
        id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    } while (existing.has(id));
    return id;
}

/** Get today's date as YYYY-MM-DD in local timezone (avoids UTC boundary bugs). */
function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shift a YYYY-MM-DD string by N days and return YYYY-MM-DD in local time. */
function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/**
 * Persist appData. Returns true on success, false on failure.
 * On failure the UI stays in its current state so the user can retry.
 */
async function saveData() {
    showSyncStatus('syncing');
    try {
        await storage.save(appData);
        showSyncStatus('synced');
        return true;
    } catch (e) {
        showSyncStatus('error');
        console.error('Save failed:', e);
        alert('Save failed — your changes are cached locally but could not sync. Check connection and try again.');
        return false;
    }
}

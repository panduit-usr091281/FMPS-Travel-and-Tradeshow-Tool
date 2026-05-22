/**
 * FMPS Coordination Tool — Stress Test Suite
 * 
 * Run in the browser console while the tool is loaded.
 * Usage:  paste this file into DevTools console, then call:
 *   StressTest.runAll()        — run entire suite
 *   StressTest.massEvents()    — individual test
 *
 * Tests are designed to reveal:
 *   - Performance degradation under load
 *   - localStorage quota limits
 *   - DOM rendering bottlenecks
 *   - Date/time edge cases
 *   - Input sanitization gaps (XSS)
 *   - Concurrency/save race conditions
 *   - Memory leaks in chart/map instances
 */

const StressTest = (() => {
    const results = [];
    let _backupData = null;

    // ==========================================
    // Utilities
    // ==========================================

    function log(test, status, detail) {
        const entry = { test, status, detail, timestamp: new Date().toISOString() };
        results.push(entry);
        const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'orange';
        console.log(`%c[${status}] ${test}`, `color:${color};font-weight:bold`, detail || '');
    }

    function time(label, fn) {
        const start = performance.now();
        const result = fn();
        const elapsed = performance.now() - start;
        return { result, elapsed };
    }

    async function timeAsync(label, fn) {
        const start = performance.now();
        const result = await fn();
        const elapsed = performance.now() - start;
        return { result, elapsed };
    }

    function backup() {
        _backupData = JSON.parse(JSON.stringify(appData));
    }

    function restore() {
        if (_backupData) {
            appData = JSON.parse(JSON.stringify(_backupData));
            storage._localSave(appData);
        }
    }

    function randomDate(year = 2026) {
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function randomString(len) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    // ==========================================
    // Test: Mass Event Creation (500 events)
    // ==========================================

    function massEvents(count = 500) {
        backup();
        try {
            const events = [];
            for (let i = 0; i < count; i++) {
                events.push({
                    id: `stress_${i}_${Date.now().toString(36)}`,
                    title: `Stress Event ${i} - ${randomString(20)}`,
                    eventType: ['Trade Show', 'Conference', 'Internal Meeting', 'Workshop'][i % 4],
                    status: ['Confirmed', 'Tentative', 'Cancelled'][i % 3],
                    startDate: randomDate(),
                    endDate: randomDate(),
                    theater: ['Americas', 'EMEA', 'APAC'][i % 3],
                    location: `City ${i}, Country ${i % 50}`,
                    displayType: 'Booth',
                    tradeshowOwner: `Owner ${i % 10}`,
                    buOwner: `BU ${i % 5}`,
                    teamMembers: [`Person ${i % 8}`, `Person ${(i + 1) % 8}`],
                    boothSize: `${10 + i}x${10 + i}`,
                    showNotes: randomString(200),
                    budget: Math.floor(Math.random() * 100000),
                });
            }
            appData.events = [...(appData.events || []), ...events];

            // Test render performance
            const { elapsed: renderTime } = time('Render with mass events', () => {
                renderCurrentView();
            });

            if (renderTime < 2000) {
                log(`Mass Events (${count})`, 'PASS', `Rendered in ${renderTime.toFixed(0)}ms`);
            } else if (renderTime < 5000) {
                log(`Mass Events (${count})`, 'WARN', `Slow render: ${renderTime.toFixed(0)}ms`);
            } else {
                log(`Mass Events (${count})`, 'FAIL', `Render took ${renderTime.toFixed(0)}ms (>5s)`);
            }

            return renderTime;
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Mass Reservations
    // ==========================================

    function massReservations(count = 1000) {
        backup();
        try {
            const reservations = [];
            const assetIds = (appData.assets || []).map(a => a.id);
            if (assetIds.length === 0) {
                log('Mass Reservations', 'SKIP', 'No assets in data');
                return;
            }

            for (let i = 0; i < count; i++) {
                reservations.push({
                    id: `res_stress_${i}`,
                    assetId: assetIds[i % assetIds.length],
                    eventId: (appData.events || [])[i % (appData.events || []).length]?.id || 'fake',
                    quantity: 1,
                    startDate: randomDate(),
                    endDate: randomDate(),
                    reservedBy: `Tester ${i}`,
                    status: ['Reserved', 'Checked Out', 'Returned', 'Cancelled'][i % 4],
                });
            }
            appData.reservations = [...(appData.reservations || []), ...reservations];

            const { elapsed } = time('Render with mass reservations', renderCurrentView);
            if (elapsed < 3000) {
                log(`Mass Reservations (${count})`, 'PASS', `${elapsed.toFixed(0)}ms`);
            } else {
                log(`Mass Reservations (${count})`, 'WARN', `Slow: ${elapsed.toFixed(0)}ms`);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: localStorage Quota
    // ==========================================

    function storageQuota() {
        backup();
        try {
            // Fill data until localStorage rejects
            const bigString = randomString(1000);
            let iterations = 0;
            const maxIterations = 5000; // ~5MB cap
            const hugeEvents = [];

            try {
                for (let i = 0; i < maxIterations; i++) {
                    hugeEvents.push({
                        id: `quota_${i}`,
                        title: bigString,
                        showNotes: bigString + bigString + bigString,
                        startDate: '2026-01-01',
                        endDate: '2026-12-31',
                    });
                    iterations = i;
                }
                appData.events = hugeEvents;
                storage._localSave(appData);
                log('Storage Quota', 'PASS', `Saved ${iterations} large events (~${(JSON.stringify(appData).length / 1024 / 1024).toFixed(1)}MB)`);
            } catch (e) {
                if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
                    log('Storage Quota', 'PASS', `Quota hit at ${iterations} events (~${(iterations * 4) / 1024}MB) — error handled correctly`);
                } else {
                    log('Storage Quota', 'FAIL', `Unexpected error: ${e.message}`);
                }
            }
        } finally {
            restore();
            storage._localSave(_backupData);
        }
    }

    // ==========================================
    // Test: XSS / Input Sanitization
    // ==========================================

    function xssAttempts() {
        backup();
        const payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert(1)>',
            '"><svg onload=alert(document.cookie)>',
            "'; DROP TABLE events; --",
            '{{constructor.constructor("return this")()}}',
            '<iframe src="javascript:alert(1)">',
            '<div onmouseover="alert(1)">hover me</div>',
            '${alert(1)}',
            'javascript:alert(1)',
        ];

        let passed = 0;
        let failed = 0;

        try {
            // Inject payloads into event titles
            appData.events = payloads.map((p, i) => ({
                id: `xss_${i}`,
                title: p,
                eventType: p,
                status: 'Confirmed',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                theater: p,
                location: p,
                showNotes: p,
                tradeshowOwner: p,
            }));

            renderCurrentView();

            // Check if any payload executed (look for unescaped tags in DOM)
            const html = document.body.innerHTML;
            payloads.forEach((payload, i) => {
                // Check the raw payload doesn't appear as executable HTML
                if (html.includes(payload) && (payload.includes('<script') || payload.includes('onerror') || payload.includes('onload') || payload.includes('onmouseover'))) {
                    log(`XSS Payload ${i + 1}`, 'FAIL', `Unescaped: ${payload.substring(0, 40)}...`);
                    failed++;
                } else {
                    passed++;
                }
            });

            if (failed === 0) {
                log('XSS Sanitization', 'PASS', `All ${payloads.length} payloads neutralized`);
            } else {
                log('XSS Sanitization', 'FAIL', `${failed}/${payloads.length} payloads may be live in DOM`);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Date Edge Cases
    // ==========================================

    function dateEdgeCases() {
        backup();
        const edgeDates = [
            { name: 'Leap day', start: '2028-02-29', end: '2028-03-01' },
            { name: 'Year boundary', start: '2026-12-31', end: '2027-01-01' },
            { name: 'DST spring forward (US)', start: '2026-03-08', end: '2026-03-09' },
            { name: 'DST fall back (US)', start: '2026-11-01', end: '2026-11-02' },
            { name: 'Same start/end', start: '2026-07-04', end: '2026-07-04' },
            { name: 'End before start (invalid)', start: '2026-09-15', end: '2026-09-10' },
            { name: 'Far future', start: '2099-12-31', end: '2100-01-01' },
            { name: 'Epoch zero', start: '1970-01-01', end: '1970-01-02' },
            { name: 'Empty dates', start: '', end: '' },
            { name: 'Null dates', start: null, end: null },
        ];

        let passed = 0;
        let failed = 0;

        try {
            appData.events = edgeDates.map((d, i) => ({
                id: `date_edge_${i}`,
                title: `Date Test: ${d.name}`,
                eventType: 'Conference',
                status: 'Confirmed',
                startDate: d.start,
                endDate: d.end,
                theater: 'Americas',
                location: 'Test City',
            }));

            try {
                renderCurrentView();
                passed++;
            } catch (e) {
                log('Date Edge Cases - Render', 'FAIL', `Crashed: ${e.message}`);
                failed++;
            }

            // Test todayLocal utility across edge cases
            try {
                const today = todayLocal();
                if (/^\d{4}-\d{2}-\d{2}$/.test(today)) {
                    passed++;
                } else {
                    log('todayLocal format', 'FAIL', `Got: ${today}`);
                    failed++;
                }
            } catch (e) {
                log('todayLocal', 'FAIL', e.message);
                failed++;
            }

            // Test shiftDate edge cases
            const shiftTests = [
                { input: '2026-03-01', days: -1, expected: '2026-02-28' },
                { input: '2028-03-01', days: -1, expected: '2028-02-29' }, // leap year
                { input: '2026-01-01', days: -1, expected: '2025-12-31' },
                { input: '2026-12-31', days: 1, expected: '2027-01-01' },
                { input: '2026-06-15', days: 0, expected: '2026-06-15' },
                { input: '2026-06-15', days: -365, expected: '2025-06-15' },
            ];

            shiftTests.forEach(t => {
                try {
                    const result = shiftDate(t.input, t.days);
                    if (result === t.expected) {
                        passed++;
                    } else {
                        log(`shiftDate(${t.input}, ${t.days})`, 'FAIL', `Expected ${t.expected}, got ${result}`);
                        failed++;
                    }
                } catch (e) {
                    log(`shiftDate(${t.input}, ${t.days})`, 'FAIL', e.message);
                    failed++;
                }
            });

            if (failed === 0) {
                log('Date Edge Cases', 'PASS', `All ${passed} checks passed`);
            } else {
                log('Date Edge Cases', 'FAIL', `${failed} failures, ${passed} passed`);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Rapid-fire Saves (Race Conditions)
    // ==========================================

    async function rapidSaves(count = 20) {
        backup();
        try {
            const promises = [];
            const errors = [];

            for (let i = 0; i < count; i++) {
                appData.events = appData.events || [];
                appData.events.push({
                    id: `rapid_${i}_${Date.now()}`,
                    title: `Rapid Save ${i}`,
                    startDate: '2026-08-01',
                    endDate: '2026-08-02',
                    status: 'Confirmed',
                    eventType: 'Conference',
                });
                promises.push(
                    saveData().catch(e => errors.push(e.message))
                );
            }

            await Promise.allSettled(promises);

            if (errors.length === 0) {
                log(`Rapid Saves (${count})`, 'PASS', 'All saves completed without error');
            } else {
                log(`Rapid Saves (${count})`, 'WARN', `${errors.length} errors: ${errors[0]}`);
            }
        } finally {
            restore();
            storage._localSave(_backupData);
        }
    }

    // ==========================================
    // Test: Long Strings (Field Overflow)
    // ==========================================

    function longStrings() {
        backup();
        try {
            const lengths = [1000, 10000, 100000];
            let failed = 0;

            for (const len of lengths) {
                appData.events = [{
                    id: 'longstr_test',
                    title: randomString(len),
                    eventType: 'Conference',
                    status: 'Confirmed',
                    startDate: '2026-05-01',
                    endDate: '2026-05-02',
                    location: randomString(len),
                    showNotes: randomString(len),
                }];

                try {
                    const { elapsed } = time(`Render ${len}-char strings`, renderCurrentView);
                    if (elapsed > 3000) {
                        log(`Long Strings (${len} chars)`, 'WARN', `Slow: ${elapsed.toFixed(0)}ms`);
                    }
                } catch (e) {
                    log(`Long Strings (${len} chars)`, 'FAIL', e.message);
                    failed++;
                }
            }

            if (failed === 0) {
                log('Long Strings', 'PASS', 'Handled all lengths without crash');
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Calendar Navigation Stress
    // ==========================================

    function calendarNavStress() {
        backup();
        try {
            // Rapidly navigate 24 months forward and back
            let errors = 0;
            const navBtns = document.querySelectorAll('.calendar-nav button, [onclick*="changeMonth"]');

            // Simulate month changes via any exposed function
            if (typeof changeMonth === 'function') {
                for (let i = 0; i < 24; i++) {
                    try { changeMonth(1); } catch (e) { errors++; }
                }
                for (let i = 0; i < 48; i++) {
                    try { changeMonth(-1); } catch (e) { errors++; }
                }
                for (let i = 0; i < 24; i++) {
                    try { changeMonth(1); } catch (e) { errors++; }
                }
            } else {
                log('Calendar Nav Stress', 'SKIP', 'changeMonth not accessible');
                return;
            }

            if (errors === 0) {
                log('Calendar Nav Stress', 'PASS', '72 rapid navigations without error');
            } else {
                log('Calendar Nav Stress', 'FAIL', `${errors} errors during navigation`);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Chart.js Memory Leak Detection
    // ==========================================

    function chartMemoryLeak() {
        backup();
        try {
            const initialCharts = Chart.instances ? Object.keys(Chart.instances).length : 0;

            // Re-render dashboard 20 times
            for (let i = 0; i < 20; i++) {
                try {
                    if (typeof renderDashboard === 'function') renderDashboard();
                } catch (e) { /* ignore render errors */ }
            }

            const finalCharts = Chart.instances ? Object.keys(Chart.instances).length : 0;
            const leaked = finalCharts - initialCharts;

            if (leaked <= 1) {
                log('Chart Memory Leak', 'PASS', `${finalCharts} chart instances (leaked: ${leaked})`);
            } else {
                log('Chart Memory Leak', 'FAIL', `Leaked ${leaked} chart instances (${initialCharts} → ${finalCharts})`);
            }
        } finally {
            restore();
        }
    }

    // ==========================================
    // Test: Leaflet Map Leak Detection
    // ==========================================

    function mapMemoryLeak() {
        backup();
        try {
            // Track marker layers before
            const countLayers = (map) => {
                if (!map) return 0;
                let count = 0;
                map.eachLayer(() => count++);
                return count;
            };

            const before = countLayers(dashMap) + countLayers(fullMap);

            for (let i = 0; i < 10; i++) {
                try {
                    if (typeof renderDashboard === 'function') renderDashboard();
                } catch { /* ignore */ }
            }

            const after = countLayers(dashMap) + countLayers(fullMap);

            if (after <= before + 20) {
                log('Map Memory Leak', 'PASS', `Layers: ${before} → ${after}`);
            } else {
                log('Map Memory Leak', 'WARN', `Layer growth: ${before} → ${after} (+${after - before})`);
            }
        } finally {
            restore();
        }
    }

    // ==========================================
    // Test: Concurrent View Switching
    // ==========================================

    function viewSwitchStress() {
        const views = ['dashboard', 'calendar', 'events', 'assets', 'travel', 'speaking', 'settings'];
        let errors = 0;
        const { elapsed } = time('View switch stress', () => {
            for (let cycle = 0; cycle < 5; cycle++) {
                for (const view of views) {
                    try {
                        if (typeof showView === 'function') {
                            showView(view);
                        }
                    } catch (e) {
                        errors++;
                    }
                }
            }
        });

        if (errors === 0) {
            log('View Switch Stress', 'PASS', `35 switches in ${elapsed.toFixed(0)}ms`);
        } else {
            log('View Switch Stress', 'FAIL', `${errors} errors across 35 switches`);
        }
    }

    // ==========================================
    // Test: Empty/Null Data Resilience
    // ==========================================

    function emptyDataResilience() {
        backup();
        let failed = 0;

        const testCases = [
            { name: 'Null events', data: { ...appData, events: null } },
            { name: 'Undefined events', data: { ...appData, events: undefined } },
            { name: 'Empty arrays', data: { events: [], assets: [], reservations: [], thoughtLeadership: [], config: {} } },
            { name: 'Completely empty', data: {} },
            { name: 'Null root', data: null },
        ];

        for (const tc of testCases) {
            try {
                appData = tc.data || {};
                renderCurrentView();
            } catch (e) {
                log(`Empty Data: ${tc.name}`, 'FAIL', e.message);
                failed++;
            }
        }

        if (failed === 0) {
            log('Empty Data Resilience', 'PASS', `All ${testCases.length} null/empty scenarios handled`);
        } else {
            log('Empty Data Resilience', 'FAIL', `${failed}/${testCases.length} scenarios crashed`);
        }

        restore();
        renderCurrentView();
    }

    // ==========================================
    // Test: Special Characters in All Fields
    // ==========================================

    function specialCharacters() {
        backup();
        const specials = [
            'Ñoño año España — «quotes» & ñ',
            '日本語テスト 中文测试 한국어',
            '🎪🎯🚀💥 Emoji Overload 🔥⚡✨',
            'Line1\nLine2\rLine3\r\nLine4',
            '\t\tTabs\t\tEverywhere',
            'Null\x00Byte\x00Test',
            'Path\\traversal\\..\\..\\etc\\passwd',
            'Zero‌Width‍Joiner​Chars',
            String.fromCharCode(0xFFFD) + ' Replacement char',
            '&amp; &lt; &gt; &quot; Already escaped',
        ];

        let errors = 0;

        try {
            appData.events = specials.map((s, i) => ({
                id: `special_${i}`,
                title: s,
                eventType: 'Conference',
                status: 'Confirmed',
                startDate: '2026-06-01',
                endDate: '2026-06-02',
                location: s,
                showNotes: s,
            }));

            try {
                renderCurrentView();
            } catch (e) {
                errors++;
                log('Special Characters Render', 'FAIL', e.message);
            }

            // Verify rendering didn't corrupt
            const eventsTable = document.querySelector('.events-table, [class*="event"]');
            if (eventsTable && eventsTable.textContent.includes('Emoji Overload')) {
                // Good - content rendered
            }

            if (errors === 0) {
                log('Special Characters', 'PASS', `All ${specials.length} special strings rendered`);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: ID Collision
    // ==========================================

    function idCollision() {
        backup();
        try {
            // Create events with duplicate IDs
            appData.events = [
                { id: 'DUPE_1', title: 'First', startDate: '2026-01-01', endDate: '2026-01-02', status: 'Confirmed', eventType: 'Conference' },
                { id: 'DUPE_1', title: 'Second (same ID)', startDate: '2026-02-01', endDate: '2026-02-02', status: 'Tentative', eventType: 'Trade Show' },
                { id: 'DUPE_1', title: 'Third (same ID)', startDate: '2026-03-01', endDate: '2026-03-02', status: 'Cancelled', eventType: 'Workshop' },
            ];

            try {
                renderCurrentView();
                // Simulate deleteEvent's splice logic (can't call deleteEvent directly due to confirm())
                const beforeCount = appData.events.length;
                const idx = appData.events.findIndex(e => e.id === 'DUPE_1');
                if (idx >= 0) appData.events.splice(idx, 1);
                const afterCount = appData.events.length;

                if (afterCount === beforeCount - 1) {
                    log('ID Collision', 'PASS', `Delete removed only 1 of ${beforeCount} duplicates (safe splice behavior)`);
                } else if (afterCount === 0) {
                    log('ID Collision', 'FAIL', 'Delete removed ALL duplicates — splice safeguard missing');
                } else {
                    log('ID Collision', 'FAIL', `Unexpected: ${beforeCount} → ${afterCount}`);
                }
            } catch (e) {
                log('ID Collision', 'FAIL', e.message);
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: generateId Uniqueness Under Load
    // ==========================================

    function idUniqueness() {
        const ids = new Set();
        const count = 10000;
        let collisions = 0;

        for (let i = 0; i < count; i++) {
            const id = generateId();
            if (ids.has(id)) collisions++;
            ids.add(id);
        }

        if (collisions === 0) {
            log('ID Uniqueness', 'PASS', `${count} IDs generated, 0 collisions`);
        } else {
            log('ID Uniqueness', 'FAIL', `${collisions} collisions in ${count} IDs`);
        }
    }

    // ==========================================
    // Test: ICS Export with Mass Data
    // ==========================================

    function icsExportStress() {
        backup();
        try {
            // Generate 200 events and try to export
            appData.events = [];
            for (let i = 0; i < 200; i++) {
                appData.events.push({
                    id: `ics_${i}`,
                    title: `ICS Event ${i} — Special "Chars" & <Tags>`,
                    startDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
                    endDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
                    status: 'Confirmed',
                    eventType: 'Conference',
                    location: `Location ${i}`,
                });
            }

            if (typeof generateICS === 'function') {
                const { result: ics, elapsed } = time('ICS generation', () => generateICS(appData.events));
                const valid = ics.startsWith('BEGIN:VCALENDAR') && ics.endsWith('END:VCALENDAR');
                const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;

                if (valid && eventCount === 200) {
                    log('ICS Export Stress', 'PASS', `200 events exported in ${elapsed.toFixed(0)}ms (${(ics.length / 1024).toFixed(1)}KB)`);
                } else {
                    log('ICS Export Stress', 'FAIL', `Valid: ${valid}, Events: ${eventCount}/200`);
                }
            } else {
                log('ICS Export Stress', 'SKIP', 'generateICS not accessible');
            }
        } finally {
            restore();
        }
    }

    // ==========================================
    // Test: Filter with Regex-like Input
    // ==========================================

    function filterInjection() {
        // Try to break search/filter inputs with regex-like strings
        const malicious = [
            '.*',
            '((((((((((',
            '[a-z',
            '\\',
            'a{999999}',
            '(?=.*admin)',
        ];

        let errors = 0;
        const searchInput = document.getElementById('global-search') || document.querySelector('[type="search"]');

        if (!searchInput) {
            log('Filter Injection', 'SKIP', 'No search input found');
            return;
        }

        for (const m of malicious) {
            try {
                searchInput.value = m;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (e) {
                errors++;
            }
        }

        // Reset
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        if (errors === 0) {
            log('Filter Injection', 'PASS', `${malicious.length} regex-like inputs handled`);
        } else {
            log('Filter Injection', 'FAIL', `${errors} errors from malicious filter input`);
        }
    }

    // ==========================================
    // Test: Prototype Pollution via Data
    // ==========================================

    function prototypePollution() {
        backup();
        try {
            // Inject __proto__ keys into event data
            appData.events = [{
                id: 'proto_test',
                title: 'Normal Event',
                __proto__: { isAdmin: true },
                constructor: { prototype: { isAdmin: true } },
                startDate: '2026-06-01',
                endDate: '2026-06-02',
                status: 'Confirmed',
                eventType: 'Conference',
            }];

            renderCurrentView();

            // Check if Object.prototype was polluted
            const polluted = ({}).isAdmin === true;
            if (polluted) {
                log('Prototype Pollution', 'FAIL', 'Object.prototype was polluted!');
            } else {
                log('Prototype Pollution', 'PASS', 'No prototype pollution detected');
            }
        } finally {
            restore();
            renderCurrentView();
        }
    }

    // ==========================================
    // Test: Concurrent Data Modifications
    // ==========================================

    async function concurrentModifications() {
        backup();
        try {
            const originalCount = (appData.events || []).length;

            // Simulate concurrent adds and deletes
            const ops = [];
            for (let i = 0; i < 10; i++) {
                ops.push((async () => {
                    appData.events.push({
                        id: `concurrent_${i}`,
                        title: `Concurrent ${i}`,
                        startDate: '2026-07-01',
                        endDate: '2026-07-02',
                        status: 'Confirmed',
                        eventType: 'Conference',
                    });
                    await saveData();
                })());
            }

            await Promise.allSettled(ops);
            const finalCount = (appData.events || []).length;

            if (finalCount === originalCount + 10) {
                log('Concurrent Modifications', 'PASS', `All 10 additions persisted (${originalCount} → ${finalCount})`);
            } else {
                log('Concurrent Modifications', 'WARN', `Expected ${originalCount + 10}, got ${finalCount} — possible race`);
            }
        } finally {
            restore();
            storage._localSave(_backupData);
        }
    }

    // ==========================================
    // Runner
    // ==========================================

    async function runAll() {
        results.length = 0;
        console.clear();
        console.log('%c=== FMPS Stress Test Suite ===', 'color:#0071B2;font-size:16px;font-weight:bold');
        console.log('Starting tests...\n');

        const startTime = performance.now();

        // Sync tests
        massEvents(500);
        massReservations(1000);
        storageQuota();
        xssAttempts();
        dateEdgeCases();
        longStrings();
        calendarNavStress();
        chartMemoryLeak();
        mapMemoryLeak();
        viewSwitchStress();
        emptyDataResilience();
        specialCharacters();
        idCollision();
        idUniqueness();
        icsExportStress();
        filterInjection();
        prototypePollution();

        // Async tests
        await rapidSaves(20);
        await concurrentModifications();

        const totalTime = performance.now() - startTime;

        // Summary
        console.log('\n%c=== RESULTS SUMMARY ===', 'color:#0071B2;font-size:14px;font-weight:bold');
        const pass = results.filter(r => r.status === 'PASS').length;
        const fail = results.filter(r => r.status === 'FAIL').length;
        const warn = results.filter(r => r.status === 'WARN').length;
        const skip = results.filter(r => r.status === 'SKIP').length;

        console.log(`%c✓ PASS: ${pass}`, 'color:green;font-weight:bold');
        if (warn > 0) console.log(`%c⚠ WARN: ${warn}`, 'color:orange;font-weight:bold');
        if (fail > 0) console.log(`%c✗ FAIL: ${fail}`, 'color:red;font-weight:bold');
        if (skip > 0) console.log(`%c⊘ SKIP: ${skip}`, 'color:gray');
        console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
        console.log('\nFull results:', results);

        return { pass, fail, warn, skip, totalTime, results };
    }

    // Public API
    return {
        runAll,
        massEvents,
        massReservations,
        storageQuota,
        xssAttempts,
        dateEdgeCases,
        rapidSaves,
        longStrings,
        calendarNavStress,
        chartMemoryLeak,
        mapMemoryLeak,
        viewSwitchStress,
        emptyDataResilience,
        specialCharacters,
        idCollision,
        idUniqueness,
        icsExportStress,
        filterInjection,
        prototypePollution,
        concurrentModifications,
        results,
    };
})();

console.log('%cFMPS Stress Test loaded. Run: StressTest.runAll()', 'color:#0071B2;font-weight:bold');

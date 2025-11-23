import { Effect, pipe } from "effect";
import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { auth } from "../middleware";
import { listAll } from "../services/total";

const app = new Hono<{ Bindings: Bindings }>();

// Admin WebUI
app.get("/", (c) => {
    if (!c.env.ADMIN_SECRET) {
        console.warn("ADMIN_SECRET is not set, admin UI is disabled");
        return c.text("Not Found", 404);
    }
    return c.html(getAdminUi());
});

// Verify token
app.get("/verify", auth, (c) => c.text("OK"));

// List all counters (Admin)
app.get("/counters/all", auth, async (c) =>
    pipe(
        listAll(c.env.DB),
        Effect.map((counters) => c.json(counters)),
        Effect.catchAll(({ message }) => Effect.sync(() => c.text(message, 500))),
        (effect) => Effect.runPromise(effect),
    ),
);

function getAdminUi() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Counter Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --danger: #ef4444;
            --danger-hover: #dc2626;
            --success: #22c55e;
            --success-hover: #16a34a;
        }

        * { box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            margin: 0;
            padding: 2rem;
            line-height: 1.5;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(to right, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 1.5rem 0;
            color: var(--text-main);
        }

        .card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border: 1px solid var(--border);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .row {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        input {
            background: #0f172a;
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.95rem;
            width: 100%;
            transition: border-color 0.2s;
        }

        input:focus {
            outline: none;
            border-color: var(--primary);
        }

        button {
            cursor: pointer;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            border: none;
            font-weight: 500;
            font-family: inherit;
            font-size: 0.95rem;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        button.primary { background: var(--primary); color: white; }
        button.primary:hover { background: var(--primary-hover); }

        button.danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        button.danger:hover { background: rgba(239, 68, 68, 0.2); }

        button.secondary { background: var(--border); color: var(--text-main); }
        button.secondary:hover { background: #475569; }

        button.icon-btn {
            padding: 0.5rem;
            background: transparent;
            color: var(--text-muted);
        }
        button.icon-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.05); }

        .hidden { display: none !important; }

        /* List Styles */
        .list-header {
            display: grid;
            grid-template-columns: 2fr 1fr auto;
            padding: 0.75rem 1rem;
            color: var(--text-muted);
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .list-item {
            display: grid;
            grid-template-columns: 2fr 1fr auto;
            align-items: center;
            padding: 1rem;
            border-top: 1px solid var(--border);
            transition: background 0.2s;
        }

        .list-item:hover { background: rgba(255,255,255,0.02); }

        .key-cell { font-family: 'Monaco', 'Consolas', monospace; color: #60a5fa; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
        .val-cell { font-family: 'Monaco', 'Consolas', monospace; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .actions-cell { display: flex; gap: 0.5rem; justify-content: flex-end; }

        /* Status Badge */
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            background: var(--border);
            color: var(--text-muted);
        }
        .badge.success { background: rgba(34, 197, 94, 0.1); color: var(--success); }
        .badge.error { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

        /* Realtime Box */
        .realtime-box {
            background: #0f172a;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            text-align: center;
            margin-top: 1.5rem;
        }
        .realtime-val {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary);
            margin: 0.5rem 0;
        }

        /* Toast */
        .toast {
            position: fixed;
            top: 2rem;
            left: 50%;
            transform: translate(-50%, -100%);
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 0.75rem 1.5rem;
            border-radius: 99px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            color: var(--text-main);
            font-weight: 500;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            pointer-events: none;
        }
        .toast.show {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        .toast.success { border-color: var(--success); color: var(--success); }
        .toast.error { border-color: var(--danger); color: var(--danger); }
        .toast.neutral { border-color: var(--primary); color: var(--primary); }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Counter Admin</h1>
            <div id="user-info" class="hidden row">
                <span class="badge success">Authenticated</span>
                <button class="secondary" onclick="logout()" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Logout</button>
            </div>
        </header>

        <!-- Login Section -->
        <div id="login-section" class="card" style="max-width: 400px; margin: 4rem auto;">
            <h2 style="text-align: center;">Admin Access</h2>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="password" id="token-input" placeholder="Enter Admin Secret">
                <button class="primary" onclick="login()">Login</button>
            </div>
            <div id="login-msg" style="margin-top: 1rem; text-align: center; min-height: 1.5rem;"></div>
        </div>

        <!-- Dashboard -->
        <div id="admin-content" class="hidden">
            
            <!-- Total Counters -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2>Total Counters</h2>
                    <div class="row" style="gap: 0.5rem;">
                        <button class="secondary" onclick="exportTotalCounters()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export JSON
                        </button>
                        <button class="secondary" onclick="loadTotalCounters()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <!-- Create Counter -->
                <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div class="row">
                        <input type="text" id="new-key" placeholder="New counter key" style="flex: 2;">
                        <button class="primary" onclick="createTotal()">Create Counter</button>
                    </div>
                </div>

                <!-- List -->
                <div class="list-header">
                    <span>Key</span>
                    <span>Value</span>
                    <span style="text-align: right;">Actions</span>
                </div>
                <div id="total-list">
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading...</div>
                </div>
            </div>

            <!-- Realtime Counters -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2>Realtime Counters</h2>
                    <button class="secondary" onclick="loadRealtimeCounters()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        Refresh
                    </button>
                </div>

                <!-- Create/Check Realtime -->
                <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div class="row">
                        <input type="text" id="rt-key" placeholder="Check/Create Realtime Key" style="flex: 2;">
                        <button class="primary" onclick="checkRealtime()">Check / Create</button>
                    </div>
                </div>

                <!-- Realtime List -->
                <div class="list-header">
                    <span>Key</span>
                    <span>Active Users</span>
                    <span style="text-align: right;">Actions</span>
                </div>
                <div id="realtime-list">
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading...</div>
                </div>

                <!-- Detail Modal (Simple inline for now) -->
                <div id="rt-display" class="hidden realtime-box" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                    <h3 id="rt-display-key" style="margin: 0 0 1rem 0; color: var(--text-main);"></h3>
                    <div style="color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Current Active Users</div>
                    <div id="rt-val-display" class="realtime-val">-</div>
                    <div class="row" style="justify-content: center; margin-top: 1.5rem;">
                        <input type="number" id="rt-set-val" placeholder="Set Value" style="width: 120px;">
                        <button class="primary" onclick="updateRealtime()">Set</button>
                        <button class="danger" onclick="deleteRealtime()">Reset</button>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 1rem;">
                        Note: Setting value creates temporary fake users (15s expiry).
                    </p>
                    <button class="secondary" onclick="document.getElementById('rt-display').classList.add('hidden')" style="margin-top: 1rem;">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = window.location.origin;
        
        // --- Auth Logic ---

        async function login() {
            const token = document.getElementById('token-input').value.trim();
            if (!token) return showMsg('Please enter a token', 'error');
            
            showMsg('Verifying...', 'neutral');
            if (await verifyToken(token)) {
                localStorage.setItem('admin_token', token);
                document.getElementById('token-input').value = '';
                showMsg('', 'neutral');
                setAuthState(true);
            } else {
                showMsg('Invalid token', 'error');
            }
        }

        function logout() {
            localStorage.removeItem('admin_token');
            setAuthState(false);
        }

        async function verifyToken(token) {
            try {
                const res = await fetch(\`\${API_URL}/admin/verify\`, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                });
                return res.ok;
            } catch { return false; }
        }

        function getToken() { return localStorage.getItem('admin_token'); }

        async function checkAuth() {
            const token = getToken();
            if (token && await verifyToken(token)) {
                setAuthState(true);
            } else {
                setAuthState(false);
            }
        }

        function setAuthState(isLoggedIn) {
            const loginSection = document.getElementById('login-section');
            const adminContent = document.getElementById('admin-content');
            const userInfo = document.getElementById('user-info');
            
            if (isLoggedIn) {
                loginSection.classList.add('hidden');
                adminContent.classList.remove('hidden');
                userInfo.classList.remove('hidden');
                loadTotalCounters();
                loadRealtimeCounters();
            } else {
                loginSection.classList.remove('hidden');
                adminContent.classList.add('hidden');
                userInfo.classList.add('hidden');
            }
        }

        function showMsg(msg, type) {
            const el = document.getElementById('login-msg');
            el.innerHTML = msg ? \`<span class="badge \${type}">\${msg}</span>\` : '';
        }

        async function fetchAuth(url, opts = {}) {
            const token = getToken();
            if (!token) return null;
            try {
                const res = await fetch(url, {
                    ...opts,
                    headers: { ...opts.headers, 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' }
                });
                if (res.status === 401) { logout(); return null; }
                if (!res.ok) throw new Error(await res.text());
                return res;
            } catch (e) {
                showToast(e.message);
                return null;
            }
        }

        // --- Total Counters ---

        async function loadTotalCounters() {
            const container = document.getElementById('total-list');
            try {
                const res = await fetchAuth(\`\${API_URL}/admin/counters/all\`);
                if (!res) return;
                const data = await res.json();
                
                if (data.length === 0) {
                    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No counters found</div>';
                    return;
                }

                container.innerHTML = data.map(c => \`
                    <div class="list-item">
                        <div class="key-cell">
                            \${c.key}
                            <button class="icon-btn" onclick="copy('\${c.key}')" title="Copy Key" style="opacity: 0.5;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                        <div class="val-cell">
                            <span id="total-val-\${c.key}">\${c.val}</span>
                            <button class="icon-btn" onclick="copy(document.getElementById('total-val-\${c.key}').innerText)" title="Copy Value" style="opacity: 0.5;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                        <div class="actions-cell">
                            <button class="icon-btn" onclick="refreshTotal('\${c.key}')" title="Refresh Value">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            </button>
                            <button class="icon-btn" onclick="editTotal('\${c.key}')" title="Edit Value" style="color: var(--primary);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="icon-btn" onclick="deleteTotal('\${c.key}')" title="Delete" style="color: var(--danger);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                \`).join('');
            } catch (e) {
                container.innerHTML = \`<div style="color: var(--danger); padding: 1rem;">Error: \${e.message}</div>\`;
            }
        }

        async function createTotal() {
            const key = document.getElementById('new-key').value.trim();
            if (!key) return showToast('Enter a key');
            // We use the public POST endpoint for creation, but we could make an admin one.
            // Using public one is fine.
            try {
                const res = await fetch(\`\${API_URL}/counters\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                if (!res.ok) throw new Error(await res.text());
                document.getElementById('new-key').value = '';
                loadTotalCounters();
                showToast('Counter created', 'success');
            } catch (e) { showToast(e.message, 'error'); }
        }

        async function deleteTotal(key) {
            if (!confirm(\`Delete "\${key}"?\`)) return;
            if (await fetchAuth(\`\${API_URL}/counters/\${key}\`, { method: 'DELETE' })) {
                loadTotalCounters();
                showToast('Counter deleted', 'success');
            }
        }

        async function editTotal(key) {
            const val = prompt(\`New value for "\${key}":\`);
            if (val === null) return;
            const num = parseInt(val);
            if (isNaN(num)) return showToast("Invalid number", 'error');
            if (await fetchAuth(\`\${API_URL}/counters/\${key}\`, { method: 'PUT', body: JSON.stringify({ val: num }) })) {
                loadTotalCounters();
                showToast('Value updated', 'success');
            }
        }

        async function refreshTotal(key) {
            try {
                const res = await fetch(\`\${API_URL}/counters/\${key}\`);
                if (!res.ok) throw new Error();
                const val = await res.text();
                const el = document.getElementById(\`total-val-\${key}\`);
                if (el) {
                    el.innerText = val;
                    el.style.color = 'var(--success)';
                    setTimeout(() => el.style.color = '', 500);
                }
            } catch (e) { console.error(e); }
        }

        async function exportTotalCounters() {
            try {
                const res = await fetchAuth(\`\${API_URL}/admin/counters/all\`);
                if (!res) return;
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'counters.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Export started', 'success');
            } catch (e) { showToast(e.message, 'error'); }
        }

        // --- Realtime ---
        async function loadRealtimeCounters() {
            const container = document.getElementById('realtime-list');
            try {
                // We use the new endpoint /realtime which returns a list of keys
                const res = await fetchAuth(\`\${API_URL}/realtime\`);
    if (!res) return;
    const keys = await res.json();

    if (keys.length === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No active realtime counters</div>';
        return;
    }

    // For each key, we need to fetch the count. 
    // In a real app, we might want a bulk endpoint, but for now we'll fetch in parallel.
    const counts = await Promise.all(keys.map(async key => {
        try {
            const r = await fetch(\`\${API_URL}/realtime/\${key}\`);
                        return { key, val: await r.text() };
                    } catch { return { key, val: '?' }; }
                }));

                container.innerHTML = counts.map(c => \`
                    <div class="list-item">
                        <div class="key-cell">
                            \${c.key}
                            <button class="icon-btn" onclick="copy('\${c.key}')" title="Copy Key" style="opacity: 0.5;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                        <div class="val-cell">
                            <span id="rt-val-\${c.key}">\${c.val}</span>
                            <button class="icon-btn" onclick="copy(document.getElementById('rt-val-\${c.key}').innerText)" title="Copy Value" style="opacity: 0.5;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                        <div class="actions-cell">
                            <button class="icon-btn" onclick="refreshRealtime('\${c.key}')" title="Refresh Value">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            </button>
                            <button class="icon-btn" onclick="openRealtimeDetail('\${c.key}')" title="Manage" style="color: var(--primary);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </button>
                            <button class="icon-btn" onclick="deleteRealtime('\${c.key}')" title="Delete" style="color: var(--danger);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                \`).join('');
            } catch (e) {
                container.innerHTML = \`<div style="color: var(--danger); padding: 1rem;">Error: \${e.message}</div>\`;
            }
        }

        async function checkRealtime() {
            const key = document.getElementById('rt-key').value.trim();
            if (!key) return showToast('Enter key', 'error');
            openRealtimeDetail(key);
            // Also refresh list to ensure it's there if it wasn't before (though check doesn't create, update does)
            // But let's just open detail
        }

        async function openRealtimeDetail(key) {
            try {
                const res = await fetch(\`\${API_URL}/realtime/\${key}\`);
                if (!res.ok) throw new Error(await res.text());
                const val = await res.text();
                
                document.getElementById('rt-display-key').textContent = key;
                document.getElementById('rt-val-display').textContent = val;
                document.getElementById('rt-display').classList.remove('hidden');
                
                // Store current key in a data attribute for actions
                document.getElementById('rt-display').dataset.key = key;
            } catch (e) { showToast(e.message, 'error'); }
        }

        async function updateRealtime() {
            const key = document.getElementById('rt-display').dataset.key;
            const val = document.getElementById('rt-set-val').value;
            if (!key || !val) return showToast('Enter value', 'error');
            if (await fetchAuth(\`\${API_URL}/realtime/\${key}\`, { method: 'PUT', body: JSON.stringify({ val: parseInt(val) }) })) {
                openRealtimeDetail(key);
                loadRealtimeCounters();
                showToast('Updated', 'success');
            }
        }

        async function deleteRealtime(keyArg) {
            const key = keyArg || document.getElementById('rt-display').dataset.key;
            if (!key) return;
            if (!confirm(\`Reset/Delete "\${key}"?\`)) return;
            if (await fetchAuth(\`\${API_URL}/realtime/\${key}\`, { method: 'DELETE' })) {
                document.getElementById('rt-display').classList.add('hidden');
                loadRealtimeCounters();
                showToast('Reset successfully', 'success');
            }
        }

        async function refreshRealtime(key) {
            try {
                const res = await fetch(\`\${API_URL}/realtime/\${key}\`);
                if (!res.ok) throw new Error();
                const val = await res.text();
                const el = document.getElementById(\`rt-val-\${key}\`);
                if (el) {
                    el.innerText = val;
                    el.style.color = 'var(--success)';
                    setTimeout(() => el.style.color = '', 500);
                }
            } catch (e) { console.error(e); }
        }

        function copy(text) { 
            navigator.clipboard.writeText(text); 
            showToast('Copied to clipboard', 'success');
        }

        function showToast(msg, type = 'neutral') {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.className = 'toast show ' + type;
            setTimeout(() => toast.className = 'toast', 3000);
        }

        // Init
        checkAuth();
    </script>
    <div id="toast" class="toast"></div>
</body>
</html>
`;
}

export default app;

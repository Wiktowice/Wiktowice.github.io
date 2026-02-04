/* --- CONFIG & STATE --- */

const FILES = {
    news: '739_news_secure.json',
    bank: 'bank_users', // Using table name logic for Supabase
    restaurant: 'ogolna_restauracja/992_orders_secure.json',
    events: 'site_events.json',
    config: 'site_config.json'
};

let db = { news: [], bank: [], restaurant: [], events: [], config: {} };
let sortState = { context: null, key: null, dir: 'asc' };

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
    // Check Supabase
    if (!_supabase && localStorage.getItem('supabase_warned') !== 'true') {
        alert("⚠️ Skonfiguruj Supabase w pliku supabase_config.js, aby korzystać z bazy danych online!");
        localStorage.setItem('supabase_warned', 'true');
    }

    document.getElementById('login-btn').addEventListener('click', attemptLogin);
    document.getElementById('login-pass').addEventListener('keydown', e => e.key === 'Enter' && attemptLogin());

    /* Sidebar Navigation */
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));

            item.classList.add('active');
            const viewId = 'view-' + item.dataset.view;
            document.getElementById(viewId).classList.add('active');

            if (item.dataset.view === 'dashboard') updateDashboard();
        });
    });
});

/* --- AUTH --- */


async function getAdminPassword() {
    if (typeof _supabase !== 'undefined' && _supabase) {
        const { data, error } = await _supabase
            .from('system_config')
            .select('value')
            .eq('key', 'admin_password')
            .maybeSingle();

        if (error) {
            console.warn("Błąd pobierania hasła z Supabase:", error.message);
            return null;
        }

        if (data && data.value) {
            return data.value;
        }
    }
    return null;
}

async function attemptLogin() {
    const pass = document.getElementById('login-pass').value.trim();
    const correctPass = await getAdminPassword();

    if (!correctPass) {
        showToast('Błąd krytyczny: Nie można pobrać hasła z Supabase. Sprawdź tabelę system_config (klucz: admin_password).', 'error');
        console.error("Failed to retrieve admin password from DB.");
        return;
    }

    if (pass === correctPass) {
        document.getElementById('login-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-container').classList.add('logged-in');
            loadAllData();
            sendDiscordWebhook("🔐 **Admin Login**: Zalogowano do panelu administratora.", 0x00ff00);
        }, 500);
    } else {
        showToast('Odmowa dostępu: Nieprawidłowe hasło', 'error');
        document.getElementById('login-pass').value = '';
    }
}


/* --- DATA OPS --- */
function loadAllData() {
    Object.keys(FILES).forEach(key => loadFile(key, true));
}

async function loadFile(context, silent = false) {
    // SUPABASE SUPPORT
    if (typeof _supabase !== 'undefined' && _supabase) {

        // --- CONFIG (Special Case: Key-Value storage) ---
        if (context === 'config') {
            const { data, error } = await _supabase.from('system_config').select('key, value');
            if (error) {
                console.error("Supabase Config Load Error:", error);
                if (!silent) showToast("Błąd pobierania konfiguracji: " + error.message, 'error');
            } else {
                // Convert KV array to Object
                const configObj = {};
                data.forEach(row => {
                    // Try parsing boolean/json, otherwise string
                    if (row.value === 'true') configObj[row.key] = true;
                    else if (row.value === 'false') configObj[row.key] = false;
                    else configObj[row.key] = row.value;
                });

                // Map DB keys to App keys
                db.config = {
                    discordWebhook: configObj.discord_webhook || '',
                    serverIp: configObj.server_ip || '',
                    maintenance: configObj.maintenance || false,
                    alertMessage: configObj.alert_message || ''
                };
                if (!silent) showToast("Pobrano konfigurację z Supabase", 'success');
            }
        }

        // --- DATA TABLES (News, Bank, Restaurant, Events) ---
        else if (context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') {
            let tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            const orderBy = context === 'bank' ? 'id' : (context === 'events' ? 'date' : 'id');
            const { data, error } = await _supabase.from(tableName).select('*').order(orderBy, { ascending: true });

            if (error) {
                console.error('Supabase Error:', error);
                if (error.code === 'PGRST204' || error.code === '404') {
                    alert(`⚠️ BŁĄD KRYTYCZNY SUPABASE: Brakuje tabeli '${tableName}'`);
                }
                if (!silent) showToast(`Błąd bazy danych (${context}): ` + error.message, 'error');
                db[context] = [];
            } else {
                db[context] = data || [];
                if (!silent) showToast(`Pobrano dane z Supabase (${context})`, 'success');
            }
        }
    } else {
        // ... (Existing JSON Fallback) ...
        try {
            const res = await fetch(FILES[context] + '?nocache=' + Date.now());
            if (!res.ok) throw new Error("404/Error");
            const data = await res.json();
            db[context] = data || (context === 'config' ? {} : []);
            if (!silent) showToast(`Data synced (Local/JSON): ${context}`, 'success');
        } catch (err) {
            console.warn(err);
            db[context] = (context === 'config' ? {} : []);
        }
    }

    refreshView(context);
    if (context !== 'config') sortState = { context: null, key: null, dir: 'asc' };
    updateDashboard();
}

function refreshView(context) {
    if (context === 'news') renderNews();
    if (context === 'bank') renderBank();
    if (context === 'restaurant') renderRestaurant();
    if (context === 'events') renderEvents();
    if (context === 'config') {
        const c = db.config;
        document.getElementById('conf-ip').value = c.serverIp || '';
        document.getElementById('conf-webhook').value = c.discordWebhook || '';
        document.getElementById('conf-maint').value = c.maintenance ? 'true' : 'false';
        document.getElementById('conf-alert').value = c.alertMessage || '';
        updateJsonPreview('config');
    }
    updateJsonPreview(context);
}

async function deleteItem(context, idOrIndex) {


    // SUPABASE DELETE
    if ((context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') && typeof _supabase !== 'undefined' && _supabase) {
        let idToDelete = null;
        if (context === 'bank') {
            idToDelete = idOrIndex;
        } else if (context === 'news' || context === 'restaurant' || context === 'events') {
            // Get ID from object at index
            const item = db[context][idOrIndex];
            if (item && item.id) idToDelete = item.id;
        }

        if (idToDelete) {
            let tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            const { error } = await _supabase.from(tableName).delete().eq('id', idToDelete);

            if (error) {
                showToast('Błąd usuwania z Supabase: ' + error.message, 'error');
                return;
            }
        }
    }
    // If not Supabase or Supabase delete successful, proceed with local data update
    if (context === 'bank') {
        db.bank = db.bank.filter(item => item.id !== idOrIndex);
    } else {
        db[context].splice(idOrIndex, 1);
    }
    showToast('Element usunięty pomyślnie!', 'success');
    refreshView(context);
    updateJsonPreview(context);
}

function updateJsonPreview(context) {
    const el = document.getElementById(`json-${context}`);
    if (el) el.value = JSON.stringify(db[context], null, 4);
}

/* --- SORTING --- */
function sortData(context, key) {
    if (sortState.context !== context || sortState.key !== key) {
        sortState = { context, key, dir: 'asc' };
    } else {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    }

    db[context].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (!isNaN(parseFloat(valA)) && isFinite(valA)) valA = parseFloat(valA);
        if (!isNaN(parseFloat(valB)) && isFinite(valB)) valB = parseFloat(valB);

        if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
        return 0;
    });

    refreshView(context);

    document.querySelectorAll(`#table-${context} th`).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        // Simple heuristic to assume th text matches sort logic or add data-key to th
        // For now, visual update might be skipped or simplified
    });
}

/* --- RENDERING --- */
function renderNews() {
    const tbody = document.querySelector('#table-news tbody');
    tbody.innerHTML = '';
    db.news.forEach((n, i) => {
        tbody.innerHTML += `
            <tr>
                <td><span style="font-family:monospace; color:#888;">${n.date}</span></td>
                <td><strong>${n.title}</strong></td>
                <td>
                    <button class="btn-icon" onclick="openModal('news', ${i})">✏️</button>
                    <button class="btn-icon" style="color:#ff5555" onclick="deleteItem('news', ${i})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function renderBank() {
    const tbody = document.querySelector('#table-bank tbody');
    tbody.innerHTML = '';
    const term = document.getElementById('bank-search').value.toLowerCase();

    db.bank.forEach((u) => {
        if (term && !u.login.toLowerCase().includes(term) && !u.id.toString().includes(term)) return;

        tbody.innerHTML += `
            <tr>
                <td><span style="color:#888;">#${u.id}</span></td>
                <td><strong style="color:white;">${u.login}</strong></td>
                <td>
                    <span style="font-family:monospace; color: ${u.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">
                        $${u.saldo}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="openModal('bank', ${u.id})">✏️</button>
                    <button class="btn-icon" style="color:#ff5555" onclick="deleteItem('bank', ${u.id})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function filterBank() {
    renderBank();
}

function renderRestaurant() {
    const tbody = document.querySelector('#table-restaurant tbody');
    tbody.innerHTML = '';
    const filter = document.getElementById('restaurant-filter').value;

    db.restaurant.forEach((o, i) => {
        if (filter !== 'all' && o.status !== filter) return;

        let statusClass = 'status-pending';
        if (o.status === 'w przygotowaniu') statusClass = 'status-progress';
        if (o.status === 'gotowe') statusClass = 'status-ready';
        if (o.status === 'wydane') statusClass = 'status-delivered';

        tbody.innerHTML += `
            <tr>
                <td><span style="font-family:monospace">#${o.number}</span></td>
                <td><span class="status-badge ${statusClass}">${o.status}</span></td>
                <td>
                    <button class="btn-icon" onclick="openModal('restaurant', ${i})">✏️</button>
                    <button class="btn-icon" style="color:#ff5555" onclick="deleteItem('restaurant', ${i})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

/* --- DASHBOARD --- */
function renderEvents() {
    const tbody = document.querySelector('#table-events tbody');
    tbody.innerHTML = '';

    db.events.forEach((e, i) => {
        // Format date nicely
        let dateDisplay = e.date;
        try {
            const d = new Date(e.date);
            dateDisplay = d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (err) { }

        tbody.innerHTML += `
            <tr>
                <td><span style="font-family:monospace; color:var(--primary);">${dateDisplay}</span></td>
                <td><strong>${e.title}</strong><br><small style="color:#888;">${e.description || ''}</small></td>
                <td>
                    <button class="btn-icon" onclick="openModal('events', ${i})">✏️</button>
                    <button class="btn-icon" style="color:#ff5555" onclick="deleteItem('events', ${i})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function updateDashboard() {
    document.getElementById('stats-news-count').textContent = db.news.length;
    document.getElementById('stats-bank-count').textContent = db.bank.length;
    document.getElementById('stats-orders-count').textContent = db.restaurant.length;

    const statusEl = document.getElementById('stats-status');
    if (db.config.maintenance) {
        statusEl.innerHTML = "● MAINTENANCE MODE";
        statusEl.style.color = "var(--danger)";
        statusEl.style.background = "rgba(239, 68, 68, 0.1)";
    } else {
        statusEl.innerHTML = "● SYSTEM ONLINE";
        statusEl.style.color = "var(--success)";
        statusEl.style.background = "rgba(16, 185, 129, 0.1)";
    }
}

/* --- MODALS & FORMS --- */
let currentModalContext = null;
let currentEditId = null;

function openModal(context, id = null) {
    currentModalContext = context;
    currentEditId = id;

    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');

    modal.classList.add('open');
    title.textContent = id !== null ? `EDYCJA: ${context.toUpperCase()}` : `DODAWANIE: ${context.toUpperCase()}`;

    if (context === 'news') {
        const n = id !== null ? db.news[id] : { title: '', date: new Date().toISOString().split('T')[0], content: '' };
        body.innerHTML = `
            <div class="form-group"><label>Tytuł Posta</label><input id="inp-title" value="${n.title}" placeholder="Wpisz tytuł..."></div>
            <div class="form-group"><label>Data Publikacji</label><input type="date" id="inp-date" value="${n.date}"></div>
            <div class="form-group"><label>Treść</label><textarea id="inp-content" rows="6" placeholder="Treść HTML dozwolona...">${n.content}</textarea></div>
        `;
    } else if (context === 'bank') {
        const u = id !== null ? db.bank.find(user => user.id === id) : { id: '', login: '', haslo: '', saldo: 0 };
        const nextId = id === null ? (db.bank.length > 0 ? Math.max(...db.bank.map(x => x.id)) + 1 : 1) : u.id;

        body.innerHTML = `
            <div class="form-group">
                <label>ID Użytkownika</label>
                <input type="number" id="inp-id" value="${nextId}" readonly style="opacity:0.6; cursor:not-allowed; background:#333;">
            </div>
            <div class="form-group">
                <label>Login (Musi być unikalny)</label>
                <input id="inp-login" value="${u.login}" placeholder="np. JanKowalski">
            </div>
            <div class="form-group">
                <label>Hasło</label>
                <div style="display:flex; gap:10px;">
                    <input id="inp-pass" value="${u.haslo}" placeholder="Wpisz lub wygeneruj...">
                    <button class="btn btn-secondary" onclick="document.getElementById('inp-pass').value = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4); return false;">🎲 Generuj</button>
                </div>
            </div>
            <div class="form-group">
                <label>Saldo Początkowe ($)</label>
                <input type="number" id="inp-saldo" value="${u.saldo}">
            </div>
        `;
    } else if (context === 'restaurant') {
        const o = id !== null ? db.restaurant[id] : { number: '', status: 'oczekuje' };
        body.innerHTML = `
            <div class="form-group"><label>Numer Zamówienia</label><input id="inp-num" value="${o.number}" placeholder="np. #A12"></div>
            <div class="form-group"><label>Status Realizacji</label>
                <select id="inp-status">
                    <option value="oczekuje" ${o.status == 'oczekuje' ? 'selected' : ''}>Oczekuje (Pending)</option>
                    <option value="w przygotowaniu" ${o.status == 'w przygotowaniu' ? 'selected' : ''}>W przygotowaniu</option>
                    <option value="gotowe" ${o.status == 'gotowe' ? 'selected' : ''}>Gotowe do odbioru</option>
                    <option value="wydane" ${o.status == 'wydane' ? 'selected' : ''}>Wydane (Zakończone)</option>
                </select>
            </div>
        `;
    } else if (context === 'events') {
        const e = id !== null ? db.events[id] : { title: '', date: '', description: '' };
        body.innerHTML = `
            <div class="form-group"><label>Nazwa Wydarzenia</label><input id="inp-event-title" value="${e.title}" placeholder="np. Wybory Burmistrza"></div>
            <div class="form-group"><label>Data i Godzina</label><input type="datetime-local" id="inp-event-date" value="${e.date}"></div>
            <div class="form-group"><label>Opis (Opcjonalny)</label><input id="inp-event-desc" value="${e.description}" placeholder="Krótki opis..."></div>
        `;
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-save-btn').addEventListener('click', () => {
    try {
        if (currentModalContext === 'news') {
            const oldItem = currentEditId !== null ? db.news[currentEditId] : {};
            const n = {
                ...oldItem,
                title: document.getElementById('inp-title').value,
                date: document.getElementById('inp-date').value,
                content: document.getElementById('inp-content').value
            };
            if (!n.title) throw new Error("Tytuł jest wymagany!");

            if (currentEditId !== null) db.news[currentEditId] = n;
            else {
                n.id = Date.now(); // Generate ID for new items
                db.news.push(n);
            }
        }
        else if (currentModalContext === 'bank') {
            const id = parseInt(document.getElementById('inp-id').value);
            const login = document.getElementById('inp-login').value.trim();
            const haslo = document.getElementById('inp-pass').value.trim();
            const saldo = parseInt(document.getElementById('inp-saldo').value || 0);

            if (!login) throw new Error("Login jest wymagany!");
            if (!haslo) throw new Error("Hasło jest wymagane!");

            // Check uniqueness logic
            const existingUser = db.bank.find(u => u.login.toLowerCase() === login.toLowerCase());

            if (currentEditId === null) {
                // Creating new
                if (existingUser) throw new Error(`Użytkownik "${login}" już istnieje!`);
                if (db.bank.find(u => u.id === id)) throw new Error("INTERNAL ERROR: ID zajęte.");

                db.bank.push({ id, login, haslo, saldo });
            } else {
                // Editing existing
                if (existingUser && existingUser.id !== currentEditId) throw new Error(`Login "${login}" jest już zajęty.`);

                const idx = db.bank.findIndex(u => u.id === currentEditId);
                if (idx > -1) db.bank[idx] = { id, login, haslo, saldo };
            }
        }
        else if (currentModalContext === 'restaurant') {
            const oldItem = currentEditId !== null ? db.restaurant[currentEditId] : {};
            const o = {
                ...oldItem,
                number: document.getElementById('inp-num').value,
                status: document.getElementById('inp-status').value
            };
            if (!o.number) throw new Error("Numer zamówienia wymagany!");

            if (currentEditId !== null) db.restaurant[currentEditId] = o;
            else {
                o.id = Date.now(); // Generate ID for new items
                db.restaurant.push(o);
            }
        }
        else if (currentModalContext === 'events') {
            const oldItem = currentEditId !== null ? db.events[currentEditId] : {};
            const e = {
                ...oldItem,
                title: document.getElementById('inp-event-title').value,
                date: document.getElementById('inp-event-date').value,
                description: document.getElementById('inp-event-desc').value
            };

            if (!e.title) throw new Error("Nazwa wydarzenia jest wymagana!");
            if (!e.date) throw new Error("Data jest wymagana!");

            if (currentEditId !== null) db.events[currentEditId] = e;
            else {
                e.id = Date.now();
                db.events.push(e);
            }
        }

        saveToLocal(currentModalContext); // Zapisz na dysku
        closeModal();
        refreshView(currentModalContext);
        updateDashboard();
        showToast('Zapisano pomyślnie!', 'success');

    } catch (e) {
        showToast(e.message, 'error');
    }
});

async function deleteItem(context, idOrIndex) {


    // SUPABASE DELETE
    if ((context === 'bank' || context === 'news') && typeof _supabase !== 'undefined' && _supabase) {
        let idToDelete = null;
        if (context === 'bank') {
            idToDelete = idOrIndex; // Passed as ID for bank
        } else if (context === 'news') {
            // For news, idOrIndex is the array index. We need to get the item's ID.
            const n = db.news[idOrIndex];
            if (n && n.id) idToDelete = n.id;
        }

        if (idToDelete) {
            const tableName = context === 'bank' ? 'bank_users' : 'news';
            const { error } = await _supabase.from(tableName).delete().eq('id', idToDelete);

            if (error) {
                showToast('Błąd usuwania z Supabase: ' + error.message, 'error');
                return; // Stop if Supabase deletion failed
            }
        }
    }

    // LOCAL ARRAY DELETE
    if (context === 'bank') {
        db.bank = db.bank.filter(u => u.id !== idOrIndex);
    } else {
        db[context].splice(idOrIndex, 1);
    }

    saveToLocal(context);
    refreshView(context);
    updateDashboard();
    showToast('Element usunięty.', 'success');
}

async function saveToLocal(context) {
    // 1. LocalStorage
    localStorage.setItem('admin_db_' + context, JSON.stringify(db[context]));
    updateJsonPreview(context);
    updateDashboard();

    // 2. Supabase
    if (typeof _supabase !== 'undefined' && _supabase) {
        showToast('⏳ Wysyłanie do Supabase...', 'info');

        // --- CONFIG SAVE ---
        if (context === 'config') {
            const updates = [
                { key: 'server_ip', value: db.config.serverIp || '' },
                { key: 'discord_webhook', value: db.config.discordWebhook || '' },
                { key: 'maintenance', value: db.config.maintenance ? 'true' : 'false' },
                { key: 'alert_message', value: db.config.alertMessage || '' }
            ];

            const { error } = await _supabase.from('system_config').upsert(updates);
            if (error) {
                console.error("Config Save Error:", error);
                showToast('⚠️ Błąd zapisu konfiguracji: ' + error.message, 'error');
            } else {
                showToast('✅ Konfiguracja zapisana w chmurze', 'success');
                sendDiscordWebhook("⚙️ **Config**: Zaktualizowano konfigurację systemu.", 0xffff00);
            }
            return;
        }

        // --- OTHER DATA SAVE (News, Bank, Restaurant, Events) ---
        if (context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') {
            let tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            const { data, error } = await _supabase.from(tableName).upsert(db[context]).select();

            if (error) {
                console.error("Supabase Save Error:", error);
                showToast('⚠️ Błąd chmury: ' + error.message, 'error');
            } else {
                showToast('✅ Zsynchronizowano z chmurą', 'success');
                if (data) db[context] = data;
                refreshView(context);

                // Discord Notification for Data Update
                let msg = `💾 **Update**: Zaktualizowano dane w sekcji **${context.toUpperCase()}**.`;
                if (context === 'news') msg = `📰 **News**: Dodano/Edytowano post.`;
                if (context === 'restaurant') msg = `🍔 **Restauracja**: Zaktualizowano status zamówienia.`;
                if (context === 'bank') msg = `💰 **Bank**: Zmiana w rejestrze bankowym.`;
                if (context === 'events') msg = `📅 **Event**: Zaktualizowano kalendarz wydarzeń.`;

                sendDiscordWebhook(msg, 0x0099ff);
            }
            return;
        }
    }

    // 3. Sprawdź środowisko i spróbuj zapisać trwale
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const hasNeocitiesKey = localStorage.getItem('neocities_api_key');

    if (isLocalhost) {
        // --- LOCALHOST: Zapis przez Python Server ---
        fetch('http://localhost:3000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: FILES[context], content: db[context] })
        })
            .then(res => res.ok ? showToast('✅ Zapisano lokalnie (Serwer)', 'success') : showToast('⚠️ Błąd lokalnego serwera', 'warning'))
            .catch(() => showToast('⚠️ Zapisano w przeglądarce (Serwer wyłączony)', 'info'));

    } else if (hasNeocitiesKey) {
        // --- HOSTING Z KLUCZEM (np. Neocities) ---
        uploadToNeocities(FILES[context], db[context]);

    } else if (window.location.hostname.includes('github.io')) {
        // --- GITHUB PAGES ---
        showToast('ℹ️ GitHub Pages: Zapisano w przeglądarce.', 'success');

    } else {
        // --- INNY HOSTING ---
        showToast('✅ Zapisano w przeglądarce.', 'success');
    }
}

async function uploadToNeocities(filename, contentObj) {
    let apiKey = localStorage.getItem('neocities_api_key');
    if (!apiKey) {
        apiKey = prompt("Podaj swój klucz API Neocities (Wejdź w Neocities -> Settings -> API Key):");
        if (apiKey) localStorage.setItem('neocities_api_key', apiKey);
        else return;
    }

    const formData = new FormData();
    const blob = new Blob([JSON.stringify(contentObj, null, 4)], { type: 'application/json' });
    formData.append(filename, blob, filename);

    showToast('⏳ Wysyłanie do Neocities...', 'info');

    try {
        const response = await fetch('https://neocities.org/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (response.ok) {
            showToast('🚀 Zapisano na Neocities! (Odczekaj 30s na odświeżenie)', 'success');
        } else {
            throw new Error(`Status: ${response.status}`);
        }
    } catch (e) {
        console.error(e);
        const retry = confirm(`Błąd wysyłania: ${e.message}.\n\nTo prawdopodobnie blokada CORS (przeglądarki).\n\n1. Zainstaluj wtyczkę "Allow CORS" w Chrome/Firefox.\n2. LUB użyj lokalnego panelu.\n\nCzy chcesz spróbować ponownie (np. po włączeniu wtyczki)?`);
        if (retry) uploadToNeocities(filename, contentObj);
    }
}

function saveConfig() {
    db.config = {
        serverIp: document.getElementById('conf-ip').value,
        discordWebhook: document.getElementById('conf-webhook').value,
        maintenance: document.getElementById('conf-maint').value === 'true',
        alertMessage: document.getElementById('conf-alert').value
    };
    saveToLocal('config');
    refreshView('config');
    updateDashboard();
    showToast('Konfiguracja zaktualizowana (Lokalnie)', 'success');
}

/* --- UTILS --- */
function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    el.select();
    document.execCommand('copy');
    showToast('JSON skopiowany do schowka!', 'success');
}

function showToast(msg, type = 'success') {
    const box = document.createElement('div');
    box.className = `toast ${type}`;
    box.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> ${msg}`;
    document.getElementById('toast-container').appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(100%)';
        setTimeout(() => box.remove(), 300);
    }, 3000);
}

function navTo(viewName) {
    const item = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (item) item.click();
}

function sendDiscordWebhook(content, color = 0xffffff) {
    if (!db.config.discordWebhook) return;

    const payload = {
        username: "Wiktowice System",
        avatar_url: "https://wiktowice.github.io/favicon-32x32.png",
        embeds: [{
            description: content,
            color: color,
            footer: { text: "Wiktowice Admin OS" },
            timestamp: new Date().toISOString()
        }]
    };

    fetch(db.config.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.warn("Discord Webhook Error:", err));
}

/* --- CONFIG & STATE --- */

var FILES = {
    news: '739_news_secure.json',
    bank: 'bank_users', // Using table name logic for Supabase
    restaurant: 'ogolna_restauracja/992_orders_secure.json',
    events: 'site_events.json',
    config: 'site_config.json'
};

var db = { news: [], bank: [], restaurant: [], events: [], config: {} };
var sortState = { context: null, key: null, dir: 'asc' };

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', function () {
    // Check Supabase
    if (typeof _supabase === 'undefined' && localStorage.getItem('supabase_warned') !== 'true') {
        alert("⚠️ Skonfiguruj Supabase w pliku supabase_config.js, aby korzystać z bazy danych online!");
        localStorage.setItem('supabase_warned', 'true');
    }

    document.getElementById('login-btn').addEventListener('click', attemptLogin);
    document.getElementById('login-pass').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) attemptLogin();
    });

    /* Sidebar Navigation */
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
        (function (item) {
            item.addEventListener('click', function () {
                var allNavItems = document.querySelectorAll('.nav-item');
                for (var j = 0; j < allNavItems.length; j++) {
                    allNavItems[j].classList.remove('active');
                }
                var allViews = document.querySelectorAll('.view-section');
                for (var k = 0; k < allViews.length; k++) {
                    allViews[k].classList.remove('active');
                }

                item.classList.add('active');
                var viewId = 'view-' + item.getAttribute('data-view');
                document.getElementById(viewId).classList.add('active');

                if (item.getAttribute('data-view') === 'dashboard') updateDashboard();
            });
        })(navItems[i]);
    }
});

/* --- AUTH --- */


function getAdminPassword() {
    if (typeof _supabase !== 'undefined' && _supabase) {
        return _supabase
            .from('system_config')
            .select('value')
            .eq('key', 'admin_password')
            .maybeSingle()
            .then(function (res) {
                var data = res.data;
                var error = res.error;
                if (error) {
                    console.warn("Błąd pobierania hasła z Supabase:", error.message);
                    return null;
                }
                if (data && data.value) {
                    return data.value;
                }
                return null;
            });
    }
    return Promise.resolve(null);
}

function attemptLogin() {
    var pass = document.getElementById('login-pass').value.trim();
    getAdminPassword().then(function (correctPass) {
        if (!correctPass) {
            showToast('Błąd krytyczny: Nie można pobrać hasła z Supabase. Sprawdź tabelę system_config (klucz: admin_password).', 'error');
            console.error("Failed to retrieve admin password from DB.");
            return;
        }

        if (pass === correctPass) {
            document.getElementById('login-screen').style.opacity = '0';
            setTimeout(function () {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').classList.add('logged-in');
                loadAllData();
                sendDiscordWebhook("🔐 **Admin Login**: Zalogowano do panelu administratora.", 0x00ff00);
            }, 500);
        } else {
            showToast('Odmowa dostępu: Nieprawidłowe hasło', 'error');
            document.getElementById('login-pass').value = '';
        }
    });
}


/* --- DATA OPS --- */
function loadAllData() {
    var keys = Object.keys(FILES);
    for (var i = 0; i < keys.length; i++) {
        loadFile(keys[i], true);
    }
}

function loadFile(context, silent) {
    if (silent === undefined) silent = false;

    // SUPABASE SUPPORT
    if (typeof _supabase !== 'undefined' && _supabase) {

        // --- CONFIG (Special Case: Key-Value storage) ---
        if (context === 'config') {
            _supabase.from('system_config').select('key, value').then(function (res) {
                var data = res.data;
                var error = res.error;
                if (error) {
                    console.error("Supabase Config Load Error:", error);
                    if (!silent) showToast("Błąd pobierania konfiguracji: " + error.message, 'error');
                } else {
                    // Convert KV array to Object
                    var configObj = {};
                    if (data) {
                        for (var i = 0; i < data.length; i++) {
                            var row = data[i];
                            if (row.value === 'true') configObj[row.key] = true;
                            else if (row.value === 'false') configObj[row.key] = false;
                            else configObj[row.key] = row.value;
                        }
                    }

                    // Map DB keys to App keys
                    db.config = {
                        discordWebhook: configObj.discord_webhook || '',
                        serverIp: configObj.server_ip || '',
                        maintenance: configObj.maintenance || false,
                        alertMessage: configObj.alert_message || ''
                    };
                    if (!silent) showToast("Pobrano konfigurację z Supabase", 'success');
                    refreshView(context);
                    updateDashboard();
                }
            });
        }

        // --- DATA TABLES (News, Bank, Restaurant, Events) ---
        else if (context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') {
            var tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            var orderBy = context === 'bank' ? 'id' : (context === 'events' ? 'date' : 'id');
            _supabase.from(tableName).select('*').order(orderBy, { ascending: true }).then(function (res) {
                var data = res.data;
                var error = res.error;
                if (error) {
                    console.error('Supabase Error:', error);
                    if (error.code === 'PGRST204' || error.code === '404') {
                        alert("⚠️ BŁĄD KRYTYCZNY SUPABASE: Brakuje tabeli '" + tableName + "'");
                    }
                    if (!silent) showToast("Błąd bazy danych (" + context + "): " + error.message, 'error');
                    db[context] = [];
                } else {
                    db[context] = data || [];
                    if (!silent) showToast("Pobrano dane z Supabase (" + context + ")", 'success');
                }
                refreshView(context);
                if (context !== 'config') sortState = { context: null, key: null, dir: 'asc' };
                updateDashboard();
            });
        }
    } else {
        // ... (Existing JSON Fallback) ...
        fetch(FILES[context] + '?nocache=' + Date.now()).then(function (res) {
            if (!res.ok) throw new Error("404/Error");
            return res.json();
        }).then(function (data) {
            db[context] = data || (context === 'config' ? {} : []);
            if (!silent) showToast("Data synced (Local/JSON): " + context, 'success');
            refreshView(context);
            if (context !== 'config') sortState = { context: null, key: null, dir: 'asc' };
            updateDashboard();
        }).catch(function (err) {
            console.warn(err);
            db[context] = (context === 'config' ? {} : []);
            refreshView(context);
            if (context !== 'config') sortState = { context: null, key: null, dir: 'asc' };
            updateDashboard();
        });
    }
}

function refreshView(context) {
    if (context === 'news') renderNews();
    if (context === 'bank') renderBank();
    if (context === 'restaurant') renderRestaurant();
    if (context === 'events') renderEvents();
    if (context === 'config') {
        var c = db.config;
        document.getElementById('conf-ip').value = c.serverIp || '';
        document.getElementById('conf-webhook').value = c.discordWebhook || '';
        document.getElementById('conf-maint').value = c.maintenance ? 'true' : 'false';
        document.getElementById('conf-alert').value = c.alertMessage || '';
        updateJsonPreview('config');
    }
    updateJsonPreview(context);
}

function deleteItem(context, idOrIndex) {
    // SUPABASE DELETE
    if ((context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') && typeof _supabase !== 'undefined' && _supabase) {
        var idToDelete = null;
        if (context === 'bank') {
            idToDelete = idOrIndex;
        } else if (context === 'news' || context === 'restaurant' || context === 'events') {
            // Get ID from object at index
            var item = db[context][idOrIndex];
            if (item && item.id) idToDelete = item.id;
        }

        if (idToDelete) {
            var tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            _supabase.from(tableName).delete().eq('id', idToDelete).then(function (res) {
                if (res.error) {
                    showToast('Błąd usuwania z Supabase: ' + res.error.message, 'error');
                } else {
                    finishDelete(context, idOrIndex);
                }
            });
            return;
        }
    }
    finishDelete(context, idOrIndex);
}

function finishDelete(context, idOrIndex) {
    if (context === 'bank') {
        db.bank = db.bank.filter(function (item) { return item.id !== idOrIndex; });
    } else {
        db[context].splice(idOrIndex, 1);
    }
    showToast('Element usunięty pomyślnie!', 'success');
    saveToLocal(context); // Also save after delete
    refreshView(context);
    updateJsonPreview(context);
    updateDashboard();
}

function updateJsonPreview(context) {
    var el = document.getElementById("json-" + context);
    if (el) el.value = JSON.stringify(db[context], null, 4);
}

/* --- SORTING --- */
function sortData(context, key) {
    if (sortState.context !== context || sortState.key !== key) {
        sortState = { context: context, key: key, dir: 'asc' };
    } else {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    }

    db[context].sort(function (a, b) {
        var valA = a[key];
        var valB = b[key];

        if (!isNaN(parseFloat(valA)) && isFinite(valA)) valA = parseFloat(valA);
        if (!isNaN(parseFloat(valB)) && isFinite(valB)) valB = parseFloat(valB);

        if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
        return 0;
    });

    refreshView(context);
}

/* --- RENDERING --- */
function renderNews() {
    var tbody = document.querySelector('#table-news tbody');
    tbody.innerHTML = '';
    for (var i = 0; i < db.news.length; i++) {
        var n = db.news[i];
        tbody.innerHTML += '<tr>' +
            '<td><span style="font-family:monospace; color:#888;">' + n.date + '</span></td>' +
            '<td><strong>' + n.title + '</strong></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="openModal(\'news\', ' + i + ')">✏️</button>' +
            '<button class="btn-icon" style="color:#ff5555" onclick="deleteItem(\'news\', ' + i + ')">🗑️</button>' +
            '</td>' +
            '</tr>';
    }
}

function renderBank() {
    var tbody = document.querySelector('#table-bank tbody');
    tbody.innerHTML = '';
    var term = document.getElementById('bank-search').value.toLowerCase();

    for (var i = 0; i < db.bank.length; i++) {
        var u = db.bank[i];
        if (term && u.login.toLowerCase().indexOf(term) === -1 && u.id.toString().indexOf(term) === -1) continue;

        var saldoStyle = 'font-family:monospace; color: ' + (u.saldo >= 0 ? 'var(--success)' : 'var(--danger)');
        tbody.innerHTML += '<tr>' +
            '<td><span style="color:#888;">#' + u.id + '</span></td>' +
            '<td><strong style="color:white;">' + u.login + '</strong></td>' +
            '<td><span style="' + saldoStyle + '">$' + u.saldo + '</span></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="openModal(\'bank\', ' + u.id + ')">✏️</button>' +
            '<button class="btn-icon" style="color:#ff5555" onclick="deleteItem(\'bank\', ' + u.id + ')">🗑️</button>' +
            '</td>' +
            '</tr>';
    }
}

function filterBank() {
    renderBank();
}

function renderRestaurant() {
    var tbody = document.querySelector('#table-restaurant tbody');
    tbody.innerHTML = '';
    var filter = document.getElementById('restaurant-filter').value;

    for (var i = 0; i < db.restaurant.length; i++) {
        var o = db.restaurant[i];
        if (filter !== 'all' && o.status !== filter) continue;

        var statusClass = 'status-pending';
        if (o.status === 'w przygotowaniu') statusClass = 'status-progress';
        if (o.status === 'gotowe') statusClass = 'status-ready';
        if (o.status === 'wydane') statusClass = 'status-delivered';

        tbody.innerHTML += '<tr>' +
            '<td><span style="font-family:monospace">#' + o.number + '</span></td>' +
            '<td><span class="status-badge ' + statusClass + '">' + o.status + '</span></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="openModal(\'restaurant\', ' + i + ')">✏️</button>' +
            '<button class="btn-icon" style="color:#ff5555" onclick="deleteItem(\'restaurant\', ' + i + ')">🗑️</button>' +
            '</td>' +
            '</tr>';
    }
}

function renderEvents() {
    var tbody = document.querySelector('#table-events tbody');
    tbody.innerHTML = '';

    for (var i = 0; i < db.events.length; i++) {
        var e = db.events[i];
        var dateDisplay = e.date;
        try {
            var d = new Date(e.date);
            dateDisplay = d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (err) { }

        tbody.innerHTML += '<tr>' +
            '<td><span style="font-family:monospace; color:var(--primary);">' + dateDisplay + '</span></td>' +
            '<td><strong>' + e.title + '</strong><br><small style="color:#888;">' + (e.description || '') + '</small></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="openModal(\'events\', ' + i + ')">✏️</button>' +
            '<button class="btn-icon" style="color:#ff5555" onclick="deleteItem(\'events\', ' + i + ')">🗑️</button>' +
            '</td>' +
            '</tr>';
    }
}

function updateDashboard() {
    document.getElementById('stats-news-count').textContent = db.news.length;
    document.getElementById('stats-bank-count').textContent = db.bank.length;
    document.getElementById('stats-orders-count').textContent = db.restaurant.length;

    var statusEl = document.getElementById('stats-status');
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
var currentModalContext = null;
var currentEditId = null;

function openModal(context, id) {
    if (id === undefined) id = null;
    currentModalContext = context;
    currentEditId = id;

    var modal = document.getElementById('modal-overlay');
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');

    modal.classList.add('open');
    title.textContent = id !== null ? 'EDYCJA: ' + context.toUpperCase() : 'DODAWANIE: ' + context.toUpperCase();

    if (context === 'news') {
        var n = id !== null ? db.news[id] : { title: '', date: new Date().toISOString().split('T')[0], content: '' };
        body.innerHTML = '<div class="form-group"><label>Tytuł Posta</label><input id="inp-title" value="' + n.title + '" placeholder="Wpisz tytuł..."></div>' +
            '<div class="form-group"><label>Data Publikacji</label><input type="date" id="inp-date" value="' + n.date + '"></div>' +
            '<div class="form-group"><label>Treść</label><textarea id="inp-content" rows="6" placeholder="Treść HTML dozwolona...">' + n.content + '</textarea></div>';
    } else if (context === 'bank') {
        var u = id !== null ? (function () {
            for (var i = 0; i < db.bank.length; i++) if (db.bank[i].id === id) return db.bank[i];
            return null;
        })() : { id: '', login: '', haslo: '', saldo: 0 };

        var nextId = id === null ? (db.bank.length > 0 ? Math.max.apply(Math, db.bank.map(function (x) { return x.id; })) + 1 : 1) : u.id;

        body.innerHTML = '<div class="form-group">' +
            '<label>ID Użytkownika</label>' +
            '<input type="number" id="inp-id" value="' + nextId + '" readonly style="opacity:0.6; cursor:not-allowed; background:#333;">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Login (Musi być unikalny)</label>' +
            '<input id="inp-login" value="' + u.login + '" placeholder="np. JanKowalski">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Hasło</label>' +
            '<div style="display:flex; gap:10px;">' +
            '<input id="inp-pass" value="' + u.haslo + '" placeholder="Wpisz lub wygeneruj...">' +
            '<button class="btn btn-secondary" id="btn-gen-pass">🎲 Generuj</button>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Saldo Początkowe ($)</label>' +
            '<input type="number" id="inp-saldo" value="' + u.saldo + '">' +
            '</div>';

        document.getElementById('btn-gen-pass').onclick = function () {
            document.getElementById('inp-pass').value = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
            return false;
        };
    } else if (context === 'restaurant') {
        var o = id !== null ? db.restaurant[id] : { number: '', status: 'oczekuje' };
        body.innerHTML = '<div class="form-group"><label>Numer Zamówienia</label><input id="inp-num" value="' + o.number + '" placeholder="np. #A12"></div>' +
            '<div class="form-group"><label>Status Realizacji</label>' +
            '<select id="inp-status">' +
            '<option value="oczekuje" ' + (o.status == 'oczekuje' ? 'selected' : '') + '>Oczekuje (Pending)</option>' +
            '<option value="w przygotowaniu" ' + (o.status == 'w przygotowaniu' ? 'selected' : '') + '>W przygotowaniu</option>' +
            '<option value="gotowe" ' + (o.status == 'gotowe' ? 'selected' : '') + '>Gotowe do odbioru</option>' +
            '<option value="wydane" ' + (o.status == 'wydane' ? 'selected' : '') + '>Wydane (Zakończone)</option>' +
            '</select></div>';
    } else if (context === 'events') {
        var e = id !== null ? db.events[id] : { title: '', date: '', description: '' };
        body.innerHTML = '<div class="form-group"><label>Nazwa Wydarzenia</label><input id="inp-event-title" value="' + e.title + '" placeholder="np. Wybory Burmistrza"></div>' +
            '<div class="form-group"><label>Data i Godzina</label><input type="datetime-local" id="inp-event-date" value="' + e.date + '"></div>' +
            '<div class="form-group"><label>Opis (Opcjonalny)</label><input id="inp-event-desc" value="' + (e.description || '') + '" placeholder="Krótki opis..."></div>';
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-save-btn').addEventListener('click', function () {
    try {
        if (currentModalContext === 'news') {
            var oldItem = currentEditId !== null ? db.news[currentEditId] : {};
            var n = {
                id: oldItem.id || Date.now(),
                title: document.getElementById('inp-title').value,
                date: document.getElementById('inp-date').value,
                content: document.getElementById('inp-content').value
            };
            if (!n.title) throw new Error("Tytuł jest wymagany!");

            if (currentEditId !== null) db.news[currentEditId] = n;
            else db.news.push(n);
        }
        else if (currentModalContext === 'bank') {
            var id = parseInt(document.getElementById('inp-id').value);
            var login = document.getElementById('inp-login').value.trim();
            var haslo = document.getElementById('inp-pass').value.trim();
            var saldo = parseInt(document.getElementById('inp-saldo').value || 0);

            if (!login) throw new Error("Login jest wymagany!");
            if (!haslo) throw new Error("Hasło jest wymagane!");

            var existingUser = null;
            for (var i = 0; i < db.bank.length; i++) {
                if (db.bank[i].login.toLowerCase() === login.toLowerCase()) {
                    existingUser = db.bank[i];
                    break;
                }
            }

            if (currentEditId === null) {
                if (existingUser) throw new Error('Użytkownik "' + login + '" już istnieje!');
                db.bank.push({ id: id, login: login, haslo: haslo, saldo: saldo });
            } else {
                if (existingUser && existingUser.id !== currentEditId) throw new Error('Login "' + login + '" jest już zajęty.');
                var idx = -1;
                for (var j = 0; j < db.bank.length; j++) {
                    if (db.bank[j].id === currentEditId) {
                        idx = j;
                        break;
                    }
                }
                if (idx > -1) db.bank[idx] = { id: id, login: login, haslo: haslo, saldo: saldo };
            }
        }
        else if (currentModalContext === 'restaurant') {
            var oldRestItem = currentEditId !== null ? db.restaurant[currentEditId] : {};
            var o = {
                id: oldRestItem.id || Date.now(),
                number: document.getElementById('inp-num').value,
                status: document.getElementById('inp-status').value
            };
            if (!o.number) throw new Error("Numer zamówienia wymagany!");

            if (currentEditId !== null) db.restaurant[currentEditId] = o;
            else db.restaurant.push(o);
        }
        else if (currentModalContext === 'events') {
            var oldEventItem = currentEditId !== null ? db.events[currentEditId] : {};
            var e = {
                id: oldEventItem.id || Date.now(),
                title: document.getElementById('inp-event-title').value,
                date: document.getElementById('inp-event-date').value,
                description: document.getElementById('inp-event-desc').value
            };

            if (!e.title) throw new Error("Nazwa wydarzenia jest wymagana!");
            if (!e.date) throw new Error("Data jest wymagana!");

            if (currentEditId !== null) db.events[currentEditId] = e;
            else db.events.push(e);
        }

        saveToLocal(currentModalContext);
        closeModal();
        refreshView(currentModalContext);
        updateDashboard();
        showToast('Zapisano pomyślnie!', 'success');

    } catch (err) {
        showToast(err.message, 'error');
    }
});

function saveToLocal(context) {
    // 1. LocalStorage
    localStorage.setItem('admin_db_' + context, JSON.stringify(db[context]));
    updateJsonPreview(context);
    updateDashboard();

    // 2. Supabase
    if (typeof _supabase !== 'undefined' && _supabase) {
        showToast('⏳ Wysyłanie do Supabase...', 'info');

        if (context === 'config') {
            var updates = [
                { key: 'server_ip', value: db.config.serverIp || '' },
                { key: 'discord_webhook', value: db.config.discordWebhook || '' },
                { key: 'maintenance', value: db.config.maintenance ? 'true' : 'false' },
                { key: 'alert_message', value: db.config.alertMessage || '' }
            ];

            _supabase.from('system_config').upsert(updates).then(function (res) {
                if (res.error) {
                    console.error("Config Save Error:", res.error);
                    showToast('⚠️ Błąd zapisu konfiguracji: ' + res.error.message, 'error');
                } else {
                    showToast('✅ Konfiguracja zapisana w chmurze', 'success');
                    sendDiscordWebhook("⚙️ **Config**: Zaktualizowano konfigurację systemu.", 0xffff00);
                }
            });
            return;
        }

        if (context === 'bank' || context === 'news' || context === 'restaurant' || context === 'events') {
            var tableName = 'bank_users';
            if (context === 'news') tableName = 'news';
            if (context === 'restaurant') tableName = 'orders';
            if (context === 'events') tableName = 'events';

            _supabase.from(tableName).upsert(db[context]).select().then(function (res) {
                if (res.error) {
                    console.error("Supabase Save Error:", res.error);
                    showToast('⚠️ Błąd chmury: ' + res.error.message, 'error');
                } else {
                    showToast('✅ Zsynchronizowano z chmurą', 'success');
                    if (res.data) db[context] = res.data;
                    refreshView(context);

                    var msg = '💾 **Update**: Zaktualizowano dane w sekcji **' + context.toUpperCase() + '**.';
                    if (context === 'news') msg = '📰 **News**: Dodano/Edytowano post.';
                    if (context === 'restaurant') msg = '🍔 **Restauracja**: Zaktualizowano status zamówienia.';
                    if (context === 'bank') msg = '💰 **Bank**: Zmiana w rejestrze bankowym.';
                    if (context === 'events') msg = '📅 **Event**: Zaktualizowano kalendarz wydarzeń.';

                    sendDiscordWebhook(msg, 0x0099ff);
                }
            });
            return;
        }
    }

    // 3. Sprawdź środowisko i spróbuj zapisać trwale
    var isLocalhost = ['localhost', '127.0.0.1'].indexOf(window.location.hostname) !== -1;
    var hasNeocitiesKey = localStorage.getItem('neocities_api_key');

    if (isLocalhost) {
        fetch('http://localhost:3000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: FILES[context], content: db[context] })
        })
            .then(function (res) { return res.ok ? showToast('✅ Zapisano lokalnie (Serwer)', 'success') : showToast('⚠️ Błąd lokalnego serwera', 'warning'); })
            .catch(function () { return showToast('⚠️ Zapisano w przeglądarce (Serwer wyłączony)', 'info'); });

    } else if (hasNeocitiesKey) {
        uploadToNeocities(FILES[context], db[context]);
    } else if (window.location.hostname.indexOf('github.io') !== -1) {
        showToast('ℹ️ GitHub Pages: Zapisano w przeglądarce.', 'success');
    } else {
        showToast('✅ Zapisano w przeglądarce.', 'success');
    }
}

function uploadToNeocities(filename, contentObj) {
    var apiKey = localStorage.getItem('neocities_api_key');
    if (!apiKey) {
        apiKey = prompt("Podaj swój klucz API Neocities (Wejdź w Neocities -> Settings -> API Key):");
        if (apiKey) localStorage.setItem('neocities_api_key', apiKey);
        else return;
    }

    var formData = new FormData();
    var blob = new Blob([JSON.stringify(contentObj, null, 4)], { type: 'application/json' });
    formData.append(filename, blob, filename);

    showToast('⏳ Wysyłanie do Neocities...', 'info');

    fetch('https://neocities.org/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
        body: formData
    }).then(function (res) {
        if (res.ok) {
            showToast('🚀 Zapisano na Neocities! (Odczekaj 30s na odświeżenie)', 'success');
        } else {
            throw new Error('Status: ' + res.status);
        }
    }).catch(function (err) {
        console.error(err);
        var retry = confirm('Błąd wysyłania: ' + err.message + '.\n\nTo prawdopodobnie blokada CORS.\n\nCzy chcesz spróbować ponownie?');
        if (retry) uploadToNeocities(filename, contentObj);
    });
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
    var el = document.getElementById(elementId);
    el.select();
    document.execCommand('copy');
    showToast('JSON skopiowany do schowka!', 'success');
}

function showToast(msg, type) {
    if (type === undefined) type = 'success';
    var box = document.createElement('div');
    box.className = 'toast ' + type;
    box.innerHTML = '<span>' + (type === 'success' ? '✅' : '⚠️') + '</span> ' + msg;
    document.getElementById('toast-container').appendChild(box);
    setTimeout(function () {
        box.style.opacity = '0';
        box.style.transform = 'translateY(100%)';
        setTimeout(function () { box.parentNode && box.parentNode.removeChild(box); }, 300);
    }, 3000);
}

function navTo(viewName) {
    var item = document.querySelector('.nav-item[data-view="' + viewName + '"]');
    if (item) item.click();
}

function sendDiscordWebhook(content, color) {
    if (color === undefined) color = 0xffffff;
    if (!db || !db.config || !db.config.discordWebhook) return;

    var payload = {
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
    }).catch(function (err) { console.warn("Discord Webhook Error:", err); });
}

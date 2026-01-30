document.addEventListener("DOMContentLoaded", function () {

    let users = [];
    let config = {}; // Store site config
    let editingId = null; // Track if we are editing a user

    // --- SETUP LISTENERS ---

    // Auth & Navigation
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', () => { playClick(); login(); });

    // Register Button (Toggle View)
    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => {
        playClick();
        toggleView('register');
    });

    const doRegisterBtn = document.getElementById('do-register-btn');
    if (doRegisterBtn) doRegisterBtn.addEventListener('click', () => { playClick(); register(); });

    const backToLoginBtn = document.getElementById('back-to-login-btn');
    if (backToLoginBtn) backToLoginBtn.addEventListener('click', () => {
        playClick();
        toggleView('login');
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { playClick(); logout(); });

    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminLoginBtn) adminLoginBtn.addEventListener('click', () => { playClick(); adminLogin(); });

    // Admin Panel Actions
    const saveAccountBtn = document.getElementById('save-account-btn');
    if (saveAccountBtn) saveAccountBtn.addEventListener('click', () => { playClick(); saveUser(); });

    const clearFormBtn = document.getElementById('clear-form-btn');
    if (clearFormBtn) clearFormBtn.addEventListener('click', () => { playClick(); clearForm(); });

    const copyJsonBtn = document.getElementById('copy-json-btn');
    if (copyJsonBtn) copyJsonBtn.addEventListener('click', () => { playClick(); copyJson(); });

    const downloadJsonBtn = document.getElementById('download-json-btn');
    if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', () => { playClick(); downloadJson(); });

    // Enter key support
    const attachEnter = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', (e) => { if (e.key === 'Enter') fn(); });
    };
    attachEnter('password', login);
    attachEnter('admin-password', adminLogin);


    // --- INITIALIZATION ---
    fetchConfig();
    fetchUsers();

    function fetchConfig() {
        // Load config from root (adjust path if needed)
        // Since we are in /bank/, root is ../site_config.json
        fetch('../site_config.json')
            .then(res => res.json())
            .then(data => {
                config = data;
                // If maintenance is on, maybe block login?
                if (config.maintenance) {
                    alert("System Bankowy jest aktualnie w trybie konserwacji.");
                }
            })
            .catch(e => console.log("Config load error:", e));
    }

    // --- CORE LOGIC ---

    function fetchUsers() {
        console.log("Fetching users...");

        if (typeof _supabase !== 'undefined' && _supabase) {
            _supabase.from('bank_users').select('*').then(({ data, error }) => {
                if (error) {
                    console.error("Supabase Error:", error);
                    alert("Błąd połączenia z bazą danych.");
                } else {
                    users = data || [];
                    console.log("Konta wczytane (Supabase):", users.length);
                    if (document.getElementById('users-table')) { renderTable(); updateJsonOutput(); }
                }
            });
            return;
        }

        // Fallback to local JSON
        fetch('884_users_secure.json?nocache=' + Date.now())
            .then(res => res.json())
            .then(data => {
                users = data || [];
                console.log("Konta wczytane (JSON):", users.length);
                if (document.getElementById('users-table')) { renderTable(); updateJsonOutput(); }
            })
            .catch(err => {
                console.error("Błąd wczytywania kont:", err);
                users = [];
            });
    }

    // Dźwięk kliknięcia
    function playClick() {
        const audio = document.getElementById("click-sound");
        if (audio) audio.play().catch(e => console.log("Audio play blocked", e));
    }

    // ---- CLIENT AREA ----
    function login() {
        const loginInput = document.getElementById("login");
        const passwordInput = document.getElementById("password");
        if (!loginInput || !passwordInput) return;

        const loginVal = loginInput.value.trim().toLowerCase(); // Case insensitive
        const passwordVal = passwordInput.value.trim();
        const errorElem = document.getElementById("login-error");

        if (!users.length) {
            errorElem.textContent = "Ładowanie bazy danych... spróbuj za chwilę.";
            // Try fetch again just in case
            fetchUsers();
            return;
        }

        // Case insensitive find
        const user = users.find(u => String(u.login).toLowerCase() === loginVal && String(u.haslo) === passwordVal);

        if (user) {
            toggleView('account');
            document.getElementById("user-name").textContent = user.login;
            document.getElementById("user-id").textContent = user.id;
            document.getElementById("user-saldo").textContent = user.saldo;

            // Format saldo color
            const saldoEl = document.getElementById("user-saldo");
            saldoEl.style.color = user.saldo >= 0 ? "#5aff5a" : "#ff5555";

            errorElem.textContent = "";
        } else {
            errorElem.textContent = "Nieprawidłowy login lub hasło!";
        }
    }

    function register() {
        const regLogin = document.getElementById('reg-login').value.trim();
        const regPass = document.getElementById('reg-pass').value.trim();
        const errorElem = document.getElementById('register-error');

        if (!regLogin || !regPass) {
            errorElem.textContent = "Wypełnij wszystkie pola!";
            return;
        }

        // Check availability
        if (users.some(u => u.login.toLowerCase() === regLogin.toLowerCase())) {
            errorElem.textContent = "Ten login jest już zajęty!";
            return;
        }

        // Auto-Generate ID (Max ID + 1)
        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const newUser = { id: newId, login: regLogin, haslo: regPass, saldo: 0 };

        // 1. Try Supabase Registration 
        if (typeof _supabase !== 'undefined' && _supabase) {
            _supabase.from('bank_users').insert([newUser]).then(({ error }) => {
                if (error) {
                    console.error(error);
                    errorElem.textContent = "Błąd bazy danych: " + error.message;
                } else {
                    alert("✅ Konto utworzone pomyślnie! Możesz się zalogować.");
                    users.push(newUser); // Update local cache
                    toggleView('login');
                }
            });
            return;
        }

        // 2. Fallback (Offline/No DB) - Show Message
        const appPayload = `Rejestracja Bank Wiktowice:\nLogin: ${regLogin}\nHasło: ${regPass}`;
        alert(`Brak połączenia z bazą! Wyślij to do admina:\n\n${appPayload}`);
        toggleView('login');
    }

    function toggleView(viewName) {
        // Hide all windows
        document.querySelectorAll('.window').forEach(w => w.style.display = 'none');

        if (viewName === 'login') document.getElementById("login-window").style.display = "block";
        if (viewName === 'register') document.getElementById("register-window").style.display = "block";
        if (viewName === 'account') document.getElementById("account-window").style.display = "block";
    }

    function logout() {
        toggleView('login');
        document.getElementById("login").value = "";
        document.getElementById("password").value = "";
    }

    // ---- ADMIN AREA ----
    const ADMIN_HASH = "5fc30dc0d520f847a3eabb9f3b47db7b596ad2df95660de1ec37a8c62a63d542"; // "Wiktowice@123"

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function adminLogin() {
        const pwInput = document.getElementById("admin-password");
        if (!pwInput) return;
        const pw = pwInput.value.trim();
        const errorElem = document.getElementById("admin-error");

        const hash = await sha256(pw);

        if (hash === ADMIN_HASH) {
            document.getElementById("admin-login").style.display = "none";
            document.getElementById("admin-panel").style.display = "block";
            renderTable();
            updateJsonOutput();
            errorElem.textContent = "";
        } else {
            errorElem.textContent = "Błędne hasło admina!";
        }
    }

    // --- CRUD OPERATIONS ---

    /* Renders the user table */
    function renderTable() {
        const tbody = document.querySelector("#users-table tbody");
        if (!tbody) return;

        tbody.innerHTML = ""; // Clear existing

        if (users.length === 0) {
            document.getElementById("empty-table-msg").style.display = "block";
            return;
        } else {
            document.getElementById("empty-table-msg").style.display = "none";
        }

        // Sort by ID
        users.sort((a, b) => a.id - b.id);

        users.forEach(user => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.id}</td>
                <td><strong>${escapeHtml(user.login)}</strong></td>
                <td><span style="color:#888;">${escapeHtml(user.haslo)}</span></td>
                <td style="color:#5aff5a;">$${user.saldo}</td>
                <td>
                    <button class="btn-primary btn-small action-edit" data-id="${user.id}">Edytuj</button>
                    <button class="btn-danger btn-small action-delete" data-id="${user.id}">Usuń</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach event listeners to new buttons (because strict CSP might block inline onclicks eventually, and it's cleaner)
        document.querySelectorAll('.action-edit').forEach(btn => {
            btn.addEventListener('click', (e) => editUser(parseInt(e.target.dataset.id)));
        });
        document.querySelectorAll('.action-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deleteUser(parseInt(e.target.dataset.id)));
        });
    }

    /* Save (Add or Update) User */
    function saveUser() {
        // Collect Info
        const idInput = document.getElementById("new-id");
        const loginInput = document.getElementById("new-login");
        const passInput = document.getElementById("new-password");
        const saldoInput = document.getElementById("new-saldo");

        const id = parseInt(idInput.value);
        const login = loginInput.value.trim();
        const haslo = passInput.value.trim();
        const saldo = parseFloat(saldoInput.value || 0);

        if (!id || !login || !haslo) {
            alert("Wypełnij ID, Login i Hasło!");
            return;
        }

        // Check duplicates if adding new ID or changing ID to existing one
        const existing = users.find(u => u.id === id);

        if (editingId !== null) {
            // Edit Mode
            // If changing ID, ensure new ID doesn't conflict
            if (id !== editingId && existing) {
                alert(`ID ${id} jest już zajęte przez innego użytkownika!`);
                return;
            }

            // Update the user
            const userIndex = users.findIndex(u => u.id === editingId);
            if (userIndex > -1) {
                users[userIndex] = { id, login, haslo, saldo };
            }
        } else {
            // Add Mode
            if (existing) {
                alert(`Użytkownik z ID ${id} już istnieje!`);
                return;
            }
            users.push({ id, login, haslo, saldo });
        }

        // UI Feedback
        alert(editingId !== null ? "Zaktualizowano użytkownika!" : "Dodano użytkownika!");

        // Reset and Refresh
        clearForm();
        renderTable();
        updateJsonOutput();
        saveToServer();
    }

    function saveToServer() {
        if (typeof _supabase !== 'undefined' && _supabase) {
            _supabase.from('bank_users').upsert(users).then(({ error }) => {
                if (error) console.error("Supabase Save Error:", error);
                else console.log("Supabase Saved OK");
            });
            return;
        }

        // Configure Environment
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

        if (!isLocalhost) {
            console.log("Live Mode (No DB): Skipping auto-save.");
            return;
        }

        fetch('http://localhost:3000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: 'bank/884_users_secure.json',
                content: users
            })
        })
            .then(res => res.ok ? console.log("Saved to server OK") : console.warn("Save failed"))
            .catch(e => console.warn(e));
    }

    /* Prepare form for editing */
    function editUser(id) {
        const user = users.find(u => u.id === id);
        if (!user) return;

        document.getElementById("new-id").value = user.id;
        document.getElementById("new-login").value = user.login;
        document.getElementById("new-password").value = user.haslo;
        document.getElementById("new-saldo").value = user.saldo;

        editingId = id;
        document.getElementById("save-account-btn").textContent = "Zapisz Zmiany";
        document.getElementById("form-title").textContent = `Edytowanie ID: ${id}`;
    }

    function deleteUser(id) {
        if (!confirm(`Czy na pewno usunąć użytkownika ID ${id}?`)) return;

        users = users.filter(u => u.id !== id);
        renderTable();
        updateJsonOutput();
    }

    function clearForm() {
        document.getElementById("new-id").value = "";
        document.getElementById("new-login").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("new-saldo").value = "0";

        editingId = null;
        document.getElementById("save-account-btn").textContent = "Zapisz / Dodaj";
        document.getElementById("form-title").textContent = "Zarządzanie Kontem";
    }

    function updateJsonOutput() {
        const out = document.getElementById("json-output");
        if (out) out.textContent = JSON.stringify(users, null, 2);
    }

    function copyJson() {
        const txt = document.getElementById("json-output").textContent;
        navigator.clipboard.writeText(txt).then(() => alert("Skopiowano do schowka!"));
    }

    function downloadJson() {
        const txt = document.getElementById("json-output").textContent;
        const blob = new Blob([txt], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "konto.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function escapeHtml(text) {
        if (!text) return text;
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

});

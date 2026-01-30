document.addEventListener('DOMContentLoaded', () => {
    // --- SECURITY & ANTI-DEBUG ---
    // Disable Right Click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable DevTools shortcuts
    document.addEventListener('keydown', function (event) {
        if (event.key === "F12" ||
            (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'J' || event.key === 'C')) ||
            (event.ctrlKey && event.key === 'U')) {
            event.preventDefault();
            return false;
        }
    });

    // Clear Console periodically
    setInterval(() => {
        console.log("%cStop!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px #000;");
        console.log("%cTo jest funkcja przeglądarki przeznaczona dla programistów. Jeśli ktoś kazał Ci coś tutaj wkleić/wpisać, to próbuje Cię oszukać.", "font-size: 20px;");
        // console.clear(); // Opcjonalnie: czyści, ale wiadomość ostrzegawcza jest lepsza
    }, 2000);

    // Detect if we are in a subdirectory (like /bank/ or /ogolna_restauracja/)
    const isSubPage = window.location.pathname.includes('/bank/') ||
        window.location.pathname.includes('/ogolna_restauracja/') ||
        window.location.pathname.includes('/idea/');

    // Set ROOT prefix accordingly
    const ROOT = isSubPage ? '../' : '';

    // --- Powiadomienia ---
    const notificationTrigger = document.getElementById('notification-trigger');
    if (notificationTrigger) {
        notificationTrigger.addEventListener('click', requestNotification);
    }

    const banner = document.querySelector('.banner');
    if (banner) {
        banner.addEventListener('click', () => {
            window.location.href = 'https://wiktowice.falixsrv.me:35894/';
        });
    }

    // --- CONFIG & STATUS SERWERA ---
    fetch(ROOT + 'site_config.json?nocache=' + Date.now())
        .then(res => res.json())
        .then(config => {
            // Maintenance Check
            if (config.maintenance) {
                showErrorScreen(
                    "błąd krytyczny",
                    "PRZERWA TECHNICZNA",
                    config.alertMessage || "Trwają prace konserwacyjne. Serwery są aktualnie wyłączone. Wróć później."
                );
                return;
            }

            // Global Alert/MOTD
            if (config.alertMessage) {
                const alertBox = document.createElement('div');
                alertBox.style.cssText = "background:#d32f2f;color:#fff;padding:10px;text-align:center;font-weight:bold;";
                alertBox.innerText = "⚠️ " + config.alertMessage;
                document.body.prepend(alertBox);
            }

            // Check Minecraft Server Status (Live)
            if (config.serverIp) {
                fetch(`https://api.mcstatus.io/v2/status/java/${config.serverIp}`)
                    .then(res => res.json())
                    .then(status => {
                        const statusBox = document.querySelector('.ip-box');
                        if (statusBox) {
                            if (status.online) {
                                statusBox.innerHTML = `ONLINE: ${status.players.online}/${status.players.max} GRACZY<br><span style="font-size:0.8em;color:#aaa;">${config.serverIp}</span>`;
                                statusBox.style.borderColor = "#55ff55";
                                statusBox.style.color = "#55ff55";
                            } else {
                                statusBox.innerHTML = `OFFLINE<br><span style="font-size:0.8em;color:#aaa;">${config.serverIp}</span>`;
                                statusBox.style.borderColor = "#ff5555";
                                statusBox.style.color = "#ff5555";
                            }
                        }
                    })
                    .catch(() => console.warn("Nie udało się pobrać statusu serwera MC."));
            }
        })
        .catch(e => {
            console.error("Critical Config Error:", e);
            // Critical Error Screen
            showErrorScreen(
                "BŁĄD KRYTYCZNY",
                "SYSTEM FAILURE",
                "Nie udało się załadować konfiguracji systemu.<br>Sprawdź połączenie lub skontaktuj się z administratorem."
            );
        });

    function showErrorScreen(title, subtitle, message) {
        // Ensure fonts are loaded
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        document.body.innerHTML = `
            <style>
                body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; background: #000 url('tlo.png') no-repeat center center fixed; background-size: cover; color: #fff; font-family: 'Inter', sans-serif; }
                .overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 0; }
                .content { position: relative; z-index: 1; padding: 40px; background: rgba(18, 18, 18, 0.9); border: 2px solid #333; border-radius: 16px; box-shadow: 0 0 50px rgba(0, 0, 0, 0.8); max-width: 600px; width: 90%; animation: fadeIn 0.5s ease-out; }
                h1 { font-family: 'Press Start 2P', cursive; font-size: 32px; color: #ef4444; margin: 0 0 20px 0; text-shadow: 4px 4px 0px #000; line-height: 1.4; }
                h2 { font-family: 'Press Start 2P', cursive; font-size: 14px; color: #d4a017; margin-bottom: 30px; line-height: 1.5; }
                p { color: #aaa; font-size: 16px; margin-bottom: 40px; line-height: 1.6; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div class="overlay"></div>
            <div class="content">
                <h1>${title}</h1>
                <h2>${subtitle}</h2>
                <p>${message}</p>
            </div>
        `;
    }

    // --- Newsy ---
    sprawdzNoweNews(ROOT);
    setInterval(() => sprawdzNoweNews(ROOT), 30000);
    loadNewsContainer(ROOT);

    // --- Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(ROOT + 'service-worker.js')
            .then(() => console.log('Service Worker zarejestrowany'))
            .catch(e => console.error('Błąd rejestracji SW:', e));
    }
});

function wyslijPowiadomienie(tresc, tytul = "Powiadomienie") {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification(tytul, { body: tresc, icon: "favicon-32x32.png" });
    }
}

function requestNotification() {
    if (!("Notification" in window)) {
        alert("Twoja przeglądarka nie wspiera powiadomień.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            alert("Powiadomienia włączone! 🎉");

            // Dane testowe
            const news = [
                { title: 'Test', date: '2025', content: 'Test powiadomień.' }
            ];
            const latest = news[news.length - 1];

            new Notification(latest.title, { body: latest.content, icon: 'favicon-32x32.png' });
        } else {
            alert('Nie włączono powiadomień (brak zgody).');
        }
    });
}

let ostatniNews = null;

function sprawdzNoweNews(rootPath = '') {
    fetch(rootPath + '739_news_secure.json')
        .then(res => {
            if (!res.ok) throw new Error("Nie można wczytać news.json");
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) return;
            const latest = data[data.length - 1];

            if (!ostatniNews || ostatniNews.title !== latest.title || ostatniNews.content !== latest.content) {
                ostatniNews = latest;
            }
        })
        .catch(err => console.error('Error fetching news for check:', err));
}

function loadNewsContainer(rootPath = '') {
    // 1. Try Supabase
    if (typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('news').select('*').order('id', { ascending: false })
            .then(({ data, error }) => {
                const container = document.getElementById('news-container');
                if (!container) return;

                if (error || !data) {
                    console.warn("Supabase news fetch failed, trying JSON fallback...", error);
                    loadNewsFromJson(rootPath);
                    return;
                }

                container.innerHTML = '';
                if (data.length === 0) {
                    container.innerHTML = '<p>Brak aktualności.</p>';
                }

                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    div.innerHTML = `<strong>${escapeHtml(item.title)}</strong> <em>(${escapeHtml(item.date)})</em><p>${escapeHtml(item.content)}</p>`;
                    container.appendChild(div);
                });
            });
        return;
    }

    // 2. Fallback
    loadNewsFromJson(rootPath);
}

function loadNewsFromJson(rootPath) {
    fetch(rootPath + '739_news_secure.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('news-container');
            if (!container) return;

            container.innerHTML = '';
            const reversedData = [...data].reverse();

            reversedData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'news-item';
                div.innerHTML = `<strong>${escapeHtml(item.title)}</strong> <em>(${escapeHtml(item.date)})</em><p>${escapeHtml(item.content)}</p>`;
                container.appendChild(div);
            });
        })
        .catch(err => {
            const container = document.getElementById('news-container');
            if (container) container.innerHTML = '<p>Brak aktualności lub błąd ładowania.</p>';
            console.error('Error loading news container:', err);
        });
}

// Basic XSS protection helper
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

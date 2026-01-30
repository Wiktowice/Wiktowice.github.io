Bank Wiktowicki — wersja podstawowa
----------------------------------
Pliki:
- index.html       -> Logowanie i widok konta
- admin.html       -> Panel administratora (admin/bankadmin)
- style.css        -> Styl (Minecraftowy)
- script.js        -> Logika logowania i sesji (strona główna)
- admin.js         -> Logika panelu administratora
- konta.json       -> Pusty plik kont (możesz importować lub pobrać z panelu admin)

Uwaga:
- Konto admin jest osadzone w kodzie (login: admin / hasło: bankadmin). Nie jest częścią konta.json.
- Po dodaniu/edytowaniu kont w panelu admin kliknij 'Pobierz konta.json' i wgraj plik na hosting, jeśli chcesz, aby fetch('konta.json') działał z serwera.
- Jeśli otwierasz stronę lokalnie (file://), strona korzysta z localStorage jako fallback.

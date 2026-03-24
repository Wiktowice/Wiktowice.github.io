# 🔒 SECURITY ALERT - CRITICAL INCIDENT RESPONSE

## ⚠️ STATUS: CRITICAL SECURITY BREACH DETECTED

**Data wykrycia:** 2026-03-24  
**Poziom zagrożenia:** 🔴 KRYTYCZNY

---

## 🚨 POTWIERDZONE WYCIEKI DANYCH

### 1. Discord Webhook - SKOMPROMITOWANY
- **Plik:** `site_config.json`
- **Status:** ✅ USUNIĘTO z pliku
- **AKCJA:** NATYCHMIAST zresetuj webhook na Discordzie!

```
Discord → Ustawienia kanału → Integracje → Webhooki
→ Usuń stary webhook → Stwórz nowy
→ NIGDY nie przechowuj w publicznym repo!
```

### 2. Supabase API Key - SKOMPROMITOWANY
- **Plik:** `supabase_config.js` (usunięty z repo)
- **Klucz:** `sb_publishable_iI_EEl7Zgd4gIFN__Fw6Tw_4ldFy_W-`
- **Status:** ✅ USUNIĘTO z repo, dodano do .gitignore
- **AKCJA:** NATYCHMIAST zregeneruj klucz w Supabase!

```
supabase.com → Twój projekt → Settings → API
→ Regenerate anon public key
```

### 3. Hash hasła admina banku - SKOMPROMITOWANY
- **Plik:** `bank/script.js`
- **Hasło:** `Wiktowice@123` (odkryte z hash SHA256)
- **Status:** ✅ USUNIĘTO hash z kodu
- **AKCJA:** Zmień hasło admina, wdróż Supabase Auth

### 4. Adresy IP graczy - PUBLICZNIE DOSTĘPNE
- **Plik:** `banned_ips.json` (usunięty z repo)
- **IP:** `91.245.80.58` (ujawnione)
- **Status:** ✅ USUNIĘTO plik z repo i dysku
- **AKCJA:** Przenieś system banów do Supabase z RLS

### 5. Strona ZOSTAŁA ZHAKOWANA
- **Plik:** `739_news_secure.json`
- **Dowód:** `{"title": "Hacked", "content": "This page has been hacked"}`
- **Status:** ✅ PRZYWRÓCONO pusty plik newsów
- **AKCJA:** Sprawdź historię commitów GitHub pod kątem włamań

---

## ✅ WYKONANE NAPRAWY

| Zmiana | Status |
|--------|--------|
| Usunięto Discord webhook z `site_config.json` | ✅ |
| Usunięto zhakowany content z newsów | ✅ |
| Usunięto `banned_ips.json` z repo i dysku | ✅ |
| Usunięto hash hasła admina z `bank/script.js` | ✅ |
| Usunięto blokadę DevTools z `script.js` | ✅ |
| Wyłączono system IP ban (client-side) | ✅ |
| Dodano wrażliwe pliki do `.gitignore` | ✅ |
| Wygenerowano `SECURITY_SETUP.sql` z RLS | ✅ |
| Dodano Supabase Auth do `admin.html` | ✅ |

---

## 🔴 NATYCHMIASTOWE AKCJE (KOLEJNOŚĆ WAŻNA!)

### KROK 1: Zresetuj Discord Webhook (5 minut)
```
1. Otwórz Discord
2. Ustawienia serwera → Integracje → Webhooki
3. Usuń WSZYSTKIE stare webhooki
4. Stwórz nowy webhook dla kanału
5. Skopiuj NOWY URL
6. Wklej do Supabase (tabela system_config, klucz: discord_webhook)
   NIE do pliku JSON!
```

### KROK 2: Zregeneruj klucz Supabase (5 minut)
```
1. supabase.com → Twój projekt → Settings → API
2. Kliknij "Regenerate" przy "anon public" key
3. Skopiuj NOWY klucz
4. Wklej do LOKALNEGO pliku supabase_config.js
5. NIE COMMITUJ tego pliku!
```

### KROK 3: Wdróż RLS w Supabase (10 minut)
```
1. Supabase → SQL Editor
2. Wklej cały plik SECURITY_SETUP.sql
3. Kliknij "Run"
4. Sprawdź: SELECT tablename, rowsecurity FROM pg_tables;
```

### KROK 4: Zmień hasła (5 minut)
```
1. Hasło admina banku (zmień z "Wiktowice@123")
2. Hasło do konta GitHub
3. Hasło do Supabase
4. Włącz 2FA wszędzie!
```

### KROK 5: Sprawdź historię włamań (15 minut)
```
1. GitHub → Repozytorium → Commits
2. Szukaj podejrzanych commitów z:
   - "Hacked"
   - supabase_config.js
   - site_config.json
3. Sprawdź GitHub → Settings → Security → Audit log
4. Odwołaj wszystkie nieznane sesje
```

### KROK 6: Skonfiguruj CORS (5 minut)
```
1. Supabase → Settings → API
2. Allowed origins (CORS):
   - https://wiktowice.github.io
3. Usuń "*" jeśli istnieje
```

---

## 📋 CHECKLISTA BEZPIECZEŃSTWA

- [ ] **Zresetowałeś Discord webhook?**
- [ ] **Zregenerowałeś klucz Supabase API?**
- [ ] **Wdrożyłeś RLS z SECURITY_SETUP.sql?**
- [ ] **Zmieniłeś hasło admina banku?**
- [ ] **Zmieniłeś hasło GitHub?**
- [ ] **Włączyłeś 2FA na GitHub?**
- [ ] **Włączyłeś 2FA na Supabase?**
- [ ] **Sprawdziłeś historię commitów pod kątem włamań?**
- [ ] **Skonfigurowałeś CORS w Supabase?**
- [ ] **supabase_config.js jest w .gitignore?**
- [ ] **banned_ips.json usunięty z repo?**

---

## 🛡️ DŁUGOTERMINOWE POPRAWKI

### 1. System banów IP (backend)
```sql
-- Tabela w Supabase z RLS
CREATE TABLE banned_ips (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    reason TEXT,
    banned_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Tylko admin może czytać/zapisywać
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON banned_ips
    FOR ALL TO authenticated USING (is_admin());
```

### 2. Supabase Auth dla admina
```
1. Supabase → Authentication → Users → Add User
2. Utwórz użytkownika admina (email + mocne hasło)
3. W admin.html używaj przycisku "Login with Supabase Auth"
4. Usuń client-side password check
```

### 3. Role użytkownika (opcjonalnie)
```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'user',
    PRIMARY KEY (user_id)
);

-- Funkcja sprawdzająca rolę
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## 📞 KONTAKT / SUPPORT

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Security:** https://supabase.com/security
- **GitHub Security:** https://docs.github.com/en/security

---

## 📝 HISTORIA ZMIAN BEZPIECZEŃSTWA

| Data | Zmiana | Status |
|------|--------|--------|
| 2026-03-24 | Usunięto Discord webhook | ✅ |
| 2026-03-24 | Usunięto zhakowane newsy | ✅ |
| 2026-03-24 | Usunięto banned_ips.json | ✅ |
| 2026-03-24 | Usunięto hash hasła admina | ✅ |
| 2026-03-24 | Usunięto blokadę DevTools | ✅ |
| 2026-03-24 | Dodano RLS policies | ✅ |
| 2026-03-24 | Dodano Supabase Auth | ✅ |

---

**OSTATNIA AKTUALIZACJA:** 2026-03-24  
**STATUS:** 🔴 WYMAGA DZIAŁANIA - ZACZNIJ OD KROKU 1!

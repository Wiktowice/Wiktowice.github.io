# 🔒 SECURITY ALERT - Wiktowice.github.io

## ⚠️ KRYTYCZNE - DZIAŁANIA NATYCHMIASTOWE

### 1. SKOMPROMITOWANY KLUCZ API SUPABASE

**STATUS:** 🔴 KLUCZ PUBLICZNY W REPOZYTORIUM

Twój klucz `sb_publishable_iI_EEl7Zgd4gIFN__Fw6Tw_4ldFy_W-` był publicznie dostępny w repozytorium.

#### ✅ CO ZROBIĆ (KOLEJNOŚĆ WAŻNA):

1. **Wejdź na https://supabase.com**
2. **Wybierz swój projekt**
3. **Settings → API**
4. **Kliknij "Regenerate" przy "anon public" key**
5. **Skopiuj NOWY klucz**
6. **Wklej nowy klucz do `supabase_config.js`** (tylko lokalnie!)
7. **Dodaj `supabase_config.js` do `.gitignore`** ✅ (już zrobione)
8. **NIE commituj pliku `supabase_config.js`!**

---

### 2. HISTORIA COMMITÓW

Nawet po usunięciu pliku, klucz może być w historii Git.

#### Sprawdź historię:
```bash
git log --all --full-history -- supabase_config.js
```

#### Jeśli klucz był wcześniej commitowany:
- **Musisz zregenerować klucz** (jak wyżej)
- **Opcjonalnie:** Wyczyść historię Git (wymaga force push)

---

### 3. ROW LEVEL SECURITY (RLS)

**BEZ RLS KAŻDY MOŻE CZYTAĆ/PISAĆ DO TWOJEJ BAZY!**

#### ✅ WŁĄCZ RLS:

1. **Wejdź na Supabase → SQL Editor**
2. **Wklej i uruchom skrypt z pliku `SECURITY_SETUP.sql`**
3. **Sprawdź czy RLS jest włączony:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

#### Domyślne polityki (z `SECURITY_SETUP.sql`):
- Tylko **zalogowani użytkownicy** mogą czytać/pisać dane
- Wszystkie tabele są chronione

---

### 4. SUPABASE AUTH - BEZPIECZNA AUTORYZACJA

**OBECNY STAN:** 🔴 Hasło admina przechowywane w bazie (client-side check)

#### ✅ MIGRACJA NA SUPABASE AUTH:

1. **Supabase → Authentication → Users**
2. **Dodaj użytkownika (email + hasło)**
3. **W `admin.html` kliknij "Login with Supabase Auth"**
4. **Zaloguj się nowymi danymi**

#### Opcjonalnie - Role użytkownika:
```sql
-- Dodaj kolumnę role do auth.users metadata
-- Lub stwórz osobną tabelę ról
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'user',
    PRIMARY KEY (user_id)
);
```

---

### 5. CORS / ALLOWED ORIGINS

**BEZ OGRANICZEŃ CORS KAŻDA STRONA MOŻE UŻYWAĆ TWOJEGO KLUCZA!**

#### ✅ SKONFIGURUJ DOZWOLONE DOMENY:

1. **Supabase → Settings → API**
2. **Allowed origins (CORS):**
   - `https://wiktowice.github.io`
   - `https://*.github.io` (opcjonalnie)
3. **NIE dodawaj `*` (wildcard)!**

---

## 📋 CHECKLISTA BEZPIECZEŃSTWA

- [ ] **ZREGENEROWAŁEŚ klucz API w Supabase?**
- [ ] **Wkleiłeś NOWY klucz do `supabase_config.js`?**
- [ ] **`supabase_config.js` jest w `.gitignore`?**
- [ ] **Uruchomiłeś `SECURITY_SETUP.sql` w Supabase?**
- [ ] **RLS jest włączony na wszystkich tabelach?**
- [ ] **Dodałeś użytkownika w Supabase Auth?**
- [ ] **Skonfigurowałeś Allowed Origins w Supabase?**
- [ ] **Usunąłeś stary klucz z historii commitów?** (opcjonalnie)

---

## 🛡️ DOBRE PRAKTYKI

### NIGDY NIE COMMITUJ:
- `*.env`
- `supabase_config.js`
- `*.key`, `*.pem`
- `secrets/`, `keys/`

### ZAWSZE:
- Używaj zmiennych środowiskowych na backendzie
- Włączaj RLS na wszystkich tabelach
- Regularnie rotuj klucze API
- Monitoruj użycie bazy w Supabase Dashboard

---

## 📞 KONTAKT / SUPPORT

Jeśli masz pytania dotyczące bezpieczeństwa:
- Supabase Docs: https://supabase.com/docs
- Supabase Security: https://supabase.com/security

---

**OSTATNIA AKTUALIZACJA:** 2026-03-24  
**STATUS:** 🔴 WYMAGA DZIAŁANIA

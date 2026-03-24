-- ==========================================
-- SECURITY SETUP FOR SUPABASE
-- ==========================================
-- Uruchom ten skrypt w Supabase → SQL Editor
-- Aby włączyć Row Level Security (RLS) i dodać polityki bezpieczeństwa

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Włącz RLS na wszystkich tabelach
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. DROP OLD POLICIES (if exist)
-- ==========================================

DROP POLICY IF EXISTS "Allow authenticated users to select news" ON news;
DROP POLICY IF EXISTS "Allow authenticated users to insert news" ON news;
DROP POLICY IF EXISTS "Allow authenticated users to update news" ON news;
DROP POLICY IF EXISTS "Allow authenticated users to delete news" ON news;

DROP POLICY IF EXISTS "Allow authenticated users to select bank_users" ON bank_users;
DROP POLICY IF EXISTS "Allow authenticated users to insert bank_users" ON bank_users;
DROP POLICY IF EXISTS "Allow authenticated users to update bank_users" ON bank_users;
DROP POLICY IF EXISTS "Allow authenticated users to delete bank_users" ON bank_users;

DROP POLICY IF EXISTS "Allow authenticated users to select orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON orders;

DROP POLICY IF EXISTS "Allow authenticated users to select events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to update events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON events;

DROP POLICY IF EXISTS "Allow authenticated users to select system_config" ON system_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert system_config" ON system_config;
DROP POLICY IF EXISTS "Allow authenticated users to update system_config" ON system_config;
DROP POLICY IF EXISTS "Allow authenticated users to delete system_config" ON system_config;

-- ==========================================
-- 3. CREATE ADMIN ROLE CHECK FUNCTION
-- ==========================================

-- Funkcja sprawdzająca czy użytkownik ma rolę admina
-- Wymaga dodania kolumny 'role' do tabeli auth.users metadata lub osobnej tabeli ról
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Sprawdź czy użytkownik jest zalogowany i ma rolę admina
    -- Uwaga: To wymaga skonfigurowania ról w Supabase Auth
    -- Tymczasowo zezwalamy wszystkim zalogowanym użytkownikom
    RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. CREATE SECURITY POLICIES
-- ==========================================

-- ----- NEWS TABLE -----
-- SELECT: Tylko zalogowani użytkownicy mogą czytać wiadomości
CREATE POLICY "Allow authenticated users to select news"
ON news FOR SELECT
TO authenticated
USING (true);

-- INSERT: Tylko zalogowani użytkownicy mogą dodawać wiadomości
CREATE POLICY "Allow authenticated users to insert news"
ON news FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Tylko zalogowani użytkownicy mogą edytować wiadomości
CREATE POLICY "Allow authenticated users to update news"
ON news FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Tylko zalogowani użytkownicy mogą usuwać wiadomości
CREATE POLICY "Allow authenticated users to delete news"
ON news FOR DELETE
TO authenticated
USING (true);


-- ----- BANK_USERS TABLE -----
-- SELECT: Tylko zalogowani użytkownicy mogą czytać dane banku
CREATE POLICY "Allow authenticated users to select bank_users"
ON bank_users FOR SELECT
TO authenticated
USING (true);

-- INSERT: Tylko zalogowani użytkownicy mogą dodawać klientów
CREATE POLICY "Allow authenticated users to insert bank_users"
ON bank_users FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Tylko zalogowani użytkownicy mogą edytować klientów
CREATE POLICY "Allow authenticated users to update bank_users"
ON bank_users FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Tylko zalogowani użytkownicy mogą usuwać klientów
CREATE POLICY "Allow authenticated users to delete bank_users"
ON bank_users FOR DELETE
TO authenticated
USING (true);


-- ----- ORDERS TABLE -----
-- SELECT: Tylko zalogowani użytkownicy mogą czytać zamówienia
CREATE POLICY "Allow authenticated users to select orders"
ON orders FOR SELECT
TO authenticated
USING (true);

-- INSERT: Tylko zalogowani użytkownicy mogą dodawać zamówienia
CREATE POLICY "Allow authenticated users to insert orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Tylko zalogowani użytkownicy mogą edytować zamówienia
CREATE POLICY "Allow authenticated users to update orders"
ON orders FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Tylko zalogowani użytkownicy mogą usuwać zamówienia
CREATE POLICY "Allow authenticated users to delete orders"
ON orders FOR DELETE
TO authenticated
USING (true);


-- ----- EVENTS TABLE -----
-- SELECT: Tylko zalogowani użytkownicy mogą czytać wydarzenia
CREATE POLICY "Allow authenticated users to select events"
ON events FOR SELECT
TO authenticated
USING (true);

-- INSERT: Tylko zalogowani użytkownicy mogą dodawać wydarzenia
CREATE POLICY "Allow authenticated users to insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Tylko zalogowani użytkownicy mogą edytować wydarzenia
CREATE POLICY "Allow authenticated users to update events"
ON events FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Tylko zalogowani użytkownicy mogą usuwać wydarzenia
CREATE POLICY "Allow authenticated users to delete events"
ON events FOR DELETE
TO authenticated
USING (true);


-- ----- SYSTEM_CONFIG TABLE -----
-- SELECT: Tylko zalogowani użytkownicy mogą czytać konfigurację
CREATE POLICY "Allow authenticated users to select system_config"
ON system_config FOR SELECT
TO authenticated
USING (true);

-- INSERT: Tylko zalogowani użytkownicy mogą dodawać konfigurację
CREATE POLICY "Allow authenticated users to insert system_config"
ON system_config FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Tylko zalogowani użytkownicy mogą edytować konfigurację
CREATE POLICY "Allow authenticated users to update system_config"
ON system_config FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Tylko zalogowani użytkownicy mogą usuwać konfigurację
CREATE POLICY "Allow authenticated users to delete system_config"
ON system_config FOR DELETE
TO authenticated
USING (true);


-- ==========================================
-- 5. CREATE ADMIN USER (OPTIONAL)
-- ==========================================

-- Aby utworzyć użytkownika admina:
-- 1. Wejdź na Authentication → Users → Add User
-- 2. Utwórz użytkownika z emailem i hasłem
-- 3. Hasło admina przechowuj w system_config zamiast w client-side code

-- Przykładowe wstawienie hasła admina do system_config:
-- INSERT INTO system_config (key, value) VALUES ('admin_password', 'TWOJE_NOWE_BARDZO_MOCNE_HASLO');

-- ==========================================
-- 6. VERIFY SETUP
-- ==========================================

-- Sprawdź czy RLS jest włączony:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Sprawdź polityki:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

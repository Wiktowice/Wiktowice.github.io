-- 1. Skopiuj CAŁY ten kod.
-- 2. Wejdź na https://supabase.com/dashboard/project/_/sql
-- 3. Kliknij "New Query".
-- 4. Wklej ten kod i kliknij "RUN".
-- 5. Po wykonaniu, wróć do panelu admina na stronie i kliknij "Zapisz Zmiany".

-- Tabela konfiguracji
CREATE TABLE IF NOT EXISTS system_config (
    key text PRIMARY KEY,
    value text
);

-- Włączamy zabezpieczenia
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Usuwamy stare polityki, aby uniknąć błędów przy ponownym uruchamianiu
DROP POLICY IF EXISTS "Public Read Config" ON system_config;
DROP POLICY IF EXISTS "Public Update Config" ON system_config;
DROP POLICY IF EXISTS "Public Insert Config" ON system_config;

-- Zezwalamy WSZYSTKIM na ODCZYT (Dla strony głównej)
CREATE POLICY "Public Read Config" 
ON system_config FOR SELECT 
USING (true);

-- Zezwalamy WSZYSTKIM na AKTUALIZACJĘ (Dla panelu admina)
-- Bez tego Panel Admina nie może zapisać zmian!
CREATE POLICY "Public Update Config" 
ON system_config FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Zezwalamy na dodawanie nowych wpisów
CREATE POLICY "Public Insert Config" 
ON system_config FOR INSERT 
WITH CHECK (true);

-- Dodajemy domyślne wpisy, jeśli są puste
INSERT INTO system_config (key, value) VALUES
('motd', 'Witamy w Wiktowicach!'),
('server_ip', 'wiktowice.falixsrv.me'),
('maintenance', 'false'),
('alert_message', '')
ON CONFLICT (key) DO NOTHING;

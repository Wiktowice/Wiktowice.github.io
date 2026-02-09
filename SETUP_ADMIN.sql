-- SQL do utworzenia tabeli system_config i ustawienia hasła admina
-- Skopiuj ten kod i wklej do edytora SQL w Supabase

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Wstawienie hasła admina (Zmień 'TwojeTajneHaslo' na prawdziwe hasło!)
INSERT INTO system_config (key, value)
VALUES ('admin_password', 'TwojeTajneHaslo')
ON CONFLICT (key) DO UPDATE
SET value = 'TwojeTajneHaslo'; -- Zaktualizuj, jeśli już istnieje

-- Ustaw pozostałe ustawienia systemowe, jeśli ich nie ma
INSERT INTO system_config (key, value) VALUES
('server_ip', 'wiktowice.falixsrv.me'),
('maintenance', 'false'),
('alert_message', ''),
('discord_webhook', '')
ON CONFLICT (key) DO NOTHING;

-- WŁĄCZENIE DOSTĘPU (RLS)
-- To pozwala aplikacji odczytać konfigurację.
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pozwól na odczyt system_config dla wszystkich"
ON system_config FOR SELECT
TO anon, authenticated
USING (true);

-- (Opcjonalnie) Pozwól na zmianę konfiguracji tylko adminom (wymaga logowania, które jeszcze nie jest w pełni zaimplementowane po stronie Supabase Auth)
-- W tym prostym systemie pozwalamy na UPDATE, aby panel działał (ALE JEST TO MNIEJ BEZPIECZNE)
CREATE POLICY "Pozwól na edycję system_config"
ON system_config FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

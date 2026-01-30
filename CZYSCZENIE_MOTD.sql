-- Kod do usunięcia 'motd' z bazy danych
DELETE FROM system_config WHERE key = 'motd';

-- (Opcjonalnie) Upewnienie się, że pozostałe wpisy istnieją
INSERT INTO system_config (key, value) VALUES
('server_ip', 'wiktowice.falixsrv.me'),
('maintenance', 'false'),
('alert_message', '')
ON CONFLICT (key) DO NOTHING;


// ==========================================
// KONFIGURACJA SUPABASE (BAZA DANYCH)
// ==========================================
// 1. Zarejestruj się na https://supabase.com
// 2. Stwórz nowy projekt.
// 3. Wejdź w Settings -> API.
// 4. Skopiuj URL i klucz "anon public" poniżej.

var SUPABASE_URL = "https://qafdmnstcpnlulqjecei.supabase.co";
var SUPABASE_KEY = "sb_publishable_iI_EEl7Zgd4gIFN__Fw6Tw_4ldFy_W-";

// Inicjalizacja klienta (jeśli biblioteka została załadowana)
var _supabase = null;

if (typeof supabase !== 'undefined') {
    if (SUPABASE_URL.indexOf("twoj-projekt") !== -1 || SUPABASE_KEY.indexOf("twoj-klucz") !== -1) {
        console.warn("⚠️ SUPABASE NIESKONFIGUROWANE! Uzupełnij plik supabase_config.js");
    } else {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window._supabase = _supabase; // Ensure global access
        console.log("✅ Połączono z Supabase");
    }
} else {
    console.error("❌ Biblioteka Supabase SDK nie została załadowana.");
}

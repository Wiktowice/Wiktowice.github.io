import os
import sys
import json
import base64
import urllib.request
import urllib.parse
import mimetypes

# Konfiguracja
IGNORE_LIST = ['.git', '.vscode', 'node_modules', '__pycache__', 'server.py', 'deploy.py', 'hash_calc.py', '.antigravityignore', 'hash_output.txt', 'new_hash.txt']
API_URL = 'https://neocities.org/api/upload'

def get_api_key():
    print("ℹ️  Aby automatycznie wgrać stronę, potrzebujesz klucza API.")
    print("   (Znajdziesz go w https://neocities.org/settings -> 'API Key')")
    key = input("🔑 Wklej swój klucz API Neocities: ").strip()
    return key

def upload_files(api_key):
    # Znajdź wszystkie pliki
    files_to_upload = []
    root_dir = os.path.dirname(os.path.abspath(__file__))

    print(f"\n📂 Skanowanie katalogu: {root_dir}")

    for root, dirs, files in os.walk(root_dir):
        # Ignoruj foldery
        dirs[:] = [d for d in dirs if d not in IGNORE_LIST]
        
        for file in files:
            if file in IGNORE_LIST: continue
            
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            
            files_to_upload.append((rel_path, full_path))

    print(f"📦 Znaleziono {len(files_to_upload)} plików do wgrania.")
    
    # Upload w pętelce (Neocities API pozwala na multiple, ale prostsze w pythonie bez requests jest po jednym lub grupowanie ręczne multipart)
    # Użyjemy prostej metody - one request per batch if possible, or simple loop with multipart simulation is hard in pure python stdlib without requests lib.
    # To keep it reliable without 'pip install requests', we will try to use a simple approach or require user to install requests.
    # Actually, constructing multipart/form-data manually in stdlib is painful. 
    # Let's verify if user has 'requests'.
    
    try:
        import requests
    except ImportError:
        print("⚠️  Brak biblioteki 'requests'. Próba instalacji...")
        os.system(f"{sys.executable} -m pip install requests")
        try:
            import requests
        except ImportError:
            print("❌ Nie udało się zainstalować 'requests'. Wgraj pliki ręcznie lub zainstaluj Python poprawnie.")
            return

    # Prepare data for requests
    print("🚀 Rozpoczynanie wysyłania...")
    
    # Grupujemy po 10 plików żeby nie przekroczyć limitów
    chunk_size = 10
    total_uploaded = 0

    for i in range(0, len(files_to_upload), chunk_size):
        chunk = files_to_upload[i:i + chunk_size]
        files_data = {}
        
        for rel_path, full_path in chunk:
            print(f"   - {rel_path}...")
            files_data[rel_path] = open(full_path, 'rb')

        try:
            response = requests.post(
                API_URL, 
                headers={'Authorization': f'Bearer {api_key}'},
                files=files_data
            )
            
            # Zamknij pliki
            for f in files_data.values():
                f.close()

            if response.status_code == 200:
                print(f"   ✅ Sukces (Batch {i//chunk_size + 1})")
                total_uploaded += len(chunk)
            else:
                print(f"   ❌ Błąd: {response.text}")
        
        except Exception as e:
            print(f"   ❌ Wyjątek: {e}")

    print(f"\n✨ Zakończono! Wgrano {total_uploaded} plików.")
    print("🌍 Twoja strona powinna być zaktualizowana na: https://wiktowice.github.io/")

if __name__ == "__main__":
    key = get_api_key()
    if key:
        upload_files(key)

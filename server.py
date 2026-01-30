import http.server
import socketserver
import json
import os
import sys

# Konfiguracja
PORT = 3000
ROOT = os.path.dirname(os.path.abspath(__file__))

class AdminHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Dodaj nagłówki CORS do każdej odpowiedzi
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/save':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data)
                
                filename = data.get('file')
                content = data.get('content')

                # Zabezpieczenie ścieżki
                target_path = os.path.join(ROOT, filename)
                # Normalizacja i sprawdzenie czy jest w ROOT
                if not os.path.abspath(target_path).startswith(ROOT):
                    raise Exception("Security Error: Path traversal attempt")

                # Zapis
                with open(target_path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Saved Successfully")
                print(f"Zapisano plik: {filename}")
                
            except Exception as e:
                print(f"Error saving: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_error(404)

if __name__ == "__main__":
    # Upewnij się, że jesteśmy w dobrym katalogu
    os.chdir(ROOT)
    
    # Obsługa błędu 'Address already in use'
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), AdminHandler) as httpd:
            print(f"===========================================================")
            print(f" PYTHON SERVER ADMINA (ZASTĘPSTWO NODE.JS)")
            print(f" HTTP Service running on port {PORT}")
            print(f" Otwórz panel: http://localhost:{PORT}/admin.html")
            print(f"===========================================================")
            httpd.serve_forever()
    except OSError as e:
        print(f"Błąd uruchomienia serwera: {e}")
        print("Prawdopodobnie port 3000 jest zajęty. Spróbuj zamknąć inne procesy Node/Python.")

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000; // Port serwera
const ROOT = __dirname; // Katalog główny projektu

const server = http.createServer((req, res) => {
    // Nagłówki CORS (aby admin.html mógł łączyć się z lokalnym serwerem)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Obsługa pre-flight CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Endpoint do zapisu
    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { file, content } = JSON.parse(body);

                // Zabezpieczenie ścieżki (nie pozwól wyjść poza katalog projektu)
                const targetPath = path.join(ROOT, file);

                if (!targetPath.startsWith(ROOT)) {
                    throw new Error("Nieautoryzowany dostęp do ścieżki.");
                }

                // Zapisz plik
                fs.writeFile(targetPath, JSON.stringify(content, null, 4), 'utf8', (err) => {
                    if (err) {
                        console.error(`Błąd zapisu ${file}:`, err);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`Błąd zapisu: ${err.message}`);
                    } else {
                        console.log(`Zapisano plik: ${file}`);
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('Zapisano pomyślnie na dysku.');
                    }
                });
            } catch (e) {
                console.error("Błąd przetwarzania żądania:", e);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Błąd danych JSON.');
            }
        });
    }
    // Prosty serwer plików (opcjonalnie, jeśli chcesz odpalać admin.html przez localhost)
    else if (req.method === 'GET') {
        let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);

        // Zabezpieczenie przed wyjściem poza root
        if (!filePath.startsWith(ROOT)) filePath = path.join(ROOT, 'index.html');

        const ext = path.extname(filePath);
        let contentType = 'text/html';
        if (ext === '.js') contentType = 'text/javascript';
        if (ext === '.css') contentType = 'text/css';
        if (ext === '.json') contentType = 'application/json';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.jpg') contentType = 'image/jpeg';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500);
                    res.end('500 Server Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 SERWER POMOCNICZY ADMINA URUCHOMIONY`);
    console.log(`📥 Adres panelu: http://localhost:${PORT}/admin.html`);
    console.log(`💾 Serwer nasłuchuje żądań zapisu...`);
    console.log(`===========================================================`);
});

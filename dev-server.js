const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const host = process.env.HOST || 'localhost';

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

function resolvePath(urlPath) {
    const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
    const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
    const targetPath = path.normalize(path.join(root, relativePath));
    if (!targetPath.startsWith(root)) return null;
    return targetPath;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type });
    res.end(body);
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                reject(new Error('Request body too large'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

async function handleProductsWrite(req, res, targetPath) {
    try {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body);
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
        send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
    } catch (error) {
        send(res, 400, JSON.stringify({ ok: false, error: error.message }), 'application/json; charset=utf-8');
    }
}

const server = http.createServer(async (req, res) => {
    const targetPath = resolvePath(req.url);
    if (!targetPath) {
        send(res, 403, 'Forbidden');
        return;
    }

    if ((req.method === 'PUT' || req.method === 'POST') && targetPath === path.join(root, 'database', 'products.json')) {
        await handleProductsWrite(req, res, targetPath);
        return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        send(res, 405, 'Method not allowed');
        return;
    }

    fs.readFile(targetPath, (error, data) => {
        if (error) {
            send(res, 404, 'Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[path.extname(targetPath)] || 'application/octet-stream' });
        if (req.method === 'HEAD') res.end();
        else res.end(data);
    });
});

server.listen(port, host, () => {
    console.log(`Burbone dev server: http://${host}:${port}/`);
});

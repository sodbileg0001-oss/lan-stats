const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.existsSync(path.join(__dirname, '../dist/index.html')) ? path.resolve(__dirname, '../dist') : path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (file === root) file = path.join(root, 'index.html');
  const relative = path.relative(root, file);
  const allowed = relative === 'index.html' || relative.startsWith('assets' + path.sep) || relative.startsWith('vendor' + path.sep);
  if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(3000, '127.0.0.1', () => console.log('Local: http://127.0.0.1:3000'));

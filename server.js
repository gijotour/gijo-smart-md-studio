const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const DEFAULT_PORT = parseInt(process.env.PORT || '8090', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function getFreePort(startingPort, callback) {
  const server = net.createServer();
  server.listen(startingPort, () => {
    const port = server.address().port;
    server.close(() => {
      callback(null, port);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      getFreePort(startingPort + 1, callback);
    } else {
      callback(err);
    }
  });
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 File Not Found</h1>', 'utf-8');
        } else {
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`, 'utf-8');
        }
      } else {
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        res.end(content, 'utf-8');
      }
    });
  });

  server.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 GIJO Smart MD Studio Web Server Started!`);
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log(`🛡️  Port conflict protection active (Auto-assigned free port)`);
    console.log(`==================================================\n`);
  });
}

getFreePort(DEFAULT_PORT, (err, port) => {
  if (err) {
    console.error('Failed to find free port:', err);
    process.exit(1);
  }
  startServer(port);
});

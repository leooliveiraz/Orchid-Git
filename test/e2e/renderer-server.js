/**
 * Static HTTP server for the webpack renderer output.
 * Serves under /main_window to match electron-forge's dev server.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const RENDERER_DIR = path.resolve(ROOT, ".webpack", "renderer", "main_window");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".map": "application/json",
};

let server = null;

function startRendererServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const send = (code, body, contentType) => {
        res.writeHead(code, { "Content-Type": contentType || "text/plain; charset=utf-8" });
        res.end(body);
      };

      let urlPath = req.url || "/";

      // Root → redirect to /main_window/
      if (urlPath === "/") {
        res.writeHead(302, { Location: "/main_window/" });
        res.end();
        return;
      }

      // Strip /main_window prefix
      if (urlPath.startsWith("/main_window")) {
        urlPath = urlPath.slice("/main_window".length) || "/";
      }

      // Default to index.html
      if (urlPath === "/" || !path.extname(urlPath)) {
        urlPath = "/index.html";
      }

      const filePath = path.join(RENDERER_DIR, urlPath);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback: serve index.html
          return fs.readFile(path.join(RENDERER_DIR, "index.html"), (err2, indexData) => {
            if (err2) return send(404, "Not Found");
            send(200, indexData, "text/html; charset=utf-8");
          });
        }
        const ext = path.extname(filePath);
        send(200, data, MIME[ext] || "application/octet-stream");
      });
    });

    server.listen(3000, () => {
      console.log(`Renderer server running on http://localhost:3000`);
      resolve(server);
    });

    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.log("Port 3000 already in use, reusing");
        resolve(null);
      } else {
        reject(e);
      }
    });
  });
}

function stopRendererServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startRendererServer, stopRendererServer };

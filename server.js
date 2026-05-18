const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || process.argv[2] || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

http.createServer((req, res) => {
  let urlPath;

  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^([/\\])+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = path.resolve(root, safePath === "" ? "index.html" : safePath);
  const relativePath = path.relative(root, filePath);
  const insideRoot = relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!insideRoot) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (path.extname(filePath) === "") {
        fs.readFile(path.join(root, "index.html"), (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            res.writeHead(500);
            res.end("Server error");
            return;
          }

          res.writeHead(200, { "Content-Type": types[".html"] });
          res.end(fallbackData);
        });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio server running at http://127.0.0.1:${port}`);
});

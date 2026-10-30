const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createProjectStore } = require("./scripts/project-store.cjs");
const { sendBuffer, sendFile } = require("./scripts/http-delivery.cjs");

const root = __dirname;
const port = Number(process.env.PORT || process.argv[2] || 4173);
const storageRoot = process.env.PORTFOLIO_STORAGE_DIR || root;
const editableProjectDir = path.join(storageRoot, "data");
const projectStore = createProjectStore({ dataDir: editableProjectDir, historyDir: path.join(storageRoot, ".local-history", "projects") });
const projectSlugs = new Set(["eqlz", "supernova", "kolon", "auto", "helena", "361"]);
const uploadDir = path.join(storageRoot, "assets", "uploads");
const maxVideoBytes = 25 * 1024 * 1024;
const maxImageBytes = 120 * 1024 * 1024;
const ffmpegPath = path.join(root, ".tools", "ffmpeg-npm", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  sendBuffer(res.req, res, JSON.stringify(payload), { status, type: "application/json; charset=utf-8" }).catch(() => res.destroy());
}

function readBody(req, callback) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 12 * 1024 * 1024) req.destroy();
  });

  req.on("end", () => callback(null, body));
  req.on("error", (err) => callback(err));
}

function readBufferBody(req, limit, callback) {
  const chunks = [];
  let total = 0;

  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > limit) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => callback(null, Buffer.concat(chunks)));
  req.on("error", (err) => callback(err));
}

function runFfmpeg(args, callback) {
  if (!fs.existsSync(ffmpegPath)) {
    callback(new Error("ffmpeg not found"));
    return;
  }

  const process = spawn(ffmpegPath, args, { windowsHide: true });
  let stderr = "";
  process.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  process.on("error", callback);
  process.on("close", (code) => {
    callback(code === 0 ? null : new Error(stderr || `ffmpeg exited with ${code}`));
  });
}

function compressVideo(inputPath, outputPath, callback) {
  const attempts = [
    { width: 1920, crf: 28 },
    { width: 1280, crf: 30 },
    { width: 1280, crf: 34 },
    { width: 960, crf: 36 },
    { width: 720, crf: 38 }
  ];
  let index = 0;

  function next() {
    const attempt = attempts[index];
    if (!attempt) {
      callback(new Error("Could not compress below 25MB"));
      return;
    }

    const scale = `scale='min(${attempt.width},iw)':-2`;
    runFfmpeg([
      "-y",
      "-i", inputPath,
      "-vf", scale,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", String(attempt.crf),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "96k",
      outputPath
    ], (err) => {
      if (!err && fs.existsSync(outputPath) && fs.statSync(outputPath).size <= maxVideoBytes) {
        callback(null);
        return;
      }

      fs.rm(outputPath, { force: true }, () => {
        index += 1;
        next();
      });
    });
  }

  next();
}

function safeUploadName(name) {
  return String(name || "video").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "video";
}

function getProjectFile(slug) {
  return path.join(editableProjectDir, `${slug}.json`);
}

function readProjectFile(slug, callback) {
  fs.readFile(getProjectFile(slug), "utf8", (err, data) => {
    if (err) {
      callback(err.code === "ENOENT" ? null : err, {});
      return;
    }

    try {
      callback(null, JSON.parse(data));
    } catch {
      callback(new Error("Invalid project data"));
    }
  });
}

http.createServer(async (req, res) => {
  res.setHeader("X-Portfolio-Server", "sphr-portfolio");
  let urlPath;

  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  // The editor is a loopback-only tool. Reject cross-origin mutations and private-file reads.
  const host = String(req.headers.host || "");
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
    sendJson(res, 403, { error: "Local access only" }); return;
  }
  if (req.method === "POST" && req.headers.origin && req.headers.origin !== `http://${host}`) {
    sendJson(res, 403, { error: "Cross-origin writes are not allowed" }); return;
  }
  if (req.method === "POST" && req.headers["sec-fetch-site"] === "cross-site") {
    sendJson(res, 403, { error: "Cross-site writes are not allowed" }); return;
  }
  const urlSegments = urlPath.replace(/\\/g, '/').split('/');
  const normalizedUrlPath = urlSegments.map(segment => segment.replace(/[ .]+$/g, '').toLowerCase()).join('/');
  if (urlSegments.some(segment => segment.startsWith('.') || segment.includes(':')) || /^(?:\/server\.js|\/scripts(?:\/|$)|\/dev-server)/.test(normalizedUrlPath) || /\.(?:cmd|ps1|cjs)$/.test(normalizedUrlPath)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (req.method === "GET" && urlPath === "/api/editor") {
    sendJson(res, 200, { writable: true, historyLimit: 50 }); return;
  }
  const historyMatch = urlPath.match(/^\/api\/projects\/([^/]+)\/history(?:\/([^/]+))?$/);
  if (req.method === "GET" && historyMatch) {
    try { sendJson(res, 200, historyMatch[2] ? await projectStore.history(historyMatch[1], historyMatch[2]) : await projectStore.list(historyMatch[1])); }
    catch (error) { sendJson(res, error.status || 500, { error: error.status ? error.message : "读取历史版本失败。" }); }
    return;
  }

  if (req.method === "POST" && urlPath === "/api/uploads/video") {
    readBufferBody(req, 260 * 1024 * 1024, (err, buffer) => {
      if (err || !buffer?.length) {
        sendJson(res, 400, { error: "Video upload failed" });
        return;
      }

      const originalName = safeUploadName(req.headers["x-file-name"]);
      const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const inputPath = path.join(uploadDir, `${stamp}-${originalName}`);
      const outputName = `${stamp}-compressed.mp4`;
      const outputPath = path.join(uploadDir, outputName);

      fs.mkdir(uploadDir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          sendJson(res, 500, { error: "Could not prepare upload folder" });
          return;
        }

        fs.writeFile(inputPath, buffer, (writeErr) => {
          if (writeErr) {
            sendJson(res, 500, { error: "Could not write video" });
            return;
          }

          const isMp4 = path.extname(originalName).toLowerCase() === ".mp4";
          if (buffer.length <= maxVideoBytes && isMp4) {
            const publicName = `${stamp}-${originalName}`;
            sendJson(res, 200, {
              url: `/assets/uploads/${publicName}`,
              compressed: false,
              size: buffer.length
            });
            return;
          }

          compressVideo(inputPath, outputPath, (compressErr) => {
            fs.rm(inputPath, { force: true }, () => {});

            if (compressErr) {
              sendJson(res, 500, {
                error: fs.existsSync(ffmpegPath)
                  ? "Could not compress video below 25MB"
                  : "ffmpeg is not installed"
              });
              return;
            }

            sendJson(res, 200, {
              url: `/assets/uploads/${outputName}`,
              compressed: true,
              size: fs.statSync(outputPath).size
            });
          });
        });
      });
    });
    return;
  }

  if (req.method === "POST" && urlPath === "/api/uploads/image") {
    readBufferBody(req, maxImageBytes, (err, buffer) => {
      if (err || !buffer?.length) {
        sendJson(res, 400, { error: "Image upload failed" });
        return;
      }

      const originalName = safeUploadName(req.headers["x-file-name"]);
      const extension = path.extname(originalName).toLowerCase();
      const contentType = String(req.headers["content-type"] || "");
      const allowedTypes = new Set([".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif"]);

      if (!allowedTypes.has(extension) || !contentType.startsWith("image/")) {
        sendJson(res, 400, { error: "Unsupported image type" });
        return;
      }

      const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const publicName = `${stamp}-${originalName}`;
      const outputPath = path.join(uploadDir, publicName);

      fs.mkdir(uploadDir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          sendJson(res, 500, { error: "Could not prepare upload folder" });
          return;
        }

        fs.writeFile(outputPath, buffer, (writeErr) => {
          sendJson(res, writeErr ? 500 : 200, writeErr
            ? { error: "Could not write image" }
            : { url: `/assets/uploads/${publicName}`, size: buffer.length });
        });
      });
    });
    return;
  }

  if (req.method === "GET" && urlPath === "/api/projects") {
    const result = {};
    let remaining = projectSlugs.size;

    projectSlugs.forEach((slug) => {
      readProjectFile(slug, (err, data) => {
        if (!err && data && Object.keys(data).length) result[slug] = data;
        remaining -= 1;
        if (remaining === 0) sendJson(res, 200, result);
      });
    });
    return;
  }

  const projectMatch = urlPath.match(/^\/api\/projects\/([^/]+)$/);

  if (req.method === "GET" && projectMatch) {
    const slug = projectMatch[1];
    if (!projectSlugs.has(slug)) {
      sendJson(res, 404, { error: "Unknown project" });
      return;
    }

    try { const project = await projectStore.read(slug); res.setHeader("ETag", project.revision); sendJson(res, 200, project.data); }
    catch (error) { sendJson(res, error.status || 500, { error: error.status ? error.message : "读取失败。" }); }
    return;
  }

  if (req.method === "POST" && projectMatch) {
    const slug = projectMatch[1];
    if (!projectSlugs.has(slug)) {
      sendJson(res, 404, { error: "Unknown project" });
      return;
    }

    readBody(req, async (err, body) => {
      if (err) {
        sendJson(res, 400, { error: "Bad request" });
        return;
      }

      try {
        const project = await projectStore.save(slug, JSON.parse(body), req.headers["if-match"]);
        res.setHeader("ETag", project.revision);
        sendJson(res, 200, project.data);
      } catch (error) {
        sendJson(res, error.status || (error instanceof SyntaxError ? 400 : 500), { error: error.status ? error.message : "保存失败，原文件和草稿已保留。" });
      }
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  // Serve only website resources. Root source/docs cannot become public through Windows aliases.
  if (!/^\/(?:assets|css|js|data)\//.test(normalizedUrlPath) && !['/', '/index.html'].includes(normalizedUrlPath)) {
    if (path.extname(urlPath)) { res.writeHead(403); res.end('Forbidden'); return; }
    try { await sendFile(req, res, path.join(root, 'index.html'), types['.html']); }
    catch { res.writeHead(500); res.end('Server error'); }
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^([/\\])+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = storageRoot !== root && safePath.startsWith(path.join("assets", "uploads") + path.sep)
    ? path.resolve(storageRoot, safePath)
    : path.resolve(root, safePath === "" ? "index.html" : safePath);
  const relativePath = path.relative(root, filePath);
  const insideRoot = relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) || (storageRoot !== root && filePath.startsWith(path.join(storageRoot, "assets", "uploads") + path.sep));

  if (!insideRoot) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    await sendFile(req, res, filePath, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  } catch (error) {
    if (res.headersSent || res.destroyed) { res.destroy(); return; }
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) && path.extname(filePath) === "") {
      try { await sendFile(req, res, path.join(root, 'index.html'), types['.html']); }
      catch { res.writeHead(500); res.end('Server error'); }
      return;
    }
    res.writeHead(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio server running at http://127.0.0.1:${port}`);
});

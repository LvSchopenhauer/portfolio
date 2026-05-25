const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const port = Number(process.env.PORT || process.argv[2] || 4173);
const editableProjectDir = path.join(root, "data");
const projectSlugs = new Set(["eqlz", "supernova", "kolon", "auto", "helena", "361"]);
const uploadDir = path.join(root, "assets", "uploads");
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
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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

function sanitizeProject(data) {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];

  return {
    client: String(data.client || ""),
    title: String(data.title || ""),
    copy: String(data.copy || ""),
    secondary: String(data.secondary || ""),
    image: String(data.image || ""),
    blocks: blocks
      .filter((block) => block && (block.type === "text" || block.type === "image" || block.type === "video"))
      .map((block) => ({
        id: String(block.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        type: block.type,
        content: String(block.content || ""),
        size: Math.min(100, Math.max(50, Number(block.size) || 100)),
        fontSize: Math.min(72, Math.max(14, Number(block.fontSize) || 24)),
        fontWeight: Math.min(700, Math.max(300, Number(block.fontWeight) || 400)),
        layout: (block.type === "image" || block.type === "video") && block.layout === "half" ? "half" : "full",
        ratio: String(block.ratio || "16 / 9")
      }))
  };
}

http.createServer((req, res) => {
  let urlPath;

  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
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
      const allowedTypes = new Set([".gif"]);

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

    readProjectFile(slug, (err, data) => {
      sendJson(res, err ? 500 : 200, err ? { error: "Read failed" } : data);
    });
    return;
  }

  if (req.method === "POST" && projectMatch) {
    const slug = projectMatch[1];
    if (!projectSlugs.has(slug)) {
      sendJson(res, 404, { error: "Unknown project" });
      return;
    }

    readBody(req, (err, body) => {
      if (err) {
        sendJson(res, 400, { error: "Bad request" });
        return;
      }

      try {
        const project = sanitizeProject(JSON.parse(body));
        fs.mkdir(editableProjectDir, { recursive: true }, (mkdirErr) => {
          if (mkdirErr) {
            sendJson(res, 500, { error: "Write failed" });
            return;
          }

          fs.writeFile(getProjectFile(slug), `${JSON.stringify(project, null, 2)}\n`, "utf8", (writeErr) => {
            sendJson(res, writeErr ? 500 : 200, writeErr ? { error: "Write failed" } : project);
          });
        });
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
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

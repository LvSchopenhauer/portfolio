const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { pipeline } = require('node:stream/promises');
const zlib = require('node:zlib');

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
const REVALIDATE = 'public, max-age=0, must-revalidate';
const files = new Map();
const digest = body => `"${createHash('sha256').update(body).digest('hex')}"`;
const compressible = type => /^(text\/|application\/(?:json|javascript)|image\/svg\+xml)/.test(type);

function chooseEncoding(header, size) {
  const accepted = new Map(String(header || '').toLowerCase().split(',').map(part => {
    const [name, ...params] = part.trim().split(';');
    const q = params.find(p => p.trim().startsWith('q='));
    const value = q ? Number(q.trim().slice(2)) : 1;
    return [name, Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0];
  }));
  const quality = name => accepted.get(name) ?? accepted.get('*') ?? 0;
  const identity = accepted.get('identity') ?? (accepted.get('*') === 0 ? 0 : 1);
  const candidates = ['br', 'gzip'].filter(name => quality(name) > 0).sort((a,b) => quality(b) - quality(a));
  if (identity > 0 && (size < 1024 || !candidates.length || accepted.has('identity') && identity > quality(candidates[0]))) return 'identity';
  return candidates[0] || (identity > 0 ? 'identity' : null);
}

async function representation(body, encoding, variants) {
  if (encoding === 'identity') return { body, etag: digest(body) };
  if (!variants.has(encoding)) {
    const task = (encoding === 'br'
      ? brotli(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzip(body)).then(encoded => ({ body: encoded, etag: digest(encoded) }));
    variants.set(encoding, task);
    task.catch(() => variants.delete(encoding));
  }
  return variants.get(encoding);
}

function matchesTag(header, etag) {
  return String(header).split(',').some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag);
}

function notModified(req, etag, modified) {
  if (req.headers['if-none-match'] !== undefined) return matchesTag(req.headers['if-none-match'], etag);
  const since = Date.parse(req.headers['if-modified-since']);
  return modified && Number.isFinite(since) && modified <= since;
}

async function sendBuffer(req, res, input, { type, status = 200, cacheControl = 'no-store', validate = false, variants = new Map(), modified } = {}) {
  const body = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const canCompress = compressible(type);
  const encoding = canCompress ? chooseEncoding(req.headers['accept-encoding'], body.length) : chooseEncoding(req.headers['accept-encoding'], 0) === 'identity' ? 'identity' : null;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (canCompress) res.setHeader('Vary', 'Accept-Encoding');
  if (!encoding) { res.writeHead(406); res.end(); return; }
  const selected = await representation(body, encoding, variants);
  if (res.destroyed) return;
  // API ETags are project revisions used by If-Match; never replace them with transport hashes.
  if (validate) res.setHeader('ETag', selected.etag);
  if (modified) res.setHeader('Last-Modified', new Date(modified).toUTCString());
  if (encoding !== 'identity') res.setHeader('Content-Encoding', encoding);
  if (validate && notModified(req, selected.etag, modified)) { res.writeHead(304); res.end(); return; }
  res.setHeader('Content-Length', selected.body.length);
  res.writeHead(status);
  res.end(req.method === 'HEAD' ? undefined : selected.body);
}

async function metadata(filePath, type) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) { const error = new Error('Not a file'); error.code = 'ENOENT'; throw error; }
  const signature = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
  let cached = files.get(filePath);
  if (!cached || cached.signature !== signature) {
    const ready = (async () => {
      if (compressible(type) && stat.size <= 2 * 1024 * 1024) {
        const body = await fsp.readFile(filePath);
        return { body, etag: digest(body), variants: new Map(), stat };
      }
      const hash = createHash('sha256');
      for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
      return { etag: `"${hash.digest('hex')}"`, variants: new Map(), stat };
    })();
    cached = { signature, ready };
    files.delete(filePath); files.set(filePath, cached);
    // Bound retained file buffers and encoded variants; large videos are never retained.
    if (files.size > 32) files.delete(files.keys().next().value);
    ready.catch(() => { if (files.get(filePath) === cached) files.delete(filePath); });
  }
  return cached.ready;
}

function byteRange(header, size) {
  if (!header || !header.startsWith('bytes=') || header.includes(',')) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || !size || !match[1] && !match[2]) return false;
  let start, end;
  if (!match[1]) { const suffix = Number(match[2]); start = Math.max(0, size - suffix); end = size - 1; }
  else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1; }
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start < size && start <= end ? { start, end } : false;
}

async function sendFile(req, res, filePath, type) {
  const entry = await metadata(filePath, type);
  const { stat, etag } = entry;
  const cacheControl = type.startsWith('application/json') ? 'no-store' : REVALIDATE;
  const ifRange = req.headers['if-range'];
  // HTTP dates lose subsecond precision; fall back to 200 when they cannot prove identity.
  const ifRangeMatches = !ifRange || ifRange === etag || stat.mtimeMs === Date.parse(ifRange);
  const range = ifRangeMatches ? byteRange(req.headers.range, stat.size) : null;
  if (range === null && compressible(type)) {
    return sendBuffer(req, res, entry.body || await fsp.readFile(filePath), { type, cacheControl, validate: cacheControl !== 'no-store', variants: entry.variants, modified: stat.mtimeMs });
  }
  if (chooseEncoding(req.headers['accept-encoding'], 0) !== 'identity') { res.writeHead(406); res.end(); return; }
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  res.setHeader('Accept-Ranges', 'bytes');
  if (cacheControl !== 'no-store' && notModified(req, etag, stat.mtimeMs)) { res.writeHead(304); res.end(); return; }
  if (range === false) { res.setHeader('Content-Range', `bytes */${stat.size}`); res.writeHead(416); res.end(); return; }
  const start = range ? range.start : 0, end = range ? range.end : stat.size - 1;
  if (range) res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  res.setHeader('Content-Length', Math.max(0, end - start + 1));
  res.writeHead(range ? 206 : 200);
  if (req.method === 'HEAD' || !stat.size) { res.end(); return; }
  await pipeline(fs.createReadStream(filePath, { start, end }), res);
}

module.exports = { sendBuffer, sendFile, byteRange };

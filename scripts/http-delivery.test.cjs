const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const { sendBuffer, sendFile } = require('./http-delivery.cjs');

const css = Buffer.from('.example { color: #123; font-size: 24px; }\n'.repeat(200));
const movie = Buffer.from(Array.from({ length: 20000 }, (_, i) => i % 251));
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sphr-http-'));
  await fs.writeFile(path.join(dir, 'style.css'), css);
  await fs.writeFile(path.join(dir, 'video.mp4'), movie);
  const server = http.createServer((req, res) => {
    let task;
    if (req.url === '/api') {
      res.setHeader('ETag', '"project-revision"');
      task = sendBuffer(req, res, JSON.stringify({ copy: '中文 English '.repeat(400) }), { type: 'application/json' });
    } else task = sendFile(req, res, path.join(dir, req.url === '/video' ? 'video.mp4' : 'style.css'), req.url === '/video' ? 'video/mp4' : 'text/css');
    task.catch(error => { if (res.headersSent) res.destroy(); else { res.writeHead(500); res.end(error.message); } });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(dir, { recursive: true, force: true }); });
  const request = (route, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, method, headers }, res => {
      const chunks = []; res.on('data', b => chunks.push(b)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
  return { dir, request };
}

test('Brotli, gzip and identity preserve exact content, honor q=0 and use distinct validators', async t => {
  const { request } = await fixture(t);
  const br = await request('/css', { 'Accept-Encoding': 'br, gzip' });
  const gz = await request('/css', { 'Accept-Encoding': 'br;q=0, gzip;q=0.8' });
  const plain = await request('/css');
  assert.equal(br.headers['content-encoding'], 'br');
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.equal(br.headers.vary, 'Accept-Encoding');
  assert.deepEqual(zlib.brotliDecompressSync(br.body), css);
  assert.deepEqual(zlib.gunzipSync(gz.body), css);
  assert.deepEqual(plain.body, css);
  assert.ok(br.body.length < css.length);
  assert.equal(new Set([br.headers.etag, gz.headers.etag, plain.headers.etag]).size, 3);
  assert.equal((await request('/css', { 'Accept-Encoding': '*;q=0' })).status, 406);
  assert.equal((await request('/video', { 'Accept-Encoding': 'identity;q=0' })).status, 406);
});

test('static versions revalidate with 304 and change immediately when the same URL changes', async t => {
  const { request, dir } = await fixture(t);
  const before = await request('/css', { 'Accept-Encoding': 'br' });
  const unchanged = await request('/css', { 'Accept-Encoding': 'br', 'If-None-Match': `W/${before.headers.etag}` });
  assert.equal(unchanged.status, 304); assert.equal(unchanged.body.length, 0);
  assert.equal(before.headers['cache-control'], 'public, max-age=0, must-revalidate');
  const updated = Buffer.from(css.toString().replaceAll('#123', '#456'));
  await fs.writeFile(path.join(dir, 'style.css'), updated);
  const after = await request('/css', { 'Accept-Encoding': 'br', 'If-None-Match': before.headers.etag });
  assert.equal(after.status, 200); assert.notEqual(after.headers.etag, before.headers.etag);
  assert.deepEqual(zlib.brotliDecompressSync(after.body), updated);
  const head = await request('/css', { 'Accept-Encoding': 'br' }, 'HEAD');
  assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), after.body.length);
});

test('video ranges return exact slices, suffixes, open ranges and correct failure boundaries', async t => {
  const { request } = await fixture(t);
  const first = await request('/video', { Range: 'bytes=0-1023' });
  assert.equal(first.status, 206); assert.deepEqual(first.body, movie.subarray(0, 1024));
  assert.equal(first.headers['content-range'], `bytes 0-1023/${movie.length}`);
  assert.equal(first.headers['accept-ranges'], 'bytes');
  assert.equal(first.headers['content-encoding'], undefined);
  assert.deepEqual((await request('/video', { Range: 'bytes=-100' })).body, movie.subarray(-100));
  assert.deepEqual((await request('/video', { Range: 'bytes=19000-' })).body, movie.subarray(19000));
  for (const range of ['bytes=20000-', 'bytes=9-1', 'bytes=-0']) {
    const r = await request('/video', { Range: range }); assert.equal(r.status, 416); assert.equal(r.headers['content-range'], `bytes */${movie.length}`);
  }
  const head = await request('/video', { Range: 'bytes=0-99' }, 'HEAD');
  assert.equal(head.status, 206); assert.equal(head.body.length, 0); assert.equal(head.headers['content-length'], '100');
  const stale = await request('/video', { Range: 'bytes=0-99', 'If-Range': '"old-version"' });
  assert.equal(stale.status, 200); assert.deepEqual(stale.body, movie);
  const current = await request('/video', { Range: 'bytes=0-99', 'If-Range': first.headers.etag });
  assert.equal(current.status, 206);
  const multiple = await request('/video', { Range: 'bytes=0-1,4-5' });
  assert.equal(multiple.status, 200); assert.deepEqual(multiple.body, movie);
});

test('compressed editor JSON stays no-store and preserves the revision used for saves', async t => {
  const { request } = await fixture(t);
  const r = await request('/api', { 'Accept-Encoding': 'br', 'If-None-Match': '"project-revision"' });
  assert.equal(r.status, 200); assert.equal(r.headers.etag, '"project-revision"');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(JSON.parse(zlib.brotliDecompressSync(r.body)).copy, '中文 English '.repeat(400));
});

test('real application keeps compressed saves, history, preview routes and isolated uploads compatible', async t => {
  const root = path.resolve(__dirname, '..');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sphr-app-'));
  await fs.mkdir(path.join(dir, 'data'));
  const project = { client: 'Fixture', title: 'Original', copy: '中文 English '.repeat(400), image: '/assets/covers/cover_1.png', blocks: [], video: '' };
  await fs.writeFile(path.join(dir, 'data', 'auto.json'), JSON.stringify(project));
  const reserve = http.createServer();
  await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const child = spawn(process.execPath, [path.join(root, 'server.js'), String(port)], { env: { ...process.env, PORT: String(port), PORTFOLIO_STORAGE_DIR: dir }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = ''; child.stderr.on('data', b => { errors += b; });
  t.after(async () => {
    if (child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; }
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(base + '/api/editor')).ok; } catch {}
    if (ready) break;
    if (child.exitCode !== null) throw new Error(errors);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.ok(ready, errors || 'Server must become ready');
  const current = await fetch(base + '/api/projects/auto', { headers: { 'Accept-Encoding': 'br' } });
  assert.equal(current.headers.get('content-encoding'), 'br');
  assert.deepEqual(await current.json(), project);
  const save = await fetch(base + '/api/projects/auto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'br', 'If-Match': current.headers.get('etag') }, body: JSON.stringify({ ...project, title: 'Updated' }) });
  assert.equal(save.status, 200); assert.equal((await save.json()).title, 'Updated');
  assert.equal((await fetch(base + '/api/projects/auto/history')).status, 200);
  const page = await fetch(base + '/supernova?editor-preview=1');
  assert.equal(await page.text(), await fs.readFile(path.join(root, 'index.html'), 'utf8'));
  for (const route of ['/SERVER.JS', '/Scripts/project-store.cjs', '/scripts./project-store.cjs', '/start-local.cmd', '/start-local.cmd.', '/start-local.cmd::$DATA', '/README.md']) assert.equal((await fetch(base + route)).status, 403);
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const uploaded = await fetch(base + '/api/uploads/image', { method: 'POST', headers: { 'Content-Type': 'image/gif', 'X-File-Name': 'fixture.gif' }, body: gif });
  assert.equal(uploaded.status, 200);
  const media = await uploaded.json();
  assert.deepEqual(Buffer.from(await (await fetch(base + media.url)).arrayBuffer()), gif);
});

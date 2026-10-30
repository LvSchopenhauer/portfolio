// Run against the isolated fixture server: node scripts/editor-browser-fixture.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = 'http://127.0.0.1:4174';
async function main() {
  assert.equal((await (await fetch(`${base}/api/editor`)).json()).writable, true);
  const current = await fetch(`${base}/api/projects/auto`);
  const revision = current.headers.get('etag'), original = await current.json();
  const write = (data, etag = revision) => fetch(`${base}/api/projects/auto`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'If-Match': etag }, body: JSON.stringify(data) });
  assert.equal((await write(original, '')).status, 428);
  const saved = await write({ ...original, title: 'HTTP integration test' });
  assert.equal(saved.status, 200);
  assert.equal((await write({ ...original, title: 'Stale writer' })).status, 409);
  assert.equal((await write({ ...original, image: 'javascript:alert(1)' }, saved.headers.get('etag'))).status, 422);
  assert.equal((await (await fetch(`${base}/api/projects/auto`)).json()).title, 'HTTP integration test');
  const versions = await (await fetch(`${base}/api/projects/auto/history`)).json();
  assert.ok(versions.length > 0);
  const previous = await (await fetch(`${base}/api/projects/auto/history/${versions[0].id}`)).json();
  assert.deepEqual(previous, original);
  const restored = await write(previous, saved.headers.get('etag'));
  assert.equal(restored.status, 200);
  console.log('PASS HTTP save, revision conflict, validation, backup and restoration');
  for (const url of ['/.git/config', '/.local-history/projects/auto', '/server.js', '/scripts/project-store.cjs']) assert.equal((await fetch(base + url)).status, 403);
  const forbidden = await fetch(`${base}/api/projects/auto`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://external.example', 'If-Match': restored.headers.get('etag') }, body: JSON.stringify(original) });
  assert.equal(forbidden.status, 403);
  console.log('PASS local-only writes and private path protection');
  const image = await fs.readFile(path.join(__dirname, '..', '.editor-test', 'test.gif'));
  const upload = await fetch(`${base}/api/uploads/image`, { method: 'POST', headers: { 'Content-Type': 'image/gif', 'X-File-Name': 'smoke.gif' }, body: image });
  assert.equal(upload.status, 200);
  const asset = await upload.json();
  assert.deepEqual(Buffer.from(await (await fetch(base + asset.url)).arrayBuffer()), image);
  assert.equal((await fetch(`${base}/api/uploads/image`, { method: 'POST', headers: { 'Content-Type': 'image/svg+xml', 'X-File-Name': 'blocked.svg' }, body: '<svg/>' })).status, 400);
  console.log('PASS image upload, retrieval and unsupported type rejection');
  const uploads = path.join(__dirname, '..', 'assets', 'uploads');
  let sample;
  for (const name of await fs.readdir(uploads)) { const file = path.join(uploads, name); if (name.endsWith('.mp4') && (await fs.stat(file)).size < 1024 * 1024) { sample = await fs.readFile(file); break; } }
  assert.ok(sample, 'A small existing MP4 fixture is required');
  const video = await fetch(`${base}/api/uploads/video`, { method: 'POST', headers: { 'Content-Type': 'video/mp4', 'X-File-Name': 'smoke.mp4' }, body: sample });
  assert.equal(video.status, 200);
  const movie = await video.json();
  assert.equal(movie.compressed, false);
  assert.deepEqual(Buffer.from(await (await fetch(base + movie.url)).arrayBuffer()), sample);
  console.log('PASS video upload and byte-perfect retrieval');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

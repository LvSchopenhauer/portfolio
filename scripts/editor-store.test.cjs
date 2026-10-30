const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createProjectStore, normalizeProject } = require('./project-store.cjs');

const fixture = () => ({ client: 'Example', title: 'Product film', copy: 'Project background', secondary: 'My contribution', image: '/assets/covers/cover_2.png', video: '', blocks: [{ id: 'shot-1', type: 'text', content: 'Production process', fontSize: 18, fontWeight: 400, size: 100, layout: 'full', ratio: '16 / 9' }] });
async function workspace(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sphr-store-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store: createProjectStore({ dataDir: path.join(dir, 'data'), historyDir: path.join(dir, '.history'), retain: 3 }) };
}
test('save requires revision and never changes an existing file on conflict', async t => {
  const { store } = await workspace(t);
  const start = await store.read('supernova');
  await assert.rejects(store.save('supernova', fixture()), { status: 428 });
  const saved = await store.save('supernova', fixture(), start.revision);
  await assert.rejects(store.save('supernova', { ...fixture(), title: 'Stale tab' }, start.revision), { status: 409 });
  assert.deepEqual(await store.read('supernova'), saved);
});
test('simultaneous saves serialize, preserving the first writer and rejecting stale data', async t => {
  const { store } = await workspace(t);
  const { revision } = await store.read('supernova');
  const results = await Promise.allSettled(['First', 'Second'].map(title => store.save('supernova', { ...fixture(), title }, revision)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal((await store.read('supernova')).data.title, 'First');
});
test('backups preserve previous content and restoring creates a new current revision', async t => {
  const { store } = await workspace(t);
  let current = await store.read('supernova');
  current = await store.save('supernova', fixture(), current.revision);
  const original = clone(current.data);
  current = await store.save('supernova', { ...fixture(), title: 'Revision 2' }, current.revision);
  const versions = await store.list('supernova');
  assert.equal(versions.length, 1);
  const snapshot = await store.history('supernova', versions[0].id);
  assert.deepEqual(snapshot, original);
  current = await store.save('supernova', snapshot, current.revision);
  assert.deepEqual(current.data, original);
  assert.equal((await store.list('supernova')).length, 2);
  assert.equal((await store.history('supernova', (await store.list('supernova'))[0].id)).title, 'Revision 2');
});
function clone(data) { return JSON.parse(JSON.stringify(data)); }
test('invalid input and unsafe media are rejected without modifying content', async t => {
  const { store } = await workspace(t);
  const before = await store.read('supernova');
  for (const bad of [{ ...fixture(), image: 'javascript:alert(1)' }, { ...fixture(), video: 'https://untrusted.example/embed' }, { ...fixture(), blocks: [fixture().blocks[0], fixture().blocks[0]] }, { ...fixture(), title: '' }, { ...fixture(), blocks: 'invalid' }]) {
    assert.throws(() => normalizeProject(bad), { status: 422 });
  }
  assert.deepEqual(await store.read('supernova'), before);
  await assert.rejects(store.read('../outside'), { status: 404 });
  await assert.rejects(store.history('supernova', '../../outside.json'), { status: 404 });
});
test('backup failure leaves the original file intact and no temporary replacement remains', async t => {
  const { dir, store } = await workspace(t);
  let current = await store.save('supernova', fixture(), (await store.read('supernova')).revision);
  await fs.rm(path.join(dir, '.history'), { recursive: true });
  await fs.writeFile(path.join(dir, '.history'), 'Blocked backup folder');
  await assert.rejects(store.save('supernova', { ...fixture(), title: 'Must not persist' }, current.revision));
  assert.deepEqual(await store.read('supernova'), current);
  assert.equal((await fs.readdir(path.join(dir, 'data'))).some(name => name.endsWith('.tmp')), false);
});
test('history retention is bounded and media metadata survives a roundtrip', async t => {
  const { store } = await workspace(t);
  let current = await store.read('supernova');
  for (let i = 0; i < 6; i++) current = await store.save('supernova', { ...fixture(), title: `Version ${i}`, blocks: [{ id: 'video', type: 'video', content: '/assets/example.mp4', alt: 'Product animation', caption: 'Simulation study', controls: true, loop: false, autoplay: false }] }, current.revision);
  assert.equal((await store.list('supernova')).length, 3);
  assert.equal(current.data.blocks[0].caption, 'Simulation study');
  assert.equal(current.data.blocks[0].loop, false);
  assert.equal(current.data.video, '');
});

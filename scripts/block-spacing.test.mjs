import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { normalizeBlockSpacing, blockRowSpacing } from '../js/block-spacing.js';
const { createProjectStore, normalizeProject } = createRequire(import.meta.url)('./project-store.cjs');

test('spacing preserves automatic versus zero and bounds numeric input', () => {
  for (const value of [undefined, null, '', false, {}, 'bad', Infinity]) assert.equal(normalizeBlockSpacing(value), undefined);
  assert.equal(normalizeBlockSpacing(0), 0);
  assert.equal(normalizeBlockSpacing('48'), 48);
  assert.equal(normalizeBlockSpacing(-10), 0);
  assert.equal(normalizeBlockSpacing(900), 400);
  assert.equal(normalizeBlockSpacing(48.7), 49);
});

test('paired images share the greatest explicit gap; the final row has no added gap', () => {
  assert.deepEqual(blockRowSpacing([{ span: 1, spacingAfter: 48 }, { span: 1 }, { span: 2 }]), [
    { gap: 48, custom: true }, { gap: 48, custom: true }, { gap: 0, custom: false }
  ]);
  assert.deepEqual(blockRowSpacing([{ span: 1, spacingAfter: 0 }, { span: 1, spacingAfter: 64 }, { span: 2, spacingAfter: 300 }]), [
    { gap: 64, custom: true }, { gap: 64, custom: true }, { gap: 0, custom: true }
  ]);
});

test('an incomplete half row ends before a full-width block; automatic gaps stay absent', () => {
  assert.deepEqual(blockRowSpacing([{ span: 1 }, { span: 2, spacingAfter: 0 }, { span: 1 }]), [
    { gap: undefined, custom: false }, { gap: 0, custom: true }, { gap: 0, custom: false }
  ]);
  assert.deepEqual(blockRowSpacing([]), []);
});

test('saved spacing survives reload, zero is distinct from automatic, and invalid data is rejected', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sphr-spacing-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createProjectStore({ dataDir: path.join(dir, 'data'), historyDir: path.join(dir, 'history') });
  const project = { client: 'Fixture', title: 'Spacing', blocks: [
    { id: 'a', type: 'image', content: '/assets/a.png', spacingAfter: 48 },
    { id: 'b', type: 'text', content: 'Heading', spacingAfter: 0 },
    { id: 'c', type: 'video', content: '/assets/c.mp4' }
  ] };
  const saved = await store.save('eqlz', project, (await store.read('eqlz')).revision);
  assert.deepEqual(saved, await store.read('eqlz'));
  assert.deepEqual(saved.data.blocks.map(block => block.spacingAfter), [48, 0, undefined]);
  for (const bad of ['bad', {}, true, Infinity]) assert.throws(() => normalizeProject({ ...project, blocks: [{ ...project.blocks[0], spacingAfter: bad }] }), { status: 422 });
  delete saved.data.blocks[0].spacingAfter;
  const reset = await store.save('eqlz', saved.data, saved.revision);
  assert.equal(Object.hasOwn(reset.data.blocks[0], 'spacingAfter'), false);
  assert.equal((await store.history('eqlz', (await store.list('eqlz'))[0].id)).blocks[0].spacingAfter, 48);
});

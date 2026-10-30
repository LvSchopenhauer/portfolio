import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { splitScriptRuns, normalizeTypography, cssTypography } from '../js/typography.js';
const { normalizeProject, normalizeTypography: serverNormalize, createProjectStore } = createRequire(import.meta.url)('./project-store.cjs');
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('mixed Chinese, English, numbers, punctuation and line breaks preserve text exactly', () => {
  const text = '我参与 CG / Motion UI 制作，DREAMSTRIKE+ 2.0。\n渲染 Café 2024：soft & stable';
  const runs = splitScriptRuns(text);
  assert.equal(runs.map(run => run.text).join(''), text);
  assert.ok(runs.some(run => run.script === 'latin' && run.text.includes('DREAMSTRIKE+ 2.0')));
  assert.ok(runs.some(run => run.script === 'cjk' && run.text.includes('制作，')));
  assert.ok(runs.some(run => run.script === 'latin' && run.text.includes('Café')));
});
test('Figma-like percentages are converted relative to font size, zero and negative tracking survive', () => {
  const style = normalizeTypography({ fontSize: 20, lineHeight: 160, lineHeightUnit: '%', letterSpacing: -2, letterSpacingUnit: '%', cnWeight: 400, enWeight: 600, align: 'left' });
  assert.deepEqual(cssTypography(style), { fontSize: '20px', lineHeight: '1.6', letterSpacing: '-0.02em', textAlign: 'left' });
  assert.equal(cssTypography({ ...style, letterSpacing: 0, letterSpacingUnit: 'px' }).letterSpacing, '0px');
  assert.equal(cssTypography({ ...style, lineHeight: 28, lineHeightUnit: 'px' }).lineHeight, '28px');
});
test('browser and server normalize the same settings, including malformed values and bounds', () => {
  for (const style of [{}, { fontSize: 120, cnWeight: 700, enWeight: 900, letterSpacing: 0 }, { fontSize: 'bad', cnWeight: 600, lineHeight: -100, letterSpacing: -8 }, { lineHeightUnit: 'px', lineHeight: 26, letterSpacingUnit: '%', letterSpacing: 2.5, align: 'left' }, { cnWeight: 900, enWeight: 100, fontSize: 18 }]) assert.deepEqual(serverNormalize(style), normalizeTypography(style));
  assert.throws(() => serverNormalize('font-size:999px'), { status: 422 });
});
test('project and block typography survive save, reload and history restoration', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sphr-type-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = createProjectStore({ dataDir: path.join(root, 'data'), historyDir: path.join(root, 'history') });
  const typography = normalizeTypography({ fontSize: 20, cnWeight: 400, enWeight: 600, lineHeight: 160, letterSpacing: -.2, align: 'left' });
  const project = { client: 'Test', title: 'Mixed type', copy: '中文与 English', typography: { copy: typography }, blocks: [{ id: 'mixed', type: 'text', content: 'CG 制作经验', typography }] };
  let current = await store.save('supernova', project, (await store.read('supernova')).revision);
  assert.deepEqual(current.data.typography.copy, typography);
  assert.deepEqual(current.data.blocks[0].typography, typography);
  current = await store.save('supernova', { ...project, typography: { copy: { ...typography, letterSpacing: 0 } } }, current.revision);
  const old = await store.history('supernova', (await store.list('supernova'))[0].id);
  assert.equal(old.typography.copy.letterSpacing, -.2);
  assert.ok(!Object.hasOwn(normalizeProject({ client: 'Old', title: 'Old project', blocks: [] }), 'typography'));
});

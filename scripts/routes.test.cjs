const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const main = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
const loaderSource = main.slice(main.indexOf('async function fetchJson('), main.indexOf('function readEditableProject('));
const routingSource = main.slice(main.indexOf('async function routeFromLocation('), main.indexOf('window.addEventListener("popstate"'));
const project = title => ({ title, client: 'Example', blocks: [] });
const response = data => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => data });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function loader(fetch, extra = {}) {
  const context = { fetch, AbortController, setTimeout, clearTimeout, projectSlugs: new Set(['eqlz','auto']), editableProjectData: {}, projectRequests: new Map(), localEditorHost: false, getEditableProjectApi: slug => `/api/projects/${slug}`, ...extra };
  const api = vm.runInNewContext(loaderSource + '; ({loadEditableProject, fetchJson})', context);
  return { ...context, ...api };
}
function router(initialPath, load = async () => {}) {
  let currentPath = initialPath;
  const calls = [];
  const window = { __sphrStartup: { stage: 'module-evaluating' }, location: { hash: '' } };
  window.parent = window;
  const context = {
    window, navigationVersion: 0, routeStatus: { hidden: true }, editableProjectData: {}, projectSlugs: new Set(['eqlz','auto']),
    getSlugFromPath: () => currentPath,
    loadEditableProject: slug => { calls.push(['load', slug]); return load(slug); },
    showHomePage: () => calls.push(['home']), showInfoPage: () => calls.push(['info']), showOriginPage: () => calls.push(['origin']),
    showAdminPage: async () => calls.push(['admin']), showProjectPage: slug => calls.push(['project',slug]),
    showProjectLoadState: failed => calls.push([failed ? 'failed' : 'loading']), scrollToHash: () => {}
  };
  const api = vm.runInNewContext(routingSource + '; ({initRoute})', context);
  return { ...context, ...api, calls, navigate: slug => { currentPath = slug; } };
}

for (const [route, show] of [['','home'], ['info','info'], ['origin','origin']]) {
  test(`${show} is ready without starting or awaiting project requests`, async () => {
    const fixture = router(route, () => new Promise(() => {}));
    await fixture.initRoute();
    assert.deepEqual(fixture.calls, [[show]]);
    assert.equal(fixture.window.__sphrStartup.stage, 'route-ready');
  });
}

test('production loads only selected static JSON and never probes the local editor API', async () => {
  const calls = [];
  const fixture = loader(async (url, options) => { calls.push(url); assert.equal(options.cache, 'no-store'); return response(project('EQLZ')); });
  await fixture.loadEditableProject('eqlz');
  assert.deepEqual(calls, ['/data/eqlz.json']);
  assert.equal(fixture.editableProjectData.auto, undefined);
});

test('local preview uses the single-project API', async () => {
  const calls = [];
  const fixture = loader(async url => { calls.push(url); return response(project('Local')); }, { localEditorHost: true });
  await fixture.loadEditableProject('eqlz');
  assert.deepEqual(calls, ['/api/projects/eqlz']);
});

test('local static preview falls back to selected JSON when editor API returns HTML', async () => {
  const calls = [];
  const fixture = loader(async url => {
    calls.push(url);
    return url.startsWith('/api') ? { ok: true, headers: { get: () => 'text/html' } } : response(project('Static'));
  }, { localEditorHost: true });
  assert.equal((await fixture.loadEditableProject('eqlz')).title, 'Static');
  assert.deepEqual(calls, ['/api/projects/eqlz','/data/eqlz.json']);
});

test('one stalled project cannot block another project', async () => {
  const slow = deferred();
  const fixture = loader(url => url.includes('eqlz') ? slow.promise : Promise.resolve(response(project('Auto'))));
  const first = fixture.loadEditableProject('eqlz');
  assert.equal((await fixture.loadEditableProject('auto')).title, 'Auto');
  assert.equal(fixture.editableProjectData.eqlz, undefined);
  slow.resolve(response(project('EQLZ')));
  await first;
});

test('concurrent requests for one project are shared and successful data is reused', async () => {
  const pending = deferred(); let calls = 0;
  const fixture = loader(() => { calls++; return pending.promise; });
  const first = fixture.loadEditableProject('eqlz');
  const second = fixture.loadEditableProject('eqlz');
  pending.resolve(response(project('EQLZ')));
  assert.deepEqual(await first, await second);
  await fixture.loadEditableProject('eqlz');
  assert.equal(calls, 1);
});

test('failed data is not cached and can be retried', async () => {
  let calls = 0;
  const fixture = loader(async () => ++calls === 1 ? { ok: false } : response(project('Recovered')));
  await assert.rejects(fixture.loadEditableProject('eqlz'), /request failed/);
  assert.equal(fixture.projectRequests.size, 0);
  assert.equal(fixture.editableProjectData.eqlz, undefined);
  assert.equal((await fixture.loadEditableProject('eqlz')).title, 'Recovered');
});

test('late project response cannot replace a newer Info navigation', async () => {
  const pending = deferred();
  const fixture = router('eqlz', () => pending.promise);
  const first = fixture.initRoute();
  fixture.navigate('info');
  await fixture.initRoute();
  pending.resolve(project('EQLZ'));
  await first;
  assert.deepEqual(fixture.calls, [['loading'],['load','eqlz'],['info']]);
  assert.equal(fixture.window.__sphrStartup.stage, 'route-ready');
});

test('project failure shows retry instead of rendering incomplete default content', async () => {
  const fixture = router('auto', async () => { throw new Error('Timed out'); });
  await fixture.initRoute();
  assert.deepEqual(fixture.calls, [['loading'],['load','auto'],['failed']]);
  assert.equal(fixture.window.__sphrStartup.stage, 'route-error');
});

test('requests time out and always clear their timer', async () => {
  let timeout, cleared = 0;
  const fixture = loader((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }), { setTimeout: (fn, ms) => { assert.equal(ms, 20000); timeout = fn; return 1; }, clearTimeout: id => { assert.equal(id, 1); cleared++; } });
  const pending = fixture.loadEditableProject('eqlz');
  timeout();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(cleared, 1);
});

test('new editor draft wins over an older pending response', async () => {
  const pending = deferred();
  const fixture = loader(() => pending.promise);
  const loading = fixture.loadEditableProject('eqlz');
  fixture.editableProjectData.eqlz = project('New draft');
  pending.resolve(response(project('Old server data')));
  assert.equal((await loading).title, 'New draft');
});

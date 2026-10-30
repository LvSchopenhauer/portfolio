const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const main = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
const startup = main.slice(main.indexOf('function revealPage()'), main.indexOf('const repeatRevealSelector'));

for (const readyState of ['loading', 'interactive', 'complete']) {
  test(`page becomes visible without a window load event (${readyState})`, () => {
    const classes = new Set();
    const domEvents = {};
    const windowEvents = {};
    const frames = [];
    let initialized = false;
    let reveals = 0;
    const context = {
      document: { readyState, body: { classList: { add: name => classes.add(name) } }, addEventListener: (event, fn) => { domEvents[event] = fn; } },
      window: { addEventListener: (event, fn) => { windowEvents[event] = fn; } },
      requestAnimationFrame: fn => frames.push(fn),
      showRepeatRevealsInsideViewport: () => { assert.ok(initialized); reveals++; }
    };
    vm.runInNewContext(startup, context);
    if (readyState === 'loading') {
      assert.equal(classes.has('loaded'), false);
      domEvents.DOMContentLoaded();
    }
    assert.ok(classes.has('loaded'), 'pending images/fonts must not keep the page invisible');
    assert.equal(reveals, 0, 'reveal measurements wait until module initialization finishes');
    initialized = true;
    frames.forEach(fn => fn());
    assert.equal(reveals, 1);
    windowEvents.load();
    assert.equal(reveals, 2, 'late media still refreshes reveal positions');
  });
}

test('initial HTML has no unused external Google font stylesheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
});

function guardFixture(loaded = false) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script id="startup-guard">([\s\S]*?)<\/script>/)[1];
  const classes = new Set(loaded ? ['loaded'] : []);
  const revealed = [];
  const covers = [];
  const handlers = {};
  let timeout;
  const window = { addEventListener: (name, fn) => { handlers[name] = fn; } };
  vm.runInNewContext(script, {
    window,
    location: { origin: 'https://sphr.top' },
    document: {
      body: { classList: { contains: name => classes.has(name), add: name => classes.add(name) } },
      querySelectorAll: selector => [0, 1].map(index => ({ classList: { add: name => (selector.includes('.thumb') ? covers : revealed).push([index, name]) } }))
    },
    setTimeout: (fn, ms) => { assert.equal(ms, 8000); timeout = fn; }
  });
  return { window, classes, revealed, covers, handlers, timeout };
}

test('failed or stalled module cannot keep static homepage content invisible', () => {
  const fixture = guardFixture();
  fixture.timeout();
  assert.ok(fixture.classes.has('loaded'));
  assert.equal(fixture.window.__sphrStartup.fallback, true);
  assert.deepEqual(fixture.revealed, [[0, 'visible'], [1, 'visible']]);
  assert.deepEqual(fixture.covers, [[0, 'is-cover-ready'], [1, 'is-cover-ready']]);
});

test('successful startup retains normal reveal effects without triggering fallback', () => {
  const fixture = guardFixture(true);
  fixture.timeout();
  assert.equal(fixture.window.__sphrStartup.fallback, false);
  assert.deepEqual(fixture.revealed, []);
});

test('startup errors are recorded locally with bounded messages and source paths', () => {
  const fixture = guardFixture();
  fixture.handlers.error({ message: 'SyntaxError', filename: 'https://sphr.top/js/main.js?v=example' });
  fixture.handlers.unhandledrejection({ reason: new Error('Initialization failed') });
  assert.equal(fixture.window.__sphrStartup.errors[0].source, '/js/main.js');
  assert.equal(fixture.window.__sphrStartup.errors[1].message, 'Initialization failed');
  for (let index = 0; index < 10; index++) fixture.handlers.error({ message: 'x'.repeat(500) });
  assert.equal(fixture.window.__sphrStartup.errors.length, 6);
  assert.equal(fixture.window.__sphrStartup.errors[5].message.length, 240);
});

test('optional third-party analytics failure does not count as application startup failure', () => {
  const fixture = guardFixture();
  fixture.handlers.error({ target: { tagName: 'SCRIPT', src: 'https://static.cloudflareinsights.com/beacon.min.js' } });
  assert.equal(fixture.window.__sphrStartup.errors.length, 0);
  assert.equal(fixture.window.__sphrStartup.warnings.length, 1);
  assert.equal(fixture.window.__sphrStartup.warnings[0].source, 'static.cloudflareinsights.com');
});

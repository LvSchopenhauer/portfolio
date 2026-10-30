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

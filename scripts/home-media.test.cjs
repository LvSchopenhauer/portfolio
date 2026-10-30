const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root,'js/main.js'),'utf8');
const source = main.slice(main.indexOf('const coverObserver ='),main.indexOf('function isTopEdgeInsideCurrentViewport'));
function fixture(rejectPlayback = false) {
  const images=[], timers=[], marked=[], unobserved=[], handlers={};
  let callback, loads=0, plays=0;
  const homeVideo = { poster: '/assets/hero-poster.jpg', load: () => { loads++; }, play: () => { plays++; return rejectPlayback ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }, addEventListener: (type, fn) => { handlers[type]=fn; } };
  const context = {
    homeVideo, homeVideoSource: { src:'', dataset:{src:'/assets/hero_new_compressed.mp4'} }, homePage:{hidden:false}, homePlay:{hidden:true,addEventListener:(type,fn)=>{handlers[type]=fn;}}, homePosterReady:undefined,
    document:{querySelectorAll:()=>[{classList:{add:name=>marked.push(name)}}]},
    IntersectionObserver: class { constructor(fn,options){callback=fn;assert.equal(options.rootMargin,'200px 0px');} observe(){} unobserve(node){unobserved.push(node);} },
    Image:class { constructor(){ images.push(this);this.complete=false;this.naturalWidth=0;} },
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;}, clearTimeout:()=>{}
  };
  const api=vm.runInNewContext(source+'; ({startHomeVideo,playHomeVideo})',context);
  return {...api,...context,images,timers,marked,unobserved,handlers,observe:entries=>callback(entries),counts:()=>({loads,plays})};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
test('cover requests begin only when approaching the viewport',()=>{
  const f=fixture();const node={classList:{add:name=>f.marked.push(name)}};
  assert.deepEqual(f.marked,[]);
  f.observe([{isIntersecting:false,target:node}]);assert.deepEqual(f.marked,[]);
  f.observe([{isIntersecting:true,target:node}]);assert.deepEqual(f.marked,['is-cover-ready']);assert.equal(f.unobserved.length,1);
});
test('poster is requested before the unchanged original video',async()=>{
  const f=fixture();f.startHomeVideo();
  assert.equal(f.images[0].src,'/assets/hero-poster.jpg');assert.equal(f.homeVideoSource.src,'');assert.equal(f.timers[0].ms,6000);
  f.images[0].onload();await flush();
  assert.equal(f.homeVideoSource.src,'/assets/hero_new_compressed.mp4');assert.deepEqual(f.counts(),{loads:1,plays:1});
});
test('navigation away cancels pending video start, and returning still works',async()=>{
  const f=fixture();f.startHomeVideo();f.homePage.hidden=true;f.images[0].onload();await flush();assert.equal(f.counts().loads,0);
  f.homePage.hidden=false;f.startHomeVideo();await flush();assert.deepEqual(f.counts(),{loads:1,plays:1});assert.equal(f.images.length,1);
});
test('poster timeout cannot prevent eventual video playback',async()=>{
  const f=fixture();f.startHomeVideo();f.timers[0].fn();await flush();assert.equal(f.counts().plays,1);
});
test('blocked autoplay exposes manual playback, and playing hides it',async()=>{
  const f=fixture(true);f.startHomeVideo();f.images[0].onload();await flush();assert.equal(f.homePlay.hidden,false);
  f.handlers.playing();assert.equal(f.homePlay.hidden,true);assert.equal(typeof f.handlers.click,'function');
});
test('production entry contains current styles and startup modules without separate critical requests',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.doesNotMatch(html,/<link rel="stylesheet"/);
  assert.doesNotMatch(html,/<script type="module" src=/);
  assert.ok(html.includes('data-inline-source="startup-modules"'));
  assert.ok(html.includes('function startHomeVideo()'));
  assert.ok(html.includes('cover_1.home.webp'));
  assert.doesNotMatch(html,/<meta name="robots" content="noindex,nofollow">/);
  assert.ok(html.includes('fetchpriority="high"'));
});

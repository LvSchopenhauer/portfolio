const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = path.resolve(root, option('--output', '.pages-build'));
const mediaSource = path.resolve(root, option('--media-source', '.pages-media/network-test/assets/films'));
const inside = file => file.startsWith(root + path.sep);
if (!inside(output) || output === root || !inside(mediaSource)) throw new Error('Build paths must stay inside the checkout');
const routes = ['eqlz', 'supernova', 'kolon', 'auto', 'helena', '361', 'info', 'origin', 'admin'];
const sources = ['index.html', 'assets/network-check.html', 'assets/startup-comparison.html',
  ...['css', 'js', 'data'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(name => /\.(css|js|json)$/.test(name)).map(name => `${dir}/${name}`))];
const assets = new Set();
for (const file of sources) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/(?:\/|\.\.\/)assets\/[^"'`<>\s)]+/g)) {
    const asset = match[0].replace(/^\.\.\//, '').replace(/^\//, '').split('?')[0];
    if (!asset.includes('${')) assets.add(asset);
  }
}
fs.mkdirSync(output, {recursive: true});
let bytes = 0, files = 0;
function copy(source, relative) {
  const resolved = fs.realpathSync(source);
  const target = path.resolve(output, relative);
  if (!inside(resolved) || !target.startsWith(output + path.sep) || !fs.statSync(resolved).isFile()) throw new Error(`Unsafe public file: ${relative}`);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  if (resolved !== target) fs.copyFileSync(resolved, target);
  const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (digest(resolved) !== digest(target)) throw new Error(`Copy mismatch: ${relative}`);
  bytes += fs.statSync(target).size; files++;
}
function write(relative, text) {
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, text); bytes += Buffer.byteLength(text); files++;
}
for (const file of [...sources, ...assets]) copy(path.join(root, file), file);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const route of routes) write(`${route}/index.html`, html);
write('404.html', html);
write('.nojekyll', '');
write('CNAME', 'sphr.top\n');
// Existing backup URLs redirect from github.io to this same custom-domain path.
for (const slug of routes.slice(0, 6)) copy(path.join(mediaSource, `${slug}.mp4`), `network-test/assets/films/${slug}.mp4`);
// Keep bookmarks to the earlier test site usable after attaching the domain.
for (const prefix of ['network-test', 'portfolio/network-test']) for (const route of ['', ...routes]) {
  const target = route ? `/${route}/` : '/';
  write(`${prefix}/${route ? route + '/' : ''}index.html`, `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><title>sphr</title><a href="${target}">打开作品集</a><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script>`);
}
if (bytes > 1024 ** 3) throw new Error('Published site exceeds the GitHub Pages size limit');
console.log(JSON.stringify({output: path.relative(root, output), files, bytes, routes: routes.length, mediaCopiesVerified: true}));

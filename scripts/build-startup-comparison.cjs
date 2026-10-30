const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let html = read('index.html');
for (const file of ['styles', 'typography']) {
  const tag = new RegExp(`<link rel="stylesheet" href="/css/${file}\\.css[^"\\s]*">`);
  if (!tag.test(html)) throw new Error(`Missing ${file} stylesheet entry`);
  const css = read(`css/${file}.css`).replace(/\.\.\/assets\//g, '/assets/').replace(/<\/style/gi, '<\\/style');
  html = html.replace(tag, () => `<style data-inline-source="css/${file}.css">\n${css}\n</style>`);
}
const modules = ['typography', 'block-spacing'].map(name => read(`js/${name}.js`).replace(/^export /gm, ''));
const main = read('js/main.js');
const imports = main.match(/^import \{[^}]+\} from ['"][^'"]+['"];\r?$/gm) || [];
if (imports.length !== 2) throw new Error('Update the comparison builder for changed startup dependencies');
const entry = main.replace(/^import \{[^}]+\} from ['"][^'"]+['"];\r?\n/gm, '');
const combined = [...modules, entry].join('\n\n');
// Dynamic editor imports stay lazy and are not part of public startup.
new vm.Script(combined);
const moduleTag = /<script type="module" src="\/js\/main\.js[^"\s]*"><\/script>/;
if (!moduleTag.test(html)) throw new Error('Missing main module entry');
html = html.replace(moduleTag, () => `<script type="module" data-inline-source="startup-modules">\n${combined.replace(/<\/script/gi, '<\\/script')}\n</script>`);
html = html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-entry-variant="single-document">');
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n    <meta name="robots" content="noindex,nofollow">');
const file = path.join(root, 'assets', 'startup-comparison.html');
fs.writeFileSync(file, html);
console.log(JSON.stringify({ file: 'assets/startup-comparison.html', bytes: Buffer.byteLength(html), startupScripts: 'inline', stylesheets: 'inline' }));

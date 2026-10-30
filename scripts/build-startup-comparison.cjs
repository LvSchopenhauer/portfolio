const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
function buildEntry(comparison = true) {
let html = read('templates/index.html');
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
if (comparison) html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n    <meta name="robots" content="noindex,nofollow">');
const relativeFile = comparison ? 'assets/startup-comparison.html' : 'index.html';
const file = path.join(root, relativeFile);
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
const result = { file: relativeFile, bytes: Buffer.byteLength(html), startupScripts: 'inline', stylesheets: 'inline' };
console.log(JSON.stringify(result));
return result;
}
module.exports = { buildEntry };
if (require.main === module) buildEntry(true);

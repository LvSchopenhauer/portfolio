const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const store = path.join(root, '.editor-test');
fs.mkdirSync(path.join(store, 'data'), { recursive: true });
for (const slug of ['eqlz', 'supernova', 'kolon', 'auto', 'helena', '361']) {
  const file = path.join(store, 'data', `${slug}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ client: slug === 'supernova' ? 'Adidas' : slug.toUpperCase(), title: `Editor test ${slug}`, copy: 'Test project background', secondary: 'Test 3D contribution', image: '/assets/covers/cover_2.png', video: '', blocks: [{ id: `${slug}-text`, type: 'text', content: 'Test production note', fontSize: 18, fontWeight: 400, size: 100, layout: 'full', ratio: 'auto' }] }, null, 2));
}
fs.writeFileSync(path.join(store, 'test.gif'), Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
const server = spawn(process.execPath, [path.join(root, 'server.js'), '4174'], { cwd: root, env: { ...process.env, PORTFOLIO_STORAGE_DIR: store }, stdio: 'inherit', windowsHide: true });
server.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => server.kill());

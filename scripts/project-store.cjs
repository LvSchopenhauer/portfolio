const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const SLUGS = new Set(['eqlz', 'supernova', 'kolon', 'auto', 'helena', '361']);
const RATIOS = new Set(['auto', '16 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16']);

class StoreError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function normalizeTypography(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StoreError(422, '文字排版格式无效。');
  const bound = (v, fallback, min, max) => v === '' || v == null || !Number.isFinite(Number(v)) ? fallback : Math.max(min, Math.min(max, Number(v)));
  const lineHeightUnit = value.lineHeightUnit === 'px' ? 'px' : '%';
  const letterSpacingUnit = value.letterSpacingUnit === '%' ? '%' : 'px';
  const weight = bound(value.cnWeight, 400, 200, 900);
  return {
    fontSize: bound(value.fontSize, 18, 12, 120),
    cnWeight: [200, 300, 400, 500, 700, 900].reduce((a,b) => Math.abs(a-weight) <= Math.abs(b-weight) ? a : b),
    enWeight: Math.round(bound(value.enWeight, 400, 100, 900) / 100) * 100,
    lineHeight: bound(value.lineHeight, 150, lineHeightUnit === '%' ? 80 : 8, 300), lineHeightUnit,
    letterSpacing: bound(value.letterSpacing, 0, letterSpacingUnit === '%' ? -10 : -3, letterSpacingUnit === '%' ? 50 : 20), letterSpacingUnit,
    align: ['left','center','right'].includes(value.align) ? value.align : 'center'
  };
}

function mediaUrl(value, { embed = false } = {}) {
  if (!value) return '';
  const text = String(value).trim().replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+(\/assets\/)/, '$1');
  if (text.startsWith('/assets/') && !text.includes('..') && !/[\\\u0000-\u001f]/.test(text)) return text;
  if (!embed && /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    if (embed && url.hostname !== 'player.vimeo.com') throw new Error();
    return url.href;
  } catch { throw new StoreError(422, embed ? '主影片请使用 Vimeo 嵌入地址。' : '素材地址无效，请使用本地素材或 HTTPS 地址。'); }
}

function normalizeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new StoreError(422, '项目格式无效。');
  for (const field of ['client', 'title', 'copy', 'secondary', 'image', 'video']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') throw new StoreError(422, `${field} 必须是文字。`);
  }
  if (!input.client?.trim() || !input.title?.trim()) throw new StoreError(422, '请填写品牌与项目名称。');
  if ((input.client.length > 160) || (input.title.length > 240) || (input.copy || '').length > 12000 || (input.secondary || '').length > 12000) throw new StoreError(422, '文字超过允许长度。');
  if (input.blocks !== undefined && !Array.isArray(input.blocks)) throw new StoreError(422, '内容区块格式无效。');
  if ((input.blocks || []).length > 200) throw new StoreError(422, '最多支持 200 个区块。');
  const ids = new Set();
  const result = {
    client: input.client.trim(), title: input.title.trim(),
    copy: input.copy || '', secondary: input.secondary || '', image: mediaUrl(input.image || ''),
    blocks: (input.blocks || []).map(block => {
      if (!block || !['text', 'image', 'video'].includes(block.type) || typeof block.content !== 'string') throw new StoreError(422, '区块类型或内容无效。');
      if (block.type === 'text' && block.content.length > 50000) throw new StoreError(422, '单个文字区块最多支持 50000 字符。');
      const id = String(block.id || randomUUID());
      if (ids.has(id)) throw new StoreError(422, '区块 ID 重复。');
      ids.add(id);
      const hasSpacing = block.spacingAfter !== undefined && block.spacingAfter !== null && block.spacingAfter !== '';
      if (hasSpacing && (!['number', 'string'].includes(typeof block.spacingAfter) || !Number.isFinite(Number(block.spacingAfter)))) throw new StoreError(422, '区块间距必须是数字。');
      const clamp = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));
      return {
        id, type: block.type,
        content: block.type === 'text' ? block.content.slice(0, 50000) : mediaUrl(block.content),
        size: clamp(block.size, 100, 50, 100), fontSize: clamp(block.fontSize, 24, 14, 72),
        fontWeight: clamp(block.fontWeight, 400, 300, 700),
        layout: block.layout === 'half' ? 'half' : 'full',
        ratio: RATIOS.has(block.ratio) ? block.ratio : '16 / 9',
        alt: String(block.alt || '').slice(0, 500), caption: String(block.caption || '').slice(0, 1000),
        ...(hasSpacing ? { spacingAfter: Math.round(clamp(block.spacingAfter, 0, 0, 400)) } : {}),
        ...(block.textStyle === 'custom' ? { textStyle: 'custom' } : {}),
        ...(block.type === 'text' && block.typography !== undefined ? { typography: normalizeTypography(block.typography) } : {}),
        ...(block.type === 'video' ? { controls: block.controls !== false, autoplay: block.autoplay !== false, loop: block.loop !== false } : {})
      };
    })
  };
  // Absence preserves the legacy built-in player; an explicit empty value hides it.
  if (Object.hasOwn(input, 'video')) result.video = mediaUrl(input.video, { embed: true });
  if (input.typography !== undefined) {
    if (!input.typography || typeof input.typography !== 'object' || Array.isArray(input.typography)) throw new StoreError(422, '项目排版格式无效。');
    result.typography = Object.fromEntries(['client', 'title', 'copy', 'secondary'].filter(key => Object.hasOwn(input.typography, key)).map(key => [key, normalizeTypography(input.typography[key])]));
  }
  return result;
}

function createProjectStore({ dataDir, historyDir, retain = 50 }) {
  const queues = new Map();
  const projectPath = slug => {
    if (!SLUGS.has(slug)) throw new StoreError(404, '项目不存在。');
    return path.join(dataDir, `${slug}.json`);
  };
  async function read(slug) {
    let raw;
    try { raw = await fs.readFile(projectPath(slug), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; raw = '{}'; }
    let data;
    try { data = JSON.parse(raw); } catch { throw new StoreError(500, '项目文件损坏，请从历史版本恢复。'); }
    return { data, revision: `"${createHash('sha256').update(raw).digest('hex')}"` };
  }
  async function list(slug) {
    projectPath(slug);
    const dir = path.join(historyDir, slug);
    let names;
    try { names = await fs.readdir(dir); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    return (await Promise.all(names.filter(n => /^[0-9T_Z.-]+_[a-f0-9-]+\.json$/.test(n)).sort().reverse().slice(0, retain).map(async id => {
      const stat = await fs.stat(path.join(dir, id));
      return { id, savedAt: stat.mtime.toISOString(), bytes: stat.size };
    })));
  }
  async function history(slug, id) {
    if (!(await list(slug)).some(item => item.id === id)) throw new StoreError(404, '历史版本不存在。');
    return JSON.parse(await fs.readFile(path.join(historyDir, slug, id), 'utf8'));
  }
  function save(slug, input, expectedRevision) {
    projectPath(slug);
    const data = normalizeProject(input);
    const previous = queues.get(slug) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      const current = await read(slug);
      if (!expectedRevision) throw new StoreError(428, '请刷新编辑器后再保存。');
      if (expectedRevision !== current.revision) throw new StoreError(409, '另一个窗口已更新此项目。你的草稿已保留，请先载入最新版本。');
      const json = `${JSON.stringify(data, null, 2)}\n`;
      await fs.mkdir(dataDir, { recursive: true });
      const dir = path.join(historyDir, slug);
      await fs.mkdir(dir, { recursive: true });
      if (Object.keys(current.data).length) {
        const id = `${new Date().toISOString().replace(/:/g, '-')}_${randomUUID()}.json`;
        await fs.writeFile(path.join(dir, id), `${JSON.stringify(current.data, null, 2)}\n`, { flag: 'wx' });
      }
      const temp = path.join(dataDir, `.${slug}-${randomUUID()}.tmp`);
      try {
        const handle = await fs.open(temp, 'wx');
        try { await handle.writeFile(json, 'utf8'); await handle.sync(); } finally { await handle.close(); }
        await fs.rename(temp, projectPath(slug));
      } catch (error) { await fs.unlink(temp).catch(() => {}); throw error; }
      // Only prune after a complete commit; stale history is safer than a failed save.
      const names = (await fs.readdir(dir)).filter(n => /^[0-9T_Z.-]+_[a-f0-9-]+\.json$/.test(n)).sort().reverse();
      await Promise.all(names.slice(retain).map(name => fs.unlink(path.join(dir, name)).catch(() => {})));
      return read(slug);
    });
    queues.set(slug, task);
    task.finally(() => { if (queues.get(slug) === task) queues.delete(slug); }).catch(() => {});
    return task;
  }
  return { read, save, list, history };
}

module.exports = { createProjectStore, normalizeProject, normalizeTypography, mediaUrl, StoreError };

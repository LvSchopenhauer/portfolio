import { CN_WEIGHTS, EN_WEIGHTS, normalizeTypography, typographyDefaults } from './typography.js';
import { normalizeBlockSpacing } from './block-spacing.js';

const LABELS = { eqlz: ['EQLZ', 'Multidimensional'], supernova: ['Adidas', 'Supernova'], kolon: ['KOLON', 'Move Alpha'], auto: ['Auto China', 'ID.CODE'], helena: ['Helena Rubinstein', 'Countdown Gift Box'], '361': ['361', 'Breathing underwater'] };
const PROJECT_ORDER = ['eqlz', 'supernova', 'kolon', 'auto', 'helena', '361'];
const clone = value => JSON.parse(JSON.stringify(value));
const stamp = date => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let instance;
let stylesheetReady;
let tabId;
try { tabId = sessionStorage.getItem('sphr.editor.tab') || crypto.randomUUID(); sessionStorage.setItem('sphr.editor.tab', tabId); }
catch { tabId = crypto.randomUUID(); }

function editableData(data, defaults = {}) {
  const project = { ...defaults, ...data };
  return {
    client: project.client || '', title: project.title || '', copy: project.copy || '', secondary: project.secondary || '',
    image: (project.image || '').replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+(\/assets\/)/, '$1'), video: project.video || '',
    ...(project.typography ? { typography: Object.fromEntries(Object.entries(project.typography).filter(([key]) => ['client','title','copy','secondary'].includes(key)).map(([key, value]) => [key, normalizeTypography(value)])) } : {}),
    blocks: (project.blocks || []).map(block => ({
      id: block.id || crypto.randomUUID(), type: block.type, content: block.content || '', size: Number(block.size) || 100,
      fontSize: Number(block.fontSize) || 24, fontWeight: Number(block.fontWeight) || 400,
      layout: block.layout === 'half' ? 'half' : 'full', ratio: block.ratio || '16 / 9', alt: block.alt || '', caption: block.caption || '',
      ...(normalizeBlockSpacing(block.spacingAfter) !== undefined ? { spacingAfter: normalizeBlockSpacing(block.spacingAfter) } : {}),
      ...(block.textStyle === 'custom' ? { textStyle: 'custom' } : {}),
      ...(block.type === 'text' && block.typography ? { typography: normalizeTypography(block.typography) } : {}),
      ...(block.type === 'video' ? { controls: block.controls === true, autoplay: block.autoplay !== false, loop: block.loop !== false } : {})
    }))
  };
}

// IndexedDB keeps larger legacy image drafts off localStorage's small quota.
const draftDB = new Promise((resolve, reject) => {
  const request = indexedDB.open('sphr-editor', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'slug' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
draftDB.catch(() => {});
async function draftStore(mode, key, value) {
  const db = await draftDB;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', mode === 'get' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore('drafts');
    const request = mode === 'put' ? store.put({ ...value, projectSlug: key, slug: `${key}:${tabId}` }) : store.getAll();
    let result;
    request.onsuccess = () => {
      if (mode === 'put') return;
      const matches = request.result.filter(item => item.projectSlug === key || item.slug === key);
      if (mode === 'get') {
        const candidates = matches.filter(item => !value || JSON.stringify(item.data) !== value);
        result = candidates.find(item => item.slug === `${key}:${tabId}`) || candidates.sort((a,b) => b.updatedAt - a.updatedAt)[0];
      } else {
        matches.filter(item => mode !== 'consume' && item.slug === `${key}:${tabId}` || typeof value === 'string' && JSON.stringify(item.data) === value || value?.discardKey === item.slug && JSON.stringify(item.data) === value.snapshot).forEach(item => store.delete(item.slug));
      }
    };
    transaction.oncomplete = () => resolve(mode === 'get' ? result : request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('草稿写入中断'));
  });
}

async function api(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('请使用本地启动器打开编辑器。');
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || '请求失败，请稍后重试。'); error.status = response.status; throw error; }
  return { data, revision: response.headers.get('etag') };
}

function field(label, name, value, { multiline = false, hint = '', max = 12000 } = {}) {
  return `<label class="ed-field"><span class="ed-field-label">${label}</span>${multiline
    ? `<textarea data-field="${name}" maxlength="${max}" rows="5">${esc(value)}</textarea>`
    : `<input data-field="${name}" value="${esc(value)}" maxlength="${max}">`}${hint ? `<small>${hint}</small>` : ''}</label>`;
}
function select(label, name, value, options) {
  if (!options.some(([v]) => String(v) === String(value))) options = [[value, `${value}${name === 'fontSize' ? ' px' : ''} · 自定义`], ...options];
  return `<label class="ed-field ed-field-small"><span class="ed-field-label">${label}</span><select data-block-field="${name}">${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
}
function defaultBlock(type) {
  return { id: crypto.randomUUID(), type, content: '', size: 100, fontSize: type === 'text' ? 18 : 24, fontWeight: 400, layout: 'full', ratio: type === 'image' ? 'auto' : '16 / 9', alt: '', caption: '', ...(type === 'text' ? { typography: typographyDefaults() } : {}), ...(type === 'video' ? { controls: true, autoplay: true, loop: true } : {}) };
}

function typographyControls(scope, value, defaults = typographyDefaults(), open = false) {
  const style = normalizeTypography(value || defaults);
  const options = (list, selected) => list.map(([v, label]) => `<option value="${v}"${String(v) === String(selected) ? ' selected' : ''}>${label}</option>`).join('');
  return `<details class="ed-typography" data-typography-scope="${scope}" ${open ? 'open' : ''}><summary>文字排版 <small>字号 · 行高 · 字间距</small></summary>
    <div class="ed-type-fonts"><label class="ed-field"><span class="ed-field-label">中文 · PingFang SC</span><select data-type-field="cnWeight">${options(CN_WEIGHTS, style.cnWeight)}</select></label><label class="ed-field"><span class="ed-field-label">英文 · SF Pro</span><select data-type-field="enWeight">${options(EN_WEIGHTS, style.enWeight)}</select></label></div>
    <div class="ed-type-metrics"><label class="ed-field"><span class="ed-field-label">字号</span><div class="ed-unit-input"><input type="number" min="12" max="120" step="1" data-type-field="fontSize" value="${style.fontSize}"><span>px</span></div></label>
    <label class="ed-field"><span class="ed-field-label">行高</span><div class="ed-unit-input"><input type="number" min="${style.lineHeightUnit === '%' ? 80 : 8}" max="300" step="0.01" data-type-field="lineHeight" value="${style.lineHeight}"><select data-type-field="lineHeightUnit" aria-label="行高单位">${options([['%','%'],['px','px']], style.lineHeightUnit)}</select></div></label>
    <label class="ed-field"><span class="ed-field-label">字间距</span><div class="ed-unit-input"><input type="number" min="${style.letterSpacingUnit === '%' ? -10 : -3}" max="${style.letterSpacingUnit === '%' ? 50 : 20}" step="0.01" data-type-field="letterSpacing" value="${style.letterSpacing}"><select data-type-field="letterSpacingUnit" aria-label="字间距单位">${options([['px','px'],['%','%']], style.letterSpacingUnit)}</select></div></label></div>
    <div class="ed-type-bottom"><label>对齐 <select data-type-field="align" aria-label="文字对齐">${options([['left','左对齐'],['center','居中'],['right','右对齐']], style.align)}</select></label><button type="button" data-type-reset>重置排版</button></div><p class="ed-type-hint">同一段中英文自动匹配字体，字重可分别调整。</p></details>`;
}
function normalizeVideo(value) {
  if (!value.trim()) return '';
  let text = value.trim();
  const iframe = text.match(/^<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*<\/iframe>$/i);
  if (iframe) text = iframe[2].replaceAll('&amp;', '&');
  if (/^BV[A-Za-z0-9]{10}$/.test(text)) text = `https://player.bilibili.com/player.html?bvid=${text}`;
  const url = new URL(text.startsWith('//') ? `https:${text}` : text);
  if (url.protocol !== 'https:') throw new Error('影片地址需要使用 HTTPS。');
  if (url.username || url.password) throw new Error('影片地址不能包含账号信息。');
  if (['player.bilibili.com', 'www.bilibili.com', 'bilibili.com'].includes(url.hostname)) {
    const bvid = url.hostname === 'player.bilibili.com' && url.pathname === '/portfolio/network-test/player.html'
      ? url.searchParams.get('bvid') : url.pathname.match(/^\/video\/(BV[A-Za-z0-9]{10})\/?$/)?.[1];
    const page = url.searchParams.get('p') || url.searchParams.get('page') || '1';
    if (/^BV[A-Za-z0-9]{10}$/.test(bvid || '') && /^[1-9]\d*$/.test(page)) {
      const player = new URL('https://player.bilibili.com/player.html');
      player.searchParams.set('bvid', bvid);
      player.searchParams.set('p', page);
      player.searchParams.set('autoplay', '0');
      player.searchParams.set('danmaku', '0');
      return player.href;
    }
  }
  if (url.hostname === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname)) return url.href;
  if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname)) {
    const parts = url.pathname.split('/portfolio/network-test/').filter(Boolean);
    if (/^\d+$/.test(parts[0])) {
      const player = new URL(`https://player.vimeo.com/video/${parts[0]}`);
      const hash = parts[1] || url.searchParams.get('h');
      if (hash) player.searchParams.set('h', hash);
      return player.href;
    }
  }
  throw new Error('请填写有效的 Vimeo 或哔哩哔哩影片地址、BV 号或嵌入代码。');
}

class PortfolioEditor {
  constructor(root, options) {
    this.root = root; this.defaults = options.projects;
    this.slug = ''; this.data = null; this.baseline = ''; this.revision = '';
    this.busy = false; this.saving = false; this.loading = false; this.draftSafe = true;
    this.history = []; this.historyIndex = 0; this.viewport = 1440;
    this.draftQueue = Promise.resolve(); this.previewReady = false;
    this.build(); this.bind();
  }
  build() {
    this.root.innerHTML = `
      <div class="ed-topbar">
        <a class="ed-brand" href="/portfolio/network-test/" target="_blank" rel="noopener">sphr<span>作品编辑器</span></a>
        <div class="ed-save-state" role="status" aria-live="polite" data-save-state>正在连接…</div>
        <div class="ed-top-actions"><button data-action="undo" title="撤销上一步">撤销</button><button data-action="redo" title="重做上一步">重做</button><button data-action="history">历史版本</button><button class="ed-primary" data-action="save">保存项目 <kbd>Ctrl S</kbd></button></div>
      </div>
      <aside class="ed-sidebar" aria-label="作品列表">
        <p class="ed-eyebrow">WORKSPACE</p><h1>我的作品</h1>
        <nav data-project-list>${PROJECT_ORDER.map((slug, i) => `<button class="ed-project" data-project="${slug}"><span class="ed-project-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${LABELS[slug][0]}</strong><small>${LABELS[slug][1]}</small></span><i data-draft-dot="${slug}" aria-label="有未保存草稿" hidden></i></button>`).join('')}</nav>
        <div class="ed-sidebar-foot"><span class="ed-local-dot"></span>本地工作区<p>自动保留草稿。保存后更新本地网页，线上版本需另行发布。</p><button data-action="export">导出项目 JSON</button><button data-action="import">导入项目 JSON</button><input type="file" accept=".json,application/json" data-import hidden></div>
      </aside>
      <section class="ed-workspace" aria-label="项目编辑区">
        <header class="ed-workspace-heading"><div><p class="ed-eyebrow">PROJECT CONTENT</p><h2 data-project-heading>载入中</h2></div><a class="ed-view-link" data-view-link target="_blank" rel="noopener">查看作品 ↗</a></header>
        <div class="ed-banner" data-banner role="status" hidden></div>
        <div class="ed-columns">
          <div class="ed-content" data-content><p>正在读取项目…</p></div>
          <aside class="ed-preview" aria-label="实时页面预览"><div class="ed-preview-toolbar"><strong>实时预览</strong><div class="ed-preview-actions"><div role="group" aria-label="预览尺寸"><button class="is-active" data-viewport="1440" aria-pressed="true">桌面</button><button data-viewport="768" aria-pressed="false">平板</button><button data-viewport="390" aria-pressed="false">手机</button></div><button data-preview-expand aria-expanded="false">展开预览</button></div></div><p class="ed-preview-note">预览当前草稿 · 字号以桌面为基准，窄屏自动适配 · 保存后更新本地作品页</p><div class="ed-preview-stage"><div class="ed-preview-surface"><iframe title="作品实时预览" data-preview></iframe></div></div><p class="ed-preview-size" data-preview-size></p></aside>
        </div>
      </section>
      <dialog class="ed-dialog" data-dialog aria-labelledby="ed-dialog-title"><div data-dialog-body></div></dialog>
      <div class="ed-toast" data-toast role="status" aria-live="polite" hidden></div>`;
    this.content = this.root.querySelector('[data-content]');
    this.frame = this.root.querySelector('[data-preview]');
    this.resizeObserver = new ResizeObserver(() => this.resizePreview());
    this.resizeObserver.observe(this.root.querySelector('.ed-preview-stage'));
  }
  get dirty() { return this.data && JSON.stringify(this.data) !== this.baseline; }
  toast(text, error = false) {
    const node = this.root.querySelector('[data-toast]'); node.textContent = text; node.hidden = false; node.classList.toggle('is-error', error);
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { node.hidden = true; }, error ? 9000 : 4500);
  }
  banner(text = '', action = false) {
    const node = this.root.querySelector('[data-banner]'); node.hidden = !text;
    node.replaceChildren(document.createTextNode(text));
    if (action) { const button = document.createElement('button'); button.textContent = '载入最新保存版'; button.dataset.action = 'reload'; node.append(button); }
  }
  updateStatus() {
    const status = this.root.querySelector('[data-save-state]');
    status.textContent = this.loading ? '正在读取项目…' : !this.data ? '无法读取项目' : !this.writable ? '只读模式 · 需要本地服务器' : this.busy ? '素材处理中…' : this.saving ? '正在保存…' : this.dirty ? (this.draftSafe ? '有未保存修改 · 草稿已保护' : '有未保存修改 · 正在保护草稿…') : '已保存到本地';
    status.dataset.state = this.dirty ? 'dirty' : 'saved';
    this.root.querySelector('[data-action="save"]').disabled = this.busy || this.saving || this.loading || !this.data || !this.writable;
    this.root.querySelector('[data-action="undo"]').disabled = this.busy || this.loading || this.historyIndex <= 0;
    this.root.querySelector('[data-action="redo"]').disabled = this.busy || this.loading || this.historyIndex >= this.history.length - 1;
    this.root.querySelectorAll('[data-project]').forEach(button => { button.disabled = this.busy || this.saving || this.loading; });
    this.root.querySelector(`[data-draft-dot="${this.slug}"]`)?.toggleAttribute('hidden', !this.dirty);
    this.content.inert = this.busy || this.loading;
  }
  queueDraft() {
    if (!this.data) return Promise.resolve();
    clearTimeout(this.draftTimer);
    const slug = this.slug, data = clone(this.data), baseRevision = this.revision;
    const snapshot = JSON.stringify(data), dirty = snapshot !== this.baseline;
    this.draftQueue = this.draftQueue.catch(() => {}).then(() => dirty
      ? draftStore('put', slug, { slug, data, baseRevision, updatedAt: Date.now() })
      : draftStore('delete', slug, snapshot));
    return this.draftQueue.then(() => {
      if (this.slug === slug && JSON.stringify(this.data) === snapshot) { this.draftSafe = true; this.updateStatus(); }
    }).catch(error => { this.draftSafe = false; this.updateStatus(); this.toast('浏览器未能保存草稿，请立即保存项目或导出 JSON。', true); throw error; });
  }
  changed(group = '') {
    this.draftSafe = false;
    const snapshot = JSON.stringify(this.data), now = Date.now();
    if (snapshot !== this.history[this.historyIndex]) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      if (group && this.lastGroup === group && now - this.lastChange < 600 && this.historyIndex > 0) this.history[this.historyIndex] = snapshot;
      else { this.history.push(snapshot); if (this.history.length > 30) this.history.shift(); this.historyIndex = this.history.length - 1; }
    }
    this.lastGroup = group; this.lastChange = now;
    clearTimeout(this.draftTimer); this.draftTimer = setTimeout(() => this.queueDraft().catch(() => {}), 500);
    this.updateStatus(); this.schedulePreview();
  }
  async open(slug) {
    if (!(slug in LABELS) || this.busy || this.saving || this.loading) return;
    this.loading = true; this.updateStatus();
    if (this.data) {
      try { await this.queueDraft(); } catch { if (!(await this.confirm('草稿尚未保存', '浏览器草稿写入失败。请先保存项目或导出 JSON，继续切换会丢失未保存修改。', '仍然切换'))) { this.loading = false; this.updateStatus(); return; } }
    }
    this.loading = true; this.updateStatus();
    try {
      const result = await api(`/portfolio/network-test/api/projects/${slug}`);
      if (!result.revision) throw new Error('本地服务器需要重新启动后才能使用新版编辑器。');
      this.slug = slug; this.revision = result.revision;
      this.data = editableData(result.data, this.defaults[slug]);
      this.baseline = JSON.stringify(this.data); this.banner();
      let draft;
      try { draft = await draftStore('get', slug, this.baseline); } catch { this.toast('自动草稿不可用，请及时保存或导出项目。', true); }
      this.recoveredDraftKey = null;
      if (draft?.data && JSON.stringify(draft.data) !== this.baseline) {
        this.data = editableData(draft.data, this.defaults[slug]);
        this.recoveredDraftKey = draft.slug;
        this.recoveredDraftSnapshot = JSON.stringify(draft.data);
        this.revision = draft.baseRevision || result.revision;
        this.banner(draft.baseRevision !== result.revision ? '已恢复草稿，但项目保存版已在其他窗口更新。请先导出草稿并载入最新版本。' : `已恢复 ${stamp(draft.updatedAt)} 的未保存草稿。`, true);
      }
      this.draftSafe = true; this.history = [JSON.stringify(this.data)]; this.historyIndex = 0;
      this.root.querySelectorAll('[data-project]').forEach(button => { button.classList.toggle('is-active', button.dataset.project === slug); button.setAttribute('aria-current', button.dataset.project === slug ? 'page' : 'false'); });
      this.root.querySelector('[data-project-heading]').textContent = LABELS[slug][1];
      this.root.querySelector('[data-view-link]').href = `/portfolio/network-test/${slug}`;
      history.replaceState(null, '', `/portfolio/network-test/admin?project=${slug}`);
      this.renderContent(); this.previewReady = false; this.frame.src = `/portfolio/network-test/${slug}?editor-preview=1`;
      if (this.dirty) await this.queueDraft().catch(() => {});
      this.refreshDraftDots();
    } catch (error) { this.toast(error.message, true); this.banner(error.message); }
    finally { this.loading = false; this.updateStatus(); }
  }
  async refreshDraftDots() {
    for (const slug of PROJECT_ORDER) {
      try { const draft = await draftStore('get', slug); this.root.querySelector(`[data-draft-dot="${slug}"]`).hidden = slug === this.slug ? !this.dirty : !draft; } catch { /* Status already describes draft limitations. */ }
    }
  }
  renderContent() {
    this.content.innerHTML = `<section class="ed-card"><div class="ed-section-title"><h3>项目介绍</h3><span>01</span></div><div class="ed-field-pair">${field('品牌 / 客户', 'client', this.data.client, { max: 160 })}${field('项目名称', 'title', this.data.title, { max: 240 })}</div>${field('项目背景', 'copy', this.data.copy, { multiline: true, hint: '介绍项目背景、产品与视觉方向。' })}${typographyControls('copy', this.data.typography?.copy)}${field('我的参与', 'secondary', this.data.secondary, { multiline: true, hint: '说明你的制作内容与贡献，也可以用于第二段项目介绍。' })}${typographyControls('secondary', this.data.typography?.secondary)}</section>
      <section class="ed-card"><div class="ed-section-title"><h3>封面与主影片</h3><span>02</span></div><div class="ed-cover" data-drop-cover><img src="${esc(this.data.image)}" alt="当前项目封面"><label class="ed-upload-button">更换封面<input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" data-cover-upload></label></div><p class="ed-help">拖入图片更换封面。支持 JPG、PNG、WebP、AVIF 和 GIF。</p>${field('主影片 · Vimeo / 哔哩哔哩', 'video', this.data.video || '', { hint: '可粘贴影片链接、B 站 BV 号或 iframe 嵌入代码。留空将隐藏主播放器。' })}</section>
      <section class="ed-card ed-blocks-section"><div class="ed-section-title"><h3>内容区块 <small data-block-count>${this.data.blocks.length}</small></h3><span>03</span></div><p class="ed-help">按展示顺序排列。使用上下移动，或拖动区块顶部的排序手柄。</p><div class="ed-block-list" data-block-list></div><div class="ed-add-bar"><button data-add="text">＋ 文字</button><button data-add="image">＋ 图片</button><button data-add="video">＋ 视频</button></div><div class="ed-dropzone" data-drop-files tabindex="0" role="button" aria-label="批量上传图片和视频">将图片或视频拖到这里，或点击批量添加<input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,video/*" multiple data-multi-upload hidden></div></section>
      <div class="ed-content-footer"><span>草稿自动保护，保存后写入本地项目。</span><button data-action="reload">恢复到最新保存版</button></div>`;
    this.renderBlocks();
  }
  renderBlocks(focusId = '') {
    const list = this.root.querySelector('[data-block-list]');
    list.innerHTML = this.data.blocks.map((block, index) => {
      const type = { text: '文字', image: '图片', video: '视频' }[block.type];
      let body;
      if (block.type === 'text') {
        body = `<label class="ed-field"><span class="sr-only">文字内容</span><textarea data-block-field="content" rows="5" maxlength="50000" placeholder="输入作品说明或章节标题…">${esc(block.content)}</textarea></label>${typographyControls('block', block.typography, this.blockTypographyDefaults(block), true)}`;
      } else {
        body = `<div class="ed-media-preview">${block.content ? block.type === 'image' ? `<img src="${esc(block.content)}" alt="${esc(block.alt || '')}" loading="lazy">` : `<video src="${esc(block.content)}" controls muted playsinline preload="metadata"></video>` : `<span>添加${type}素材</span>`}</div><label class="ed-upload-button ed-upload-inline">${block.content ? '替换素材' : '选择文件'}<input type="file" data-media-upload accept="${block.type === 'image' ? 'image/png,image/jpeg,image/webp,image/avif,image/gif' : 'video/*,image/gif'}"></label><details class="ed-block-settings"><summary>版式与素材说明</summary><div class="ed-field-pair">${select('排列', 'layout', block.layout || 'full', [['full','独占一行'],['half','半行并排']])}${select('画面比例', 'ratio', block.ratio || '16 / 9', [['auto','原始比例'],['16 / 9','16:9'],['4 / 3','4:3'],['1 / 1','1:1'],['3 / 4','3:4'],['9 / 16','9:16']])}</div><label class="ed-field"><span class="ed-field-label">显示宽度 <output>${block.size || 100}%</output></span><input type="range" min="50" max="100" step="1" value="${block.size || 100}" data-block-field="size"></label><label class="ed-field"><span class="ed-field-label">${block.type === 'image' ? '替代文字 · 描述画面' : '视频说明'}</span><input data-block-field="alt" maxlength="500" value="${esc(block.alt || '')}"></label><label class="ed-field"><span class="ed-field-label">画面下方说明（可选）</span><input data-block-field="caption" maxlength="1000" value="${esc(block.caption || '')}"></label>${block.type === 'video' ? `<div class="ed-checkboxes">${[['controls','显示播放控制'],['autoplay','静音自动播放'],['loop','循环播放']].map(([key,label]) => `<label><input type="checkbox" data-block-field="${key}" ${block[key] !== false ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}</details>`;
      }
      const spacing = `<label class="ed-field ed-spacing"><span class="ed-field-label">与下一区块的距离 · px</span><input type="number" min="0" max="400" step="1" data-block-field="spacingAfter" value="${block.spacingAfter ?? ''}" placeholder="默认间距"><small>留空恢复默认；并排素材共用行距，分别设置时取较大值。</small></label>`;
      return `<article class="ed-block" data-block-id="${esc(block.id)}"><div class="ed-block-header"><button class="ed-drag-handle" draggable="true" aria-label="拖动排序${type}区块 ${index + 1}" title="拖动排序">⋮⋮</button><strong>${String(index + 1).padStart(2,'0')} <span>${type}</span></strong><div class="ed-block-actions"><button data-block-action="up" aria-label="上移区块 ${index + 1}" ${index === 0 ? 'disabled' : ''}>上移</button><button data-block-action="down" aria-label="下移区块 ${index + 1}" ${index === this.data.blocks.length - 1 ? 'disabled' : ''}>下移</button><button data-block-action="duplicate" aria-label="复制区块 ${index + 1}">复制</button><button data-block-action="remove" aria-label="移除区块 ${index + 1}">移除</button></div></div>${body}${spacing}</article>`;
    }).join('') || '<div class="ed-empty">还没有内容区块，从下方添加文字或素材。</div>';
    this.root.querySelector('[data-block-count]').textContent = this.data.blocks.length;
    if (focusId) list.querySelector(`[data-block-id="${CSS.escape(focusId)}"] textarea`)?.focus();
  }
  schedulePreview() {
    clearTimeout(this.previewTimer); this.previewTimer = setTimeout(() => this.sendPreview(), 300);
  }
  blockTypographyDefaults(block) {
    return typographyDefaults(block.textStyle === 'custom' ? block.fontSize : block.fontSize >= 24 ? 40 : 18, block.fontWeight || 400, block.fontSize >= 24);
  }
  typographyTarget(panel) {
    if (panel.dataset.typographyScope === 'block') return this.data.blocks.find(block => block.id === panel.closest('[data-block-id]').dataset.blockId);
    return this.data;
  }
  changeTypography(input) {
    const panel = input.closest('[data-typography-scope]'), scope = panel.dataset.typographyScope;
    const target = this.typographyTarget(panel);
    const defaults = scope === 'block' ? this.blockTypographyDefaults(target) : typographyDefaults();
    const style = normalizeTypography(scope === 'block' ? target.typography || defaults : target.typography?.[scope] || defaults);
    const key = input.dataset.typeField;
    const size = style.fontSize;
    if (key === 'lineHeightUnit' && input.value !== style.lineHeightUnit) style.lineHeight = Math.round((input.value === 'px' ? style.lineHeight * size / 100 : style.lineHeight / size * 100) * 100) / 100;
    if (key === 'letterSpacingUnit' && input.value !== style.letterSpacingUnit) style.letterSpacing = Math.round((input.value === '%' ? style.letterSpacing / size * 100 : style.letterSpacing * size / 100) * 100) / 100;
    style[key] = ['lineHeightUnit','letterSpacingUnit','align'].includes(key) ? input.value : Number(input.value);
    const normalized = normalizeTypography(style);
    if (scope === 'block') target.typography = normalized;
    else { target.typography ||= {}; target.typography[scope] = normalized; }
    for (const field of ['lineHeight','letterSpacing']) {
      const control = panel.querySelector(`[data-type-field="${field}"]`);
      const percent = normalized[`${field}Unit`] === '%';
      control.min = field === 'lineHeight' ? percent ? 80 : 8 : percent ? -10 : -3;
      control.max = field === 'lineHeight' ? 300 : percent ? 50 : 20;
      if (key.endsWith('Unit')) control.value = normalized[field];
    }
    this.changed(`type:${scope}:${key}`);
  }
  sendPreview() {
    if (this.data && this.previewReady) this.frame.contentWindow.postMessage({ type: 'sphr:editor-preview', slug: this.slug, project: this.data }, location.origin);
  }
  resizePreview() {
    const stage = this.root.querySelector('.ed-preview-stage'); if (!stage.clientWidth) return;
    const style = getComputedStyle(stage);
    const available = Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const height = Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const scale = Math.min(1, available / this.viewport);
    const surface = this.root.querySelector('.ed-preview-surface');
    surface.style.width = `${this.viewport * scale}px`;
    this.frame.style.width = `${this.viewport}px`; this.frame.style.height = `${Math.ceil(height / scale)}px`;
    this.frame.style.transform = `scale(${scale})`;
    this.root.querySelector('[data-preview-size]').textContent = `${this.viewport} px · ${Math.round(scale * 100)}% · 可滚动查看整页`;
  }
  expandPreview(expanded) {
    this.root.querySelector('.ed-preview').classList.toggle('is-expanded', expanded);
    const button = this.root.querySelector('[data-preview-expand]');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? '收起预览' : '展开预览';
    this.resizePreview();
  }
  validate() {
    if (!this.data.client.trim() || !this.data.title.trim()) throw new Error('请填写品牌与项目名称。');
    this.data.video = normalizeVideo(this.data.video || '');
    if (this.data.blocks.some(block => !block.content.trim())) throw new Error('有空白区块，请填写内容、上传素材或移除后再保存。');
  }
  async save() {
    if (this.busy || this.saving || this.loading || !this.writable) return;
    try { this.validate(); } catch (error) { this.toast(error.message, true); return; }
    this.saving = true; this.updateStatus();
    const sent = clone(this.data), snapshot = JSON.stringify(sent), slug = this.slug;
    try {
      await this.queueDraft().catch(() => {});
      const result = await api(`/portfolio/network-test/api/projects/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'If-Match': this.revision }, body: JSON.stringify(sent) });
      this.revision = result.revision;
      const canonical = editableData(result.data, this.defaults[slug]);
      this.baseline = JSON.stringify(canonical);
      if (JSON.stringify(this.data) === snapshot) this.data = canonical;
      if (this.recoveredDraftKey) await draftStore('consume', slug, { discardKey: this.recoveredDraftKey, snapshot: this.recoveredDraftSnapshot }).catch(() => {});
      this.recoveredDraftKey = null;
      await this.queueDraft().catch(() => {});
      this.banner(); this.toast('项目已保存，历史版本已备份。');
      this.sendPreview();
      window.dispatchEvent(new CustomEvent('sphr:project-saved', { detail: { slug, data: result.data } }));
    } catch (error) {
      if (error.status === 409) this.banner('保存冲突：另一个窗口已更新此项目。当前草稿已保留，可导出后载入最新版本。', true);
      this.toast(error.message, true);
    } finally { this.saving = false; this.updateStatus(); }
  }
  download(data = this.data, suffix = '') {
    const blob = new Blob([JSON.stringify({ format: 'sphr-project', version: 1, project: data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${this.slug}${suffix}-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  confirm(title, body, label = '继续') {
    const dialog = this.root.querySelector('[data-dialog]');
    dialog.querySelector('[data-dialog-body]').innerHTML = `<p class="ed-eyebrow">CONFIRM</p><h2 id="ed-dialog-title">${esc(title)}</h2><p>${esc(body)}</p><div class="ed-dialog-actions"><button data-dialog-cancel autofocus>取消</button><button class="ed-primary" data-dialog-confirm>${esc(label)}</button></div>`;
    return new Promise(resolve => {
      const finish = result => { dialog.close(); dialog.removeEventListener('cancel', cancel); resolve(result); };
      const cancel = event => { event.preventDefault(); finish(false); };
      dialog.addEventListener('cancel', cancel);
      dialog.querySelector('[data-dialog-cancel]').onclick = () => finish(false);
      dialog.querySelector('[data-dialog-confirm]').onclick = () => finish(true);
      dialog.showModal();
    });
  }
  async reload() {
    if (this.busy || this.saving || this.loading) return;
    if (this.dirty && !(await this.confirm('恢复到最新保存版？', '当前草稿将被替换。建议先导出项目 JSON，以便保留这次修改。', '恢复保存版'))) return;
    try {
      clearTimeout(this.draftTimer); await this.draftQueue.catch(() => {}); await draftStore('delete', this.slug, { discardKey: this.recoveredDraftKey, snapshot: this.recoveredDraftSnapshot });
      const slug = this.slug; this.data = null; await this.open(slug);
    } catch (error) { this.toast(error.message, true); }
  }
  async showHistory() {
    if (this.busy || this.saving || this.loading) return;
    const targetSlug = this.slug;
    try {
      const { data } = await api(`/portfolio/network-test/api/projects/${targetSlug}/history`);
      if (this.slug !== targetSlug) return;
      const dialog = this.root.querySelector('[data-dialog]');
      dialog.querySelector('[data-dialog-body]').innerHTML = `<p class="ed-eyebrow">VERSION HISTORY</p><h2 id="ed-dialog-title">历史版本</h2><p>每次保存会保留之前的版本，最多 50 份。选择版本后先作为草稿预览，点击保存才会替换当前项目。</p><div class="ed-version-list">${data.length ? data.map(item => `<button data-version="${esc(item.id)}"><strong>${stamp(item.savedAt)}</strong><span>${Math.round(item.bytes / 1024)} KB · 载入为草稿</span></button>`).join('') : '<p class="ed-empty">暂无历史版本。完成一次保存后会自动建立。</p>'}</div><div class="ed-dialog-actions"><button data-close-history>关闭</button></div>`;
      dialog.querySelector('[data-close-history]').onclick = () => dialog.close();
      dialog.querySelectorAll('[data-version]').forEach(button => {
        button.onclick = async () => {
          button.disabled = true;
          try {
            const version = await api(`/portfolio/network-test/api/projects/${targetSlug}/history/${encodeURIComponent(button.dataset.version)}`);
            if (this.slug !== targetSlug) return;
            dialog.close();
            if (this.dirty && !(await this.confirm('替换当前草稿？', '载入历史版本会替换正在编辑的内容。当前保存文件不会立即改变，请先导出需要保留的草稿。', '载入为草稿'))) return;
            this.data = editableData(version.data, this.defaults[this.slug]);
            this.renderContent(); this.changed(); await this.queueDraft().catch(() => {}); this.banner('历史版本已载入草稿。检查预览后，点击保存项目应用。');
          } catch (error) { this.toast(error.message, true); } finally { button.disabled = false; }
        };
      });
      dialog.showModal();
    } catch (error) { this.toast(error.message, true); }
  }
  async importFile(file) {
    if (!file || this.busy || this.saving || this.loading) return;
    const targetSlug = this.slug;
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('项目 JSON 请控制在 12 MB 以内。');
      const input = JSON.parse(await file.text());
      if (this.slug !== targetSlug) throw new Error('项目已切换，请在目标项目中重新导入。');
      if (input.format && (input.format !== 'sphr-project' || input.version !== 1)) throw new Error('不支持此项目文件版本。');
      const data = input.project || input;
      if (!data || typeof data !== 'object' || !['client','title','copy','secondary','image'].every(key => typeof data[key] === 'string') || !data.client.trim() || !data.title.trim() || !Array.isArray(data.blocks) || data.blocks.length > 200) throw new Error('项目结构无效，当前内容未改变。');
      const ids = new Set();
      const safeMedia = value => value === '' || (typeof value === 'string' && (/^\/assets\//.test(value) && !value.includes('..') || /^https:\/\//.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)));
      if (!safeMedia(data.image) || data.blocks.some(block => !block || !['text','image','video'].includes(block.type) || typeof block.content !== 'string' || block.type !== 'text' && !safeMedia(block.content))) throw new Error('素材地址或区块格式无效，当前内容未改变。');
      for (const block of data.blocks) { if (!block.id) block.id = crypto.randomUUID(); if (ids.has(block.id)) throw new Error('文件包含重复区块 ID。'); ids.add(block.id); }
      if (Object.hasOwn(data, 'video')) data.video = normalizeVideo(data.video);
      if (!(await this.confirm('导入项目内容？', '导入后将替换当前草稿，保存前不会改变项目文件。', '导入为草稿'))) return;
      this.data = editableData(clone(data), this.defaults[this.slug]);
      this.renderContent(); this.changed(); await this.queueDraft().catch(() => {}); this.banner('导入完成，请检查文字、素材与预览，然后保存。');
    } catch (error) { this.toast(error instanceof SyntaxError ? '无法解析 JSON，当前内容未改变。' : error.message, true); }
  }
  async upload(file, type) {
    if (!file.size) throw new Error('文件为空。');
    if (file.size > (type === 'image' ? 120 : 260) * 1024 * 1024) throw new Error(type === 'image' ? '图片不能超过 120 MB。' : '视频不能超过 260 MB。');
    const extensions = type === 'image' ? /\.(jpe?g|png|webp|avif|gif)$/i : /\.(mp4|webm|mov|m4v|gif)$/i;
    if (!extensions.test(file.name)) throw new Error('不支持此文件类型。');
    this.toast(type === 'video' ? '正在上传视频，必要时自动转码，请稍候…' : '正在上传图片…');
    const { data } = await api(`/portfolio/network-test/api/uploads/${type}`, { method: 'POST', headers: { 'Content-Type': file.type || (type === 'image' ? 'image/png' : 'video/mp4'), 'X-File-Name': encodeURIComponent(file.name) }, body: file });
    return data.url;
  }
  async handleFiles(files, { cover = false, blockId = '' } = {}) {
    if (this.busy || this.saving || this.loading || !this.writable) return;
    const selection = [...files]; if (!selection.length) return;
    this.busy = true; this.updateStatus();
    try {
      for (const file of selection.slice(0, cover || blockId ? 1 : 200 - this.data.blocks.length)) {
        const block = blockId ? this.data.blocks.find(b => b.id === blockId) : null;
        const type = cover ? 'image' : block?.type || (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name) ? 'video' : 'image');
        const url = await this.upload(file, type);
        if (cover) this.data.image = url;
        else if (block) block.content = url;
        else this.data.blocks.push({ ...defaultBlock(type), content: url });
        this.changed(); await this.queueDraft().catch(() => {});
      }
      this.toast('素材已添加，点击保存项目应用。');
    } catch (error) { this.toast(error.message, true); }
    finally { this.busy = false; this.renderContent(); this.updateStatus(); this.sendPreview(); }
  }
  bind() {
    this.root.addEventListener('input', event => {
      if (!this.data || this.loading || this.busy) return;
      if (event.target.dataset.typeField) { if (event.target.value !== '') this.changeTypography(event.target); return; }
      const field = event.target.dataset.field, blockField = event.target.dataset.blockField;
      if (field) { this.data[field] = event.target.value; this.changed(field); }
      if (blockField) {
        const id = event.target.closest('[data-block-id]').dataset.blockId;
        const block = this.data.blocks.find(b => b.id === id);
        if (blockField === 'spacingAfter') {
          const spacing = normalizeBlockSpacing(event.target.value);
          if (spacing === undefined) delete block.spacingAfter;
          else { block.spacingAfter = spacing; event.target.value = spacing; }
          this.changed(`${id}:${blockField}`); return;
        }
        block[blockField] = event.target.type === 'checkbox' ? event.target.checked : ['fontSize','fontWeight','size'].includes(blockField) ? Number(event.target.value) : event.target.value;
        if (blockField === 'fontSize' || blockField === 'fontWeight') block.textStyle = 'custom';
        if (blockField === 'size') event.target.closest('label').querySelector('output').textContent = `${event.target.value}%`;
        this.changed(`${id}:${blockField}`);
      }
    });
    this.root.addEventListener('change', event => {
      if (event.target.matches('input[data-type-field]')) {
        const panel = event.target.closest('[data-typography-scope]'), scope = panel.dataset.typographyScope;
        const target = this.typographyTarget(panel), defaults = scope === 'block' ? this.blockTypographyDefaults(target) : typographyDefaults();
        const style = normalizeTypography(scope === 'block' ? target.typography || defaults : target.typography?.[scope] || defaults);
        event.target.value = style[event.target.dataset.typeField];
      }
      if (event.target.matches('[data-cover-upload]')) this.handleFiles(event.target.files, { cover: true });
      if (event.target.matches('[data-media-upload]')) this.handleFiles(event.target.files, { blockId: event.target.closest('[data-block-id]').dataset.blockId });
      if (event.target.matches('[data-multi-upload]')) this.handleFiles(event.target.files);
      if (event.target.matches('[data-import]')) { this.importFile(event.target.files[0]); event.target.value = ''; }
    });
    this.root.addEventListener('click', async event => {
      const expand = event.target.closest('[data-preview-expand]');
      if (expand) return this.expandPreview(expand.getAttribute('aria-expanded') !== 'true');
      const project = event.target.closest('[data-project]');
      if (project && project.dataset.project !== this.slug) return this.open(project.dataset.project);
      const viewport = event.target.closest('[data-viewport]');
      if (viewport) {
        this.viewport = Number(viewport.dataset.viewport);
        this.root.querySelectorAll('[data-viewport]').forEach(button => { const active = button === viewport; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
        this.resizePreview(); return;
      }
      if (this.busy || this.loading || !this.data) return;
      const resetType = event.target.closest('[data-type-reset]');
      if (resetType) {
        const panel = resetType.closest('[data-typography-scope]'), scope = panel.dataset.typographyScope;
        if (scope === 'block') delete this.typographyTarget(panel).typography;
        else { delete this.data.typography?.[scope]; if (this.data.typography && !Object.keys(this.data.typography).length) delete this.data.typography; }
        if (scope === 'block') this.renderBlocks(); else this.renderContent();
        this.changed(); return;
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'save') return this.save();
      if (action === 'history') return this.showHistory();
      if (action === 'export') return this.download();
      if (action === 'import') return this.root.querySelector('[data-import]').click();
      if (action === 'reload') return this.reload();
      if (action === 'undo' || action === 'redo') {
        const next = this.historyIndex + (action === 'undo' ? -1 : 1);
        if (next < 0 || next >= this.history.length) return;
        this.historyIndex = next; this.data = JSON.parse(this.history[next]); this.lastGroup = ''; this.renderContent(); this.changed(); return;
      }
      const add = event.target.closest('[data-add]');
      if (add) {
        if (this.data.blocks.length >= 200) return this.toast('最多支持 200 个区块。', true);
        const block = defaultBlock(add.dataset.add); this.data.blocks.push(block); this.renderBlocks(block.id); this.changed();
        this.root.querySelector(`[data-block-id="${CSS.escape(block.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return;
      }
      const blockAction = event.target.closest('[data-block-action]');
      if (blockAction) {
        const id = blockAction.closest('[data-block-id]').dataset.blockId;
        const index = this.data.blocks.findIndex(b => b.id === id), op = blockAction.dataset.blockAction;
        if (op === 'remove') this.data.blocks.splice(index, 1);
        if (op === 'duplicate') { if (this.data.blocks.length >= 200) return; this.data.blocks.splice(index + 1, 0, { ...clone(this.data.blocks[index]), id: crypto.randomUUID() }); }
        if (op === 'up' && index > 0) [this.data.blocks[index], this.data.blocks[index - 1]] = [this.data.blocks[index - 1], this.data.blocks[index]];
        if (op === 'down' && index < this.data.blocks.length - 1) [this.data.blocks[index], this.data.blocks[index + 1]] = [this.data.blocks[index + 1], this.data.blocks[index]];
        this.renderBlocks(); this.changed(); this.root.querySelector(`[data-block-id="${CSS.escape(id)}"] [data-block-action="${op}"]`)?.focus(); return;
      }
      if (event.target.closest('[data-drop-files]') && !event.target.matches('input')) this.root.querySelector('[data-multi-upload]').click();
    });
    this.root.addEventListener('keydown', event => {
      if (event.target.matches('[data-drop-files]') && ['Enter',' '].includes(event.key)) { event.preventDefault(); this.root.querySelector('[data-multi-upload]').click(); }
    });
    document.addEventListener('keydown', event => {
      if (this.root.hidden) return;
      if (event.key === 'Escape' && this.root.querySelector('.ed-preview.is-expanded') && !this.root.querySelector('dialog[open]')) {
        this.expandPreview(false); this.root.querySelector('[data-preview-expand]').focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); this.save(); }
    });
    this.root.addEventListener('dragstart', event => {
      const handle = event.target.closest('.ed-drag-handle'); if (!handle || this.busy || this.loading) return;
      this.dragId = handle.closest('[data-block-id]').dataset.blockId; event.dataTransfer.setData('text/plain', this.dragId); event.dataTransfer.effectAllowed = 'move';
    });
    this.root.addEventListener('dragover', event => {
      const target = event.target.closest('[data-block-id], [data-drop-cover], [data-drop-files]');
      if (!target) return; event.preventDefault(); target.classList.add('is-drop-target');
    });
    this.root.addEventListener('dragleave', event => { event.target.closest('.is-drop-target')?.classList.remove('is-drop-target'); });
    this.root.addEventListener('dragend', () => { this.dragId = ''; this.root.querySelectorAll('.is-drop-target').forEach(n => n.classList.remove('is-drop-target')); });
    this.root.addEventListener('drop', event => {
      const target = event.target.closest('[data-block-id], [data-drop-cover], [data-drop-files]'); if (!target) return;
      event.preventDefault(); this.root.querySelectorAll('.is-drop-target').forEach(n => n.classList.remove('is-drop-target'));
      if (this.busy || this.saving || this.loading) return;
      if (event.dataTransfer.files.length) return this.handleFiles(event.dataTransfer.files, { cover: target.hasAttribute('data-drop-cover'), blockId: target.dataset.blockId && this.data.blocks.find(b => b.id === target.dataset.blockId)?.type !== 'text' ? target.dataset.blockId : '' });
      if (!this.dragId || !target.dataset.blockId || this.dragId === target.dataset.blockId) return;
      const from = this.data.blocks.findIndex(b => b.id === this.dragId), to = this.data.blocks.findIndex(b => b.id === target.dataset.blockId);
      if (from < 0 || to < 0) return;
      const [block] = this.data.blocks.splice(from, 1); this.data.blocks.splice(to, 0, block); this.dragId = '';
      this.renderBlocks(); this.changed();
    });
    this.frame.addEventListener('load', () => { this.previewReady = true; this.resizePreview(); this.sendPreview(); });
    window.addEventListener('message', event => {
      if (event.origin === location.origin && event.source === this.frame.contentWindow && event.data?.type === 'sphr:preview-ready') {
        this.previewReady = true; this.sendPreview();
      }
    });
    window.addEventListener('beforeunload', event => {
      if (this.busy || this.saving || this.dirty && !this.draftSafe) { event.preventDefault(); event.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.dirty) this.queueDraft().catch(() => {}); });
  }
  async init(slug) {
    try { const { data } = await api('/portfolio/network-test/api/editor'); this.writable = data.writable === true; }
    catch { this.writable = false; this.banner('编辑功能需要本地服务器。请运行 start-local.cmd 后打开此页面。'); }
    await this.open(slug in LABELS ? slug : 'eqlz');
  }
}

export async function mountEditor(root, options) {
  // The preview must measure its first frame using the editor's actual grid styles.
  if (!stylesheetReady) stylesheetReady = new Promise(resolve => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/portfolio/network-test/css/editor.css?v=20261027';
    css.onload = resolve; css.onerror = resolve;
    document.head.append(css);
  });
  await stylesheetReady;
  if (!instance) { instance = new PortfolioEditor(root, options); await instance.init(options.initialSlug); }
  else if (options.initialSlug in LABELS && options.initialSlug !== instance.slug) await instance.open(options.initialSlug);
  instance.resizePreview();
}

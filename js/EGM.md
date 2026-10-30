# 浏览器端模块契约

## Overview

本目录以浏览器原生 ES Modules 运行，没有前端框架或打包步骤。记录日期：2026-10-27。本文描述当前实现；风险与改进方向不代表已实施的改造。

| 文件 | 职责 | 当前规模 |
| --- | --- | --- |
| [main.js](./main.js) | DOM 入口、作品默认数据、客户端路由、页面显隐、作品区块渲染、滚动与入场效果 | 690 行，27,574 字节 |
| [editor.js](./editor.js) | 按需载入的作品编辑器：表单、草稿、保存、版本、上传、预览 | 578 行，50,012 字节 |
| [block-spacing.js](./block-spacing.js) | 可选区块间距归一化与双列/单列行分组 | 25 行，1,111 字节 |
| [typography.js](./typography.js) | 中英文分段、排版参数归一化与 DOM 渲染 | 63 行，4,701 字节 |

入口由根目录 `index.html` 的模块脚本加载。`main.js` 始终导入 `typography.js`；进入 `/admin` 才动态导入 `editor.js`。mountEditor 先追加并等待现有 `css/editor.css` 的加载事件，再构建和测量预览，避免样式未就绪时先用错误宽度布局；样式失败事件仍允许继续原有界面流程。

2026-10-29 响应式补充：renderTypography 为自定义排版节点设置窄屏字号、行高与字间距变量；css/typography.css 仅在作品页小于 1024px 时采用这些变量，桌面内联值保持不变。CSS 将平板/手机区块间距分别缩为桌面值的 85%/65%，保留 0 与末行语义；低于 768px 媒体单列填满内容宽度。编辑器预览提供 1440/768/390px 三档，不改存储 schema。操作说明见根目录 EDITOR.md，浏览器检查记录见 outputs/responsive-2026-10-29/。

2026-10-30 首屏加载补充：整页淡入在 HTML 就绪后触发，不再等待 `window.load` 的所有媒体请求；入场位置测量延后到下一动画帧，媒体最终加载后仍刷新位置。移除未被样式使用的 Google Gothic A1 外链，保留本地字体与现有 600ms 淡入。HTML 中独立的经典脚本在主模块未能显示页面时提供 8 秒静态内容兜底，并在当前窗口内保存最多六条启动错误（无自动上传）。主模块标记执行及路由就绪阶段；`assets/network-check.html` v2 通过同源 iframe 读取真实启动状态、透明度和错误。首页视频 poster 来自现有影片首帧。此项不能证明特定手机运营商线路已恢复；仍需同机同网复测。

## Interface

### 前台入口与路由

`main.js` 没有模块导出，其对外接口是页面的 `data-*` DOM 标记、URL、浏览器事件和消息协议。

| 路径 | 分发函数 | 页面内容 |
| --- | --- | --- |
| `/`、`/#moving` | `showHomePage()`、`scrollToHash()` | 首页影片、介绍、六张作品卡片、声明与页脚 |
| `/origin` | `showOriginPage()` | 名称来源介绍与肖像 |
| `/info` | `showInfoPage()` | 展示 Verse 立方体外链入口，暂停首页视频；样式与轻量交互由 CSS 实现 |
| `/admin?project=<slug>` | `showAdminPage()` | 动态导入并挂载作品编辑器 |
| `/eqlz`、`/supernova`、`/kolon`、`/auto`、`/helena`、`/361` | `showProjectPage(slug)` | 复用一个详情模板，填入项目数据与内容区块 |
| 其他路径 | `showHomePage()` | 客户端返回首页，没有专门的未找到页面 |

依据：`main.js:83–87,280–282,309–333,495–653`。

同源且命中路由集合的普通链接点击被拦截，通过 `history.pushState()` 与 `initRoute()` 更新；组合键、新窗口和外部链接沿浏览器默认行为。`popstate` 同样调用 `initRoute()`。首页、Info 和 Origin 直接显示；作品路由只等待自身数据。导航版本号防止旧请求结束后覆盖新页面。页面通过 `hidden` 和 `body` 的 `*-active` 类切换，没有组件框架管理挂载与卸载。

### 项目读取与渲染

`loadEditableProject(slug)` 只读取当前作品：本机访问 `GET /api/projects/<slug>`，本机静态预览缺少 API 时退回 `/data/<slug>.json`；正式域名直接读取该静态 JSON。成功结果缓存在当前页面内，同项目并发请求合并。失败不会写入空缓存，下次可重试；后到的服务器响应不得覆盖更新的编辑草稿。旧 localStorage 与 `{...projects[slug], ...override}` 字段合并仍保留，但作品路由不会在资料失败时展示不完整默认内容。

- `fetchJson()`：`cache: no-store`，拒绝非成功响应与 HTML 冒充的 JSON；AbortController 将请求与 JSON 读取限定在 20 秒内。作品资料等待及失败时展示独立状态，提供重试和返回首页。
- `getProject()`：合并内容，并将封面中的本机 HTTP 地址转为 `/assets/` 相对站点路径；不遍历迁移区块内的地址。
- `renderProjectBlocks()`：支持 `text/image/video`，忽略无内容区块；支持整行、半行、比例、宽度、说明文字及视频播放标志。相同完整 JSON 快照不重建区块。
- 可选 `spacingAfter` 为 0–400 的整数 CSS px；缺省保持原排版。任一区块指定时，按实际网格行分配下方间距；双列同一行取显式值的最大值，手机单列分别应用。最后一行不增加间距。显式设置标题下方间距时停用标题/正文之间原有的负外边距补偿。编辑器留空删除该字段，草稿、导入导出和保存均保留 0。
- `showProjectPage()`：更新详情文字、封面、Vimeo 地址、页面标题及区块；未改变的主播放器地址不重新赋值。

依据：`main.js:106–173,176–278,495–529`。详情编辑不会同步更新首页 HTML 卡片与 CSS 封面。

### 编辑器接口与状态

唯一模块导出为 `mountEditor(root, {projects, initialSlug})`。内部保留单例 `PortfolioEditor`，再次进入后台时复用实例。

| 状态/操作 | 当前契约 |
| --- | --- |
| `data / baseline / revision` | 当前编辑值、已保存内容快照、服务端 ETag；草稿不能代替正式保存 |
| `busy / saving / loading / writable` | 限制上传、切换和重复保存；静态托管不能写入 |
| `queueDraft()` | 以 Promise 队列保护草稿写入，修改后约 500 ms 触发 |
| `history / historyIndex` | 本会话最近 30 个完整 JSON 快照；同字段 600 ms 内连续输入合并 |
| `open(slug)` | 等待旧项目草稿；读取单项目与 ETag；恢复当前标签页或最近的不同草稿；切换预览 URL |
| `save()` | 提交捕获的项目快照及 `If-Match`；409 保留草稿并提示冲突；成功后采用服务端规范化值 |
| `showHistory()` | 将指定历史内容载入草稿；正式文件仍需单独保存才替换 |
| `importFile()/download()` | 导入/导出 `sphr-project`、`version:1` JSON；媒体仍为引用，不是完整素材包 |
| `handleFiles()/upload()` | 原始文件上传到本地 API，批量选择逐个处理；上传成功不等于项目已保存 |
| `sendPreview()/resizePreview()` | 同源 iframe 复用真实详情页；1440/390 CSS 像素视口，再按预览容器实际宽高缩放显示；预览高度随窗口变化 |
| `expandPreview(expanded)` | 在常规右侧预览和铺满工作区的预览之间切换；不重新加载 iframe，不修改项目草稿 |

依据：`editor.js:14–68,111–224,253–423,543–555`。未提供实例销毁接口。

### 排版接口

`typography.js` 导出 `CN_WEIGHTS`、`EN_WEIGHTS`、`typographyDefaults()`、`normalizeTypography()`、`splitScriptRuns()`、`cssTypography()`、`renderTypography()`。

- 段落负责字号、行高、字间距和对齐；行内脚本段负责字体与独立字重。
- Latin、组合标记、ASCII 和指定 Latin-1 区间归为英文段，其余归为 CJK 段。这是两组字体的实用分段，不是完整语言识别；emoji、日文等同样进入后一组并依赖字体回退。
- 行高 `%` 转为无单位倍数；字间距 `%` 转为 `em`；均支持 `px`。
- `renderTypography()` 使用 `textContent` 创建 span，不将作品文案作为 HTML 注入。
- 字体由 `css/typography.css` 通过 `local()` 查找设备上安装的 PingFang/SF Pro；缺失时回退，不能保证跨设备完全同字形或同换行。

## Invariants

1. `index.html` 中的路由容器及 `data-*` 标记必须与 `main.js` 查询一致。新增项目必须同步路由、默认数据、编辑器列表和服务端白名单。
2. 内部导航、API、CSS、JS 和大部分素材使用站点根路径 `/...`。部署到子路径前必须明确基路径与直接访问回退策略。
3. 项目数据的 `video` 缺省允许继承内置 Vimeo；显式空字符串隐藏主播放器。编辑器保存会明确输出该字段。
4. 半行只适用于媒体；旧文字大小限制 14–72 px，新 `typography.fontSize` 限制 12–120 px，不能假设二者同义。
5. 草稿数据库为 `sphr-editor` v1，表为 `drafts`，记录主键为 `<slug>:<tabId>`，并保存 `projectSlug/data/baseRevision/updatedAt`。它依赖浏览器与来源，不能当作跨设备备份。
6. 编辑器 GET 单项目必须携带 ETag，保存必须发送该版本；恢复旧草稿保留其原版本以检测冲突。
7. 编辑预览父子消息必须校验同源与发送窗口，且项目 slug 与 iframe 当前路径一致。消息类型为 `sphr:editor-preview` 与 `sphr:preview-ready`。
8. 保存成功通过 `sphr:project-saved` 更新同一页面的内存数据；它不自动广播到其他标签页。
9. 合法排版对象的客户端与服务端归一化必须保持一致；当前由测试比对，尚未共享一份实现。非法类型另有差异：客户端对数组、字符串、数字可能采用默认值，服务端拒绝并报 422；不能将合法对象的一致性扩大为全部输入域等价。

## Side Effects

- `main.js` 导入即注册全局 click/scroll/resize/keydown/load/popstate/message 等监听，创建入场观察器，读取项目数据并初始化路由。
- 页面显示函数更新 DOM、body 类、document.title、URL 和滚动位置；媒体源赋值会引发资源请求与播放。
- 编辑器导入即访问 sessionStorage、打开 IndexedDB；挂载先等待样式就绪，再建立 ResizeObserver、iframe 和全局监听，排版及表单修改会设置计时器。
- 上传和保存调用本地写入 API；草稿写 IndexedDB；导出创建 Blob URL 并在下载触发后回收。
- 同源 iframe 草稿预览可以真实加载图片、Vimeo 和本地视频，因而也有额外的下载与解码成本。

## 交互与动画系统

| 系统 | 实现 | 边界/风险 |
| --- | --- | --- |
| 导航菜单 | CSS 状态类、ARIA expanded；Escape 关闭，resize 关闭 | 没有完整的路由级焦点恢复策略 |
| 内容入场 | `IntersectionObserver` 添加 `.visible`；部分卡片可在回到顶部后再次触发 | `.reveal` 默认透明；需要脚本成功初始化 |
| 首屏与详情淡出 | passive scroll 事件直接读取位置与尺寸、写 opacity/CSS 变量 | passive 不等于每帧合并；读取与写入交错可能增加布局工作，尚未量测 |
| 详情下滑按钮 | 700 ms 的 rAF 曲线滚动并更新 hash | 没有减少动态效果分支；没有统一的路由离开取消机制 |
| CSS 动效 | transition、scanline shimmer、卡片缩放、移动菜单 | CSS 已有 reduced-motion 规则，但不能替代视频和 JS 动画的策略 |

依据：`main.js:294–493`；`css/styles.css:662–713,1652–1684,2045–2054`。

## 已确认问题与待验证风险

| 项目 | 证据与影响 | 建议审查方向 |
| --- | --- | --- |
| 内容多处维护 | 默认对象、首页 HTML、CSS 封面、JSON、编辑器名称与服务端 slug 独立存在；2026-10-29 已将 `kolon` 默认和 JSON 中误配的 Helena/Replasty 改为 KOLON/MOVE ALPHA，但多处维护的结构仍在 | 定义一个项目目录作为一致性来源 |
| 初始化读取全部项目 | `initRoute()` 等待全量数据，即使只打开首页；当前 JSON 包含三段 base64 图片 | 当前页按需读取；缩略图与详情内容分离 |
| 媒体生命周期缺口 | 离开首页到详情/Origin 未主动暂停首页视频（Info 已暂停）；进入后台保留旧详情区块；离开后台只隐藏其 iframe，没有停用协议 | 路由级 enter/leave、统一暂停与恢复、预览卸载策略；实际耗电需浏览器验证 |
| 懒加载不统一 | 公共图片没有 `loading=lazy/srcset`；Vimeo 进入作品即设置 src；全部区块视频设置 src 且默认自动播放 | 按可见范围分级加载，定义移动网络与点击播放策略 |
| 页面缺失与错误反馈 | 未知路径返回首页；数据错误被捕获并用默认内容继续 | 明确 404/数据失败的产品行为 |
| 入口失败影响全站 | body 初始 opacity 为 0，只在 load 回调加 loaded；依赖入口脚本正常执行，没有无脚本兜底 | 确定渐进增强或预渲染方案 |
| 编辑器状态与复制成本 | 修改会 stringify 完整项目、保留 30 快照、传整份预览；媒体仍可内嵌 JSON | 先外置图片，再决定细粒度状态/预览更新是否必要 |
| 校验分散 | Vimeo、媒体、排版与块默认值在编辑器、公共渲染器和 store 各有规则；旧视频 controls 缺省语义不完全相同 | 共享 schema/明确迁移版本，扩充边界行为测试 |
| 样式维护成本 | `styles.css:201–611` 仍有旧 `.admin-*` 规则，新后台主要使用 `.ed-*` | 先做使用情况验证，再决定清理和样式分层 |

## Verification

从仓库根目录运行现有测试：

```powershell
node --test scripts/editor-store.test.cjs scripts/typography.test.mjs
```

本次结果：10/10 通过，Node v24.15.0。测试覆盖存储、版本冲突、历史恢复、排版归一化与文本保真，不覆盖 DOM、路由、媒体暂停、网络瀑布或移动浏览器布局。

后续浏览器验收应覆盖：所有路由直接打开与刷新、前进后退、详情与首页往返、后台预览进出、无 JS/加载失败、键盘焦点、reduced-motion、窄屏、视频离屏与页面后台运行。

初次静态审查时 4173 连接被拒绝。后续已恢复监听并进行页面与性能检查。传输优化保持 main.js、typography.js 和 CSS 不变；editor.js 仅增加后台样式就绪等待，避免预览初始化尺寸竞态。补充后编辑器复测 CLS=0；运行证据与手机审计限制见根目录 `EGM.md` 及性能报告。

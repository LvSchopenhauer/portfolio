# 作品集性能测试记录

测试日期：2026-10-27，Asia/Shanghai。目标为 `http://127.0.0.1:4173` 本地 Node 服务。本轮恢复服务并启用源码监听，未修改业务代码、样式、动画、内容或项目依赖。

## 环境与方法

- Lighthouse 13.5.0，独立 Headless Chrome 155，本机 Node v24.15.0。审计工具存放于 npm 缓存，不加入作品集依赖。
- 串行运行，独立临时浏览器配置；没有复用个人浏览器的登录或编辑草稿。未操作保存、上传或发布。
- 桌面：1350×940，Lighthouse desktop preset，模拟 RTT 40 ms、吞吐 10,240 Kbps、CPU 倍率 1。每个页面一轮，分数是实验室模型结果，不是多次中位数或线上真实用户数据。
- 手机：412×823、DPR 1.75，先使用默认 mobile 模拟节流，再以 `provided` 模式（不主动施加节流）复核。手机绘制结果异常，见下文，未选取较高分作为最终结论。
- 本地 API 可用，因此本次没有覆盖公开静态部署的 API 失败→JSON 回退、CDN、远端带宽与真实手机硬件。
- 原始 JSON/HTML、摘要、HTTP 结果与截图均放在 `.editor-test/performance-2026-10-27/`；该目录已由项目既有忽略规则排除。

复现示例（本机已缓存工具；无需在项目安装依赖）：

```powershell
.\start-local.cmd 4173 -Watch
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx --yes lighthouse@13.5.0 http://127.0.0.1:4173/ --only-categories=performance --preset=desktop --chrome-flags="--headless --disable-extensions" --output=json --output=html --output-path=.editor-test/performance-2026-10-27/home-desktop --max-wait-for-load=35000
```

## 桌面结果

LCP 为主要内容显示时间；TBT 为总阻塞时间。模拟 LCP 与原始本机记录必须分开理解：前者用于 Lighthouse 评分，后者来自该轮实际采集的本地时间线。

| 页面 | 性能分 /100 | 模拟 LCP | 本地观测 LCP | 观测期传输量 | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| 首页 `/` | 74 | 8.21 s | 1.26 s | 19.30 MB | 0 ms | 0 |
| Supernova | 74 | 8.21 s | 1.91 s | 14.59 MB | 41 ms | 0 |
| EQLZ | 73 | 8.21 s | 2.26 s | 19.18 MB | 0 ms | 0 |
| 编辑器，Supernova | 56 | 21.60 s | 主文档 2.07 s；含 iframe 2.68 s | 28.40 MB | 250 ms | 0 |

传输量采用 Lighthouse `total-byte-weight`，单位为十进制 MB，可能包含 iframe 与审计期间媒体下载；视频可能尚未完整下载，也可能产生多次请求。它不是首屏必需字节、完整媒体文件总和或长期流量上限。CLS=0 只适用于本轮导航采样，不证明整个交互流程永远无布局变化。

原始报告：

- [首页桌面 HTML](./.editor-test/performance-2026-10-27/home-desktop.report.html) / [JSON](./.editor-test/performance-2026-10-27/home-desktop.report.json)
- [Supernova 桌面 HTML](./.editor-test/performance-2026-10-27/supernova-desktop.report.html) / [JSON](./.editor-test/performance-2026-10-27/supernova-desktop.report.json)
- [EQLZ 桌面 HTML](./.editor-test/performance-2026-10-27/eqlz-desktop.report.html) / [JSON](./.editor-test/performance-2026-10-27/eqlz-desktop.report.json)
- [编辑器桌面 HTML](./.editor-test/performance-2026-10-27/admin-desktop.report.html) / [JSON](./.editor-test/performance-2026-10-27/admin-desktop.report.json)
- [全部审计摘要](./.editor-test/performance-2026-10-27/summary.json)

这些原始产物保留在本机忽略目录；单独分享本报告时不会自动包含原始附件。

## 已通过运行记录确认的问题

### 1. 隐藏页面也产生了媒体请求

首页导航记录明确包含六张封面、`assets/head2.png`、Origin 肖像和全量 `/api/projects`。只打开首页便请求了：

- `head2.png`：2,060,491 字节传输。
- `schopenhauer-portrait.jpg`：1,497,565 字节传输。
- `/api/projects`：1,002,793 字节传输。
- 六张首页 PNG 封面的文件体积合计约 8.31 MB。

直接打开 Supernova/EQLZ，同样观察到六张封面和隐藏页面图片；编辑器主文档与真实预览 iframe 合计出现 12 条封面请求、2 次聚合项目请求。这里记录的是实际请求次数，不能推导为每个资源在所有浏览器中都必然重复下载。

建议优先分离当前路由与隐藏页面资源，只读取当前作品所需内容，再外置 JSON 内的图片。

### 2. 图片交付成本高于必要值

桌面首页的 image-delivery 审计估算可节约约 6.22 MB，主要来自封面图片；这是工具估计，不是已经压缩得到的结果。

另发现 `assets/xhs.svg` 实际传输了 941,350 字节（文件约 0.94 MB），对小型社交图标来说应优先检查。可以先处理图标与封面多尺寸/现代格式，在人工比较画质后再决定压缩参数。

### 3. 首页 LCP 视频发现较晚

首页 LCP 元素被识别为 `.hero-media > video`。其 source 初始只在 data-src 中，需等入口读取全部项目数据并进入首页后才设置。Lighthouse 标记“初始文档不可直接发现”及缺少高优先级提示。

这不表示应立即给视频强制预加载。应先明确首屏静态 poster、视频何时启动、手机网络策略，以及与正文/封面竞争下载的优先级。

### 4. 离开首页后视频仍播放

在内置浏览器使用真实站内链接从首页进入 Supernova：

- 跳转前：首页可见，首页视频 `paused=false`，时间 11.5486 s。
- 跳转后：首页 `hidden=true`，同一视频仍 `paused=false`，时间推进至 12.3136 s。
- 后续读取仍为播放状态；该影片循环，不能仅用两次时间大小比较播放进度。

证据：[lifecycle.json](./.editor-test/performance-2026-10-27/lifecycle.json)。这确认了“未主动暂停”的缺口；未量测实际电池消耗或 GPU 占用，不能声称节省比例。

### 5. 本地视频服务不支持 Range

请求影片时发送 `Range: bytes=0-1023`，服务返回 200 和完整 7,195,131 字节，没有 Content-Range/Accept-Ranges。说明本地服务未按范围发送媒体。静态响应也没有 Cache-Control；`_headers` 不被该 Node 服务读取。

这解释本地媒体交付的局限，不代表公开 CDN 同样如此。证据见本地 `http-checks.json`。

### 6. 优化重点先放在媒体链路

三个公开桌面页面本轮 TBT 为 0–41 ms，而媒体/全量内容传输明显偏大；应先处理资源与播放生命周期。审计还记录强制布局、阻塞字体 CSS 和未使用 CSS，但本轮没有持续滚动帧率记录，不能把入场动画判定为主要卡顿来源。

## 手机结果与限制

| 样本 | 结果 | 处理方式 |
| --- | --- | --- |
| 首页，默认 mobile 模拟 | 返回 69 分、模拟 LCP 50.0 s；采集日志同时出现 Lantern `NO_LCP`，本地观测时间与模拟值差异较大 | 保留原始结果，不作为可靠手机基线 |
| 首页，provided 复核 | 返回 87 分，但 FCP 20.96 s、LCP 2.24 s，绘制指标顺序异常 | 不采用该分数宣称优化或手机体验良好 |
| Supernova，默认 mobile | `NO_FCP`，无有效分数 | 保留失败报告 |
| Supernova，provided 复核 | 再次 `NO_FCP`，无有效分数 | 不将失败替换成虚构的分数，也不直接等同于真实手机白屏 |

随后使用内置浏览器的 412×823 视口核对 Supernova：页面可见、body opacity=1、封面加载完成（naturalWidth=1920）、菜单收起、无横向溢出。该检查证明一个浏览器环境中的页面能显示，不解释全部 Lighthouse 绘制异常，也不是实体手机性能验证。

证据：[手机视口截图](./.editor-test/performance-2026-10-27/supernova-mobile.png)、[DOM 状态](./.editor-test/performance-2026-10-27/mobile-dom.json)。所有 mobile 原始 JSON/HTML 与复核结果同样保留。后续需用独立真实设备或另一套采集环境定位绘制指标异常；本轮不再无依据反复运行同一测试。

## 后续优先顺序

1. 当前页面资源按需加载，拆出全量 JSON 中的内嵌图片，检查约 0.94 MB 社交图标。
2. 为封面建立多尺寸/现代格式与画质验收标准；明确首屏 poster 和视频启动顺序。
3. 路由离开与标签页隐藏时统一暂停媒体，后台预览有明确启停约定。
4. 决定本地服务的缓存与 Range 支持，再单独验证实际静态部署。
5. 在稳定手机测量环境中建立基线后，针对相同场景复测；不直接把本轮不同模式分数相减当作提升。

以上仅为测试发现与建议，本轮没有实施性能修复。接下来对三个 EGM.md 做文档与代码一致性检查。

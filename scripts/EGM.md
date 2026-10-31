# 本地存储与辅助脚本契约

## Overview

记录日期：2026-10-27。本目录包含本地内容持久化、Windows 启动与 Git 推送工具，以及隔离测试。没有统一的包清单或任务运行器。测试脚本用于验证，不作为生产接口。

## Interface

### HTTP 传输

[http-delivery.cjs](./http-delivery.cjs) 导出 `sendBuffer(req,res,input,options)`、`sendFile(req,res,filePath,type)`、`byteRange(header,size)`，由 server.js 调用。

- 文本按 Accept-Encoding 协商 Brotli/Gzip；q=0 不选取，不接受可用表示时为 406；小于 1 KiB 且允许 identity 时不压缩。Vary 保持表示隔离。
- 静态 ETag 为内容 SHA-256，压缩表示分别计算。采用每次版本校验的缓存，匹配返回 304；stat 的 size/mtime/ctime 变化后重算，不生成指纹文件名或长期缓存固定 URL。
- API 和静态 JSON 保持 no-store，编辑 API 的 ETag 仍是项目版本，不能换成压缩字节哈希。
- 静态文件支持 HEAD、单段 Range、suffix/open range、206/416、If-Range；多段 Range 忽略并返回完整 200；日期精度不能可靠验证时完整返回。
- 文件条目缓存最多 32 个；≤2 MiB 的文本可缓存原文及压缩表示，大媒体只缓存哈希/元信息并流式发送。流量压缩不改写磁盘素材。

### 项目存储

[project-store.cjs](./project-store.cjs) 为 CommonJS 模块，导出：

| 导出/方法 | 输入与输出 |
| --- | --- |
| `createProjectStore({dataDir, historyDir, retain=50})` | 返回单进程 store 实例 |
| `read(slug)` | 返回 `{data, revision}`；不存在的文件视为原始 `{}`；损坏 JSON 报 500 |
| `save(slug, input, expectedRevision)` | 校验并串行保存，返回新的 `{data, revision}` |
| `list(slug)` | 返回至多 retain 条 `{id, savedAt, bytes}`，按文件名从新到旧排列 |
| `history(slug, id)` | 读取 list 认可的版本内容，不直接恢复磁盘文件 |
| `normalizeProject(input)` | 校验项目字段、规范化区块，丢弃不在输出结构中的额外字段 |
| `normalizeTypography(value)` | 校验并限制排版参数 |
| `mediaUrl(value, {embed=false})` | 规范化素材 URL；embed 对外部 HTTPS 限定 Vimeo 或有效 BV 号的哔哩哔哩播放器，B 站关闭弹幕和自动播放 |
| `StoreError(status, message)` | 错误携带 HTTP 状态，供本地服务映射 |

依据：`project-store.cjs:5–146`。

项目固定为 `eqlz/supernova/kolon/auto/helena/361`。可写字段为 `client/title/copy/secondary/image/video/typography/blocks`。每个区块有唯一 ID，类型为 text、image 或 video；媒体带布局、尺寸、比例、alt/caption，视频附 controls/autoplay/loop，文字可附独立 typography。所有区块可选 `spacingAfter`：缺省/null/空字符串不输出字段，有限数字或数字字符串取整并限制为 0–400；其他值拒绝为 422。0 与缺省不同。

### GitHub Pages 正式发布（2026-10-31）

`build-site.cjs` 生成内联首页；`build-github-pages.cjs` 接受 `--output` 与 `--media-source`，两条路径必须位于当前 checkout 内。构建器只复制公开 HTML、css/js/data 和其引用媒体，核对复制前后的 SHA-256，输出九个显式路由入口、404、CNAME 与旧测试路径跳转；不打包本地服务、历史或工具。六支备用主片取自既有 gh-pages 分支的媒体目录，保持原字节。完整产物检查 1 GiB 上限。

该 workflow 曾在 main 推送后自动发布，但切换后用户报告 Wi-Fi 无法访问，现已禁用并改为仅手动触发。正式 DNS 回退为原 Cloudflare Pages 的代理记录，GitHub Pages 恢复 legacy gh-pages 发布源且解绑自定义域名，独立测试快照保持可用。构建器保留作未来迁移准备；不得用其根域名产物覆盖当前独立测试站。第二次 checkout 读取的备用媒体仍保留于 gh-pages。

### Windows 本地启动

[start-local.ps1](./start-local.ps1) 接受 `Port=4173` 与 `Watch`；根目录 `start-local.cmd` 转发参数。

```powershell
.\start-local.cmd 4173 -Watch
```

- 先找固定 Node 路径，缺失时查询 `node.exe`。
- 只有 HTTP 200 且 `X-Portfolio-Server: sphr-portfolio` 才识别为本项目服务。
- 同端口其他可响应的 HTTP 服务会报冲突；非 HTTP 占用不能由该探测完整识别，仍可能在启动时失败。
- 已识别的服务直接复用，不检查原进程是否已开启 watch；追加 `-Watch` 不会升级一个已运行的普通进程。
- 新进程通过隐藏窗口启动，watch 为 Node 服务端源码监听。HTML/CSS/浏览器 JS 修改仍需浏览器刷新，没有 HMR。
- 服务身份检查不是健康检查：它不验证项目数据、API 可写、媒体或子进程状态。

依据：`start-local.ps1:1–84`。

### 推送工具

[push-github.ps1](./push-github.ps1) 接受可选 `Message`，默认 `Update portfolio`。它检查当前分支与 origin：工作树干净时直接 push；有改动时执行 `git add -A`、commit、push 当前分支。

此工具会提交全部未忽略改动，不能当作无副作用的发布检查。本次分析没有执行该工具。各步 Git 命令缺少逐步退出码保护，提交/推送成功也不证明远端页面部署正确。

## Invariants

1. 文件路径只能通过白名单 slug 推导；版本 ID 必须属于 `list()` 返回的合法历史文件，不能直接拼接任意用户路径。
2. `revision` 是原始文件文本的带引号 SHA-256，而非规范化对象的哈希；仅格式变化也会改变版本。
3. 缺 `If-Match` 对应 428，版本不一致对应 409。检查在每个 slug 的进程内保存队列中进行。一个实例内先写者生效，后续过期写入拒绝。
4. 队列不是跨进程文件锁；多个服务进程、外部手工编辑或同步工具不受同一队列协调。
5. 必须先成功备份非空旧内容，再写同目录唯一临时文件、sync、close、rename；备份失败不得替换原文件。历史备份是重新序列化的 JSON，不保证原始字节完全相同。
6. 成功替换后才清理超出 retain 的历史。单项清理失败被忽略，因此 retain 是正常路径的保留目标，不是磁盘上永远只有 50 个文件的保证。
7. 除静态路径和 HTTPS 外，仍兼容特定 base64 图片；不能据此认为新增数据应继续内嵌媒体。`embed` 检查仍先接受 `/assets/` 路径，与编辑器只接受 Vimeo 的规则不同。
8. `video` 不存在与显式 `''` 不同；迁移时必须保留该语义。
9. 字段约束：client ≤160 字符、title ≤240，copy/secondary 各 ≤12,000；最多 200 块，每个文字块 ≤50,000 字符，alt ≤500，caption ≤1,000。完整请求另有服务端体积限制。
10. 根目录及父目录必须允许普通文件写入和同目录 rename；FFmpeg、Node、PowerShell 版本与路径由本机提供，当前没有锁定的可复现安装清单。

## Side Effects

| 操作 | 副作用 |
| --- | --- |
| `read/list/history` | 读取 JSON、历史目录和文件统计 |
| HTTP 传输 | 文件 stat、哈希、读取与媒体流；内存中的有界文件/压缩缓存；响应压缩、ETag、304 和 Range；不写磁盘源文件 |
| `save` | 创建目录、写历史备份与临时文件、sync、原子路径替换、清理旧历史；失败时尽力删除临时文件 |
| `start-local.ps1` | 重设当前启动器进程 PATH；启动 Node，写根目录两份日志；探测失败时可能留下已启动进程 |
| `push-github.ps1` | 切换目录、暂存全部改动、创建 Git 提交并向 origin 推送 |
| `editor-browser-fixture.cjs` | 在 `.editor-test/` 创建测试数据，启动带独立 storageRoot 的 4174 服务 |
| `editor-http-smoke.cjs` | 写测试项目与上传测试素材；必须针对隔离的 4174 服务，不能改为正式编辑端口运行 |

存储的 rename 避免正常进程中读到半份 JSON，但不等于整次操作具备完整事务或断电持久性：没有目录 fsync；替换之后的目录读取或最终 read 仍可能失败，造成“客户端收到失败但文件已更新”。这是后续失败语义审查议题，不能将所有错误统一解释为原文件绝对未改变。

## 维护与扩展风险

- **规则重复**：slug、排版、媒体与区块参数在多个文件重复维护。当前排版一致性测试降低了部分风险，但新增块类型仍需跨前后台同步修改。
- **存储形态限制**：设计适合一位维护者的本地工具；增加远程多人编辑前需要重新决定身份、共享锁、历史存储、备份和发布边界。
- **恢复范围有限**：历史仅备份 JSON，媒体上传不随版本回滚；删除或移动素材可能使旧版本失效。导出 JSON 同样没有打包媒体。
- **素材回收缺失**：取消使用、替换媒体后上传文件留存。将来清理必须追踪现有内容和保留历史引用，不能按当前项目简单删除。
- **环境可复现性**：FFmpeg 放在被忽略的 `.tools/`，没有随仓库自动安装；新机器小 MP4 可上传，但需要转码的文件可能失败。
- **启动与发布边界**：watch、进程复用、健康状态和发布成功目前是不同概念；旧说明混用 GitHub Pages/Cloudflare，需以实际部署配置核实。

## Verification

初始审查运行存储/排版 10 项测试。传输优化后实际运行：

```powershell
node --test scripts/http-delivery.test.cjs scripts/editor-store.test.cjs scripts/typography.test.mjs
```

Node v24.15.0，15 项全部通过。测试在临时目录和临时端口执行，没有改写真实项目 JSON。新增覆盖压缩保真、协商/版本失效、Range/HEAD/If-Range、路径保护，以及真实服务压缩保存、历史、预览与隔离上传兼容性。

覆盖：版本必填与冲突、并发串行、备份恢复、非法输入/路径、备份失败保护、历史保留、媒体参数回读、中英文字串保真、排版转换与客户端/服务端一致性。

已有但本次未执行的集成流程：

```powershell
# 终端一，使用测试数据启动独立服务
node scripts/editor-browser-fixture.cjs
# 终端二，只针对 4174 的测试服务
node scripts/editor-http-smoke.cjs
```

HTTP smoke 需要已有的小 MP4 样本，覆盖保存/恢复、私有路径保护、跨来源写入拒绝和小媒体上传；它不覆盖全部 FFmpeg 转码档位、超大上传、断电恢复或多进程并发。

2026-10-29 区块间距改动补充运行 `node --test scripts/block-spacing.test.mjs scripts/editor-store.test.cjs scripts/typography.test.mjs scripts/http-delivery.test.cjs`，19/19 通过。新增覆盖自动/零间距区别、双列行分组、默认恢复、保存回读与历史保留。浏览器另核对默认 EQLZ 十个区块的位置与尺寸完全不变，以及实时 48 px 和 0 px 间距。

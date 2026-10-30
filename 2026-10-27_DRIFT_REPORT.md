## EGM.md

- **[P2，约束未满足] 本地脚本保护存在 Windows 大小写绕过。** `Invariants` 第 3 条要求“受保护目录与本地脚本不得被本地静态路由暴露”，但 [server.js](./server.js) 第 177 行在路径规范化之前使用区分大小写的 URL 正则，随后第 345–358 行交给 Windows 文件系统读取。本轮只读 HTTP 验证：`/scripts/project-store.cjs` 为 403，而 `/Scripts/project-store.cjs` 为 200、8,948 字节；`/SERVER.JS` 为 200、12,482 字节；根目录 `/start-local.cmd` 也为 200。实现未达到文档所述的保护边界。服务仍只绑定回环地址，此结果不代表已存在互联网暴露。建议以规范化后的允许公开路径建立规则，并验证大小写、分隔符和根目录启动脚本；本轮未修复。证据：[HTTP 记录](./.editor-test/performance-2026-10-27/http-checks.json)。
- **[P3，接口覆盖缺口] 保存请求的上限与超限响应未进入接口契约。** 文档详细记录了图片/视频上传体积，但本地保存 API 表没有说明 [server.js](./server.js) 第 39–48 行的 `readBody()` 行为：按 JavaScript 字符串 length 超过 `12 * 1024 * 1024` 时 `req.destroy()`，不是按 UTF-8 字节累计，也不是稳定的 413 JSON 响应。二进制上传第 51–64 行则按字节累计并同样销毁请求。这些现有边界会影响大文件导入/保存和客户端错误处理，应补充计量单位与失败语义。此项为源代码确认的文档遗漏，未通过大体积真实写入复现。

## js/EGM.md

- **[P3，契约范围过宽] “客户端与服务端归一化必须保持一致”没有限定输入域，非法类型的处理实际不同。** `Invariants` 第 9 条未区分合法排版对象与非法类型。[typography.js](./js/typography.js) 第 12–24 行对 `[]`、`'abc'`、`42` 均返回默认排版对象；[project-store.cjs](./scripts/project-store.cjs) 第 12–13 行对相同输入均抛出状态 422。本轮在 Node 中直接调用两端函数验证，没有访问真实项目存储。应将文档限定为合法对象归一化的一致性，并另行定义非法类型的拒绝/默认行为，或统一实现及对应测试；不能把既有合法样例测试理解为全部输入行为等价。证据：[类型边界验证](./.editor-test/performance-2026-10-27/normalization-checks.json)。

## scripts/EGM.md

No drift detected.

## EGM.md — 传输优化后复核

No drift detected.

## js/EGM.md — 传输优化后复核

No drift detected.

## scripts/EGM.md — 传输优化后复核

No drift detected.

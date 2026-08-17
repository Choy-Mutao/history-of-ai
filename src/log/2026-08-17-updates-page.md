# 2026-08-17 · 每日动态页（/updates/）上线

> 记录「每日采集更新信息站内展示」的设计与实现，方案经用户确认：
> 独立动态页 + 全部事件带状态标签展示。

## 设计

数据流零新增采集逻辑，全量复用 src/lib：

```
collect PR 合并到 main → deploy.yml 触发 → docs:build 时
updates.data.ts 读取 src/data/raw/*.json → clusterEvents + scoreCluster
+ isRecorded 聚类/评分/已收录检测 → 静态页面产出
```

## 实现

- `docs/.vitepress/data/updates.data.ts`：VitePress 数据加载器，构建时扫描
  `src/data/raw/`，保留最近 30 天，输出按日期倒序、按评分降序的事件分组；
  dev 模式 watch raw 目录热更新；
- `docs/.vitepress/theme/components/UpdatesPage.vue`：声明横幅（机器采集未核实）、
  日期区块 + 信源统计徽章、事件卡片（✅已验证 n 信源 / ⚠️待核实 / 📖已收录灰显）、
  一手来源外链与信源徽章；hermes 主题变量；
- `docs/updates/index.md` 挂载组件；`theme/index.ts` 注册；中文 nav 加「动态」；
- 英文版暂不上线（内容全中文）。

## 排障

- **数据加载器 import 路径**：组件位于 `theme/components/`，引用 `data/` 需
  `../../data/updates.data.js`（两级上跳 + `.js` 后缀），与 TimelinePage 引用
  普通 TS（`../../data/timeline`）不同——loader 文件必须带 `.js` 后缀解析；
- **SIGPIPE 教训**：`npm run collect | head -2` 会导致 head 退出后 tsx 被 SIGPIPE
  杀死，留不下当日 raw 文件。查看输出用 `tail` 或直接看文件。

## 验证（2026-08-17）

- `npm run docs:build` 通过；dist/updates/index.html 含 151+36 个事件卡片、
  两个日期区块（08-16、08-17）；
- 本地采集补数：当日 36 条新增（caict 本地亦被 WAF 拦截 412，疑似封锁收紧，
  观察中；其余 8 信源正常）。

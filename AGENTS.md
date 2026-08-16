# AGENTS.md

> 本文件面向 AI 编程助手（coding agents），介绍本项目的架构、命令与规范。阅读本文件前不需要任何项目背景知识。

## 项目概述

**AI 史记（History of AI）** 是一本开源的人工智能历史书籍，仿司马迁《史记》五体结构，记录 AI 从 1943 年到 2026 年的关键事件、人物与机构。

- 这是一个**纯内容型静态站点项目**：没有后端、没有测试框架、没有 lint 配置。代码量很少，主要工作是撰写和维护 Markdown 内容，以及少量 VitePress 主题代码。
- 仓库：https://github.com/zsjunai/history-of-ai
- 在线地址：https://ai.puliot.com/
- 许可证：CC-BY-SA 4.0（内容），见 `LICENSE`
- 中英双语：中文为主站点（`docs/` 根），英文版在 `docs/en/`（已完整镜像中文版全部章节）

## 技术栈与架构

- **VitePress ^1.6.4**（唯一的依赖，`devDependencies`）+ Vue 3 + TypeScript
- Node 20（GitHub Pages 工作流）/ Node 22（ECS 工作流）
- 站点源码全部在 `docs/` 目录下，构建产物输出到 `docs/.vitepress/dist/`
- `base` 路径通过环境变量控制（`docs/.vitepress/config.ts:6`）：
  - 本地开发 / ECS 部署（ai.puliot.com）：默认 `base = '/'`
  - GitHub Pages：工作流注入 `VITEPRESS_BASE=/history-of-ai/`
  - sitemap hostname 通过 `VITEPRESS_HOSTNAME` 注入

## 常用命令

```bash
npm install           # 安装依赖（CI 用 npm ci）
npm run docs:dev      # 本地开发预览，端口 10001，支持热更新
npm run docs:build    # 构建到 docs/.vitepress/dist（唯一的验证手段）
npm run docs:preview  # 预览构建结果，端口 10001
```

**没有测试、没有 lint、没有 typecheck 脚本。** 任何改动（尤其是配置和组件）的验证方式就是运行 `npm run docs:build` 确认构建通过，必要时 `docs:dev` 肉眼检查页面。

## 目录结构

```
docs/
├── .vitepress/
│   ├── config.ts              # 站点配置：导航、侧边栏（中英文两套）、SEO/head、base 路径
│   ├── data/
│   │   ├── timeline.ts        # 时间线共享数据源（首页动画 + 大事年表页面共用）
│   │   └── people.ts          # 人物字典（<Person> 组件的数据源）
│   ├── theme/
│   │   ├── index.ts           # 主题入口：注册全局组件、导航 tooltip
│   │   ├── components/        # 自定义 Vue 组件（见下表）
│   │   └── styles/            # vars.css（双主题颜色变量）、custom.css
│   └── dist/                  # 构建产物（勿提交）
├── annals/                    # 本纪（10 篇编年史，两位数字前缀命名）
├── houses/                    # 世家（31 篇机构史）
├── biographies/               # 列传（23 篇人物传记）
├── treatises/                 # 书（25 篇技术专题 + 国别史）
├── timeline/                  # 表（大事年表，数据来自 timeline.ts）
├── guide/                     # 前言、如何贡献
├── en/                        # 英文版（完整镜像上述结构）
├── public/                    # 静态资源：favicon、robots.txt、images/
└── index.md                   # 首页（frontmatter + 自定义组件注入）

src/                           # 信源采集子系统（与站点构建解耦，详见 src/README.md）
├── config/sources.ts          # 国内信源注册表（新增信源须先实测可用性）
├── lib/                       # 采集共享库：types / fetch(RSS) / fetch-html(列表页) / filter(AI 过滤) / dedupe / verify / score / timeline-check
├── scripts/                   # collect（采集）、report（候选更新报告）
├── tests/                     # 单元测试（node:test，npm test）
├── data/                      # 去重状态与原始采集结果（state.json 提交仓库）
├── reports/                   # 候选更新报告（人工审核入口；docs 更新一律人工进行）
└── log/                       # 开发记录（立项计划见 src/log/2026-08-16-plan.md）
```

### 自定义组件（`docs/.vitepress/theme/components/`）

| 组件 | 用途 |
|------|------|
| `CustomLayout.vue` | 自定义布局，向首页注入各区域组件 |
| `ParticleNetwork.vue` | 首页 hero 粒子神经网络背景动画 |
| `AiRobot.vue` | 首页 hero AI 机器人动画 |
| `StatsBar.vue` | 首页统计数字栏（含篇数统计，篇数变化时需改） |
| `HistoryLoader.vue` | 终端风格打字机加载动画 |
| `HomeFooter.vue` | 首页底部 |
| `TimelinePage.vue` | 大事年表页面（读取 `data/timeline.ts`） |
| `PersonTooltip.vue` | 人物悬浮卡片，Markdown 中以 `<Person id="turing" />` 调用 |

## 写作规范（修改内容时必须遵守）

### 真实性（最高优先级）

- 人名、年份、事件、数字必须核实；不确定宁可不写，**绝不编造**。
- 有争议的细节注明"据传"或给出出处；尽量引用一手文献（原始论文、亲历者回忆）。
- 每篇末尾必须有 `## 参考资料` 部分。

### 语言与人名

- 中文为主，现代白话文；关键术语首次出现用 `中文（English Term）` 格式。
- 人物**首次出现**必须使用 `<Person id="xxx" />` 组件（行内显示中文名，悬浮卡片显示详情），后续只写中文名。
- 若人物不在 `docs/.vitepress/data/people.ts` 中，先补充字典条目（必填字段：`id`、`name`、`englishName`、`nationality`、`field`、`born`、`bio`；`died`、`bio_en`、`field_en`、`nationality_en`、`avatar` 可选）再使用组件。
- 有通用中文译名的一律用中文，不直接使用纯英文人名。

### 章节必备结构

每篇完整章节以 `# 标题` + 一句话概括的引用块开头，结尾依次包含：

1. `::: tip 太史公曰` —— 作者主观短评
2. `## 亲历者说` —— 社区口述史板块
3. `## 参考资料`

各体例的标题格式与章节模板详见 `CONTRIBUTING.md`。

### 文件与图片

- 文件名：小写英文 + 连字符（如 `fei-fei-li.md`）；本纪用两位数字前缀（`01-dawn.md`）。
- 图片放 `docs/public/images/`（`people/`、`events/`、`companies/` 子目录），必须是公共领域或 CC 许可，并在对应子目录的 `CREDITS.md` 中登记来源与许可证。

## 数据维护规范

### 时间线（`docs/.vitepress/data/timeline.ts`）

- 所有时间线事件统一维护在此文件，**不要在 Markdown 中硬编码**；首页动画和年表页面自动同步。
- 每条事件必填 `year`、`event`，建议填 `link`（必须指向已存在页面），必填 `type`（`paper`/`product`/`company`/`policy`/`person`/`event`/`milestone`）和 `importance`（`milestone`/`major`/`minor`），`month`（1–12）可选，`event_en` 为英文描述（可选）。
- 每个时代 `milestone` 级别的事件控制在 1–2 条。

### 新增/删除文章的同步清单

1. 在 `docs/.vitepress/config.ts` 的侧边栏配置中登记新文章（中文版和英文版 `en` 各一套）。
2. 篇数发生变化时，同步更新所有记录篇数的位置：
   - `CLAUDE.md` 五体结构表格
   - `README.md`（及 `README.en.md`）五体结构表格及合计数
   - `docs/guide/introduction.md` 前言中的篇数描述
   - `docs/index.md` 首页 features 中的篇数描述
   - `docs/.vitepress/theme/components/StatsBar.vue` 统计数字
3. 运行 `npm run docs:build` 验证。

## 部署

两个 GitHub Actions 工作流，推送 `main` 分支即触发：

- `.github/workflows/deploy.yml` — 部署到 GitHub Pages（Node 20，`VITEPRESS_BASE=/history-of-ai/`）
- `.github/workflows/deploy-ecs.yml` — 部署到阿里云 ECS（ai.puliot.com，Node 22，`VITEPRESS_BASE=/`，rsync 上传 `dist/`）

注意：站内绝对链接需考虑 `base` 前缀差异（GitHub Pages 带 `/history-of-ai/` 子路径，ECS 不带）。`config.ts` 的 `srcExclude` 已排除 `**/README.md`、`**/CREDITS.md`、`**/_*.md`，这些文件不会被渲染为页面。

## Git 与提交规范

- 分支：`main` 保持可部署；新内容 `feat/xxx`，修复 `fix/xxx`，文档 `docs/xxx`，样式 `style/xxx`。
- 提交信息用 Conventional Commits：`feat:` / `fix:` / `docs:` / `style:` / `refactor:` / `chore:`（如 `fix: 修正 AlphaGo 击败李世石年份`）。
- PR 前必须本地 `npm run docs:build` 通过；涉及事实性内容需在 PR 中附参考来源。

## 安全与版权注意事项

- **图片版权**：仅接受 Public Domain、CC0/CC-BY/CC-BY-SA 或官方媒体素材，提交时注明来源和许可证。
- 工作流中使用了 GitHub Secrets（`ECS_SSH_KEY`、`ECS_HOST` 等），不要在代码或日志中泄露。
- 内容为 CC-BY-SA 4.0；提交 PR 即视为同意 `CONTRIBUTING.md` 中的 CLA 条款。

## 参考文档

- `README.md` / `README.en.md` — 项目介绍与五体结构总览
- `CONTRIBUTING.md` / `CONTRIBUTING.en.md` — 完整贡献指南（章节模板、提交规范、CLA）
- `CLAUDE.md` — 面向 Claude 的项目说明，内容与本文件互补

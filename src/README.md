# src/ — 国内信源采集子系统

为「AI 史记」提供国内信源的定时采集与交叉验证，产出**候选更新报告**供人工审核，
辅助内容真实性校验。本目录不参与站点构建，与 `docs/` 完全解耦。

- 本仓库：<https://github.com/Choy-Mutao/history-of-ai>（采集子系统所在仓库）
- 友链（上游原仓库）：<https://github.com/zsjunai/history-of-ai>

## 设计原则

1. **只读外部、不写 docs** —— 脚本只产出报告，`docs/` 与 `timeline.ts` 的更新一律人工审核后手动进行（符合 AGENTS.md「真实性最高优先级」原则）。
2. **交叉验证** —— 同一事件被 ≥2 个相互独立的信源报道才标记为已验证；单信源事件标注「待核实」。
3. **最小依赖** —— Node 22 自带 `fetch`（TLS 指纹被拦截时自动回退系统 curl），
   仅新增 `tsx`（运行 TS）、`fast-xml-parser`（解析 RSS）与 `cheerio`（HTML 列表页提取）。

## 目录结构

```
src/
├── config/sources.ts    # 信源注册表（新增信源先实测可用性，见文件头部注释）
├── lib/                 # 共享库：types / fetch(RSS) / fetch-html(列表页) / filter(AI 过滤) / dedupe / verify
├── scripts/             # collect.ts（采集）、report.ts（生成报告）
├── data/
│   ├── state.json       # 去重状态（提交到仓库，支撑增量采集）
│   └── raw/             # 每日原始采集结果（留档）
├── reports/             # 候选更新报告（人工审核入口，按日期归档）
└── log/                 # 开发记录
```

## 命令

```bash
npm run collect          # 采集所有 enabled 信源 → data/raw/
npm run collect:report   # 汇总 + 交叉验证 + 评分排序 → reports/YYYY-MM-DD.md
npm test                 # 单元测试（src/tests/，node:test）
```

定时执行由 `.github/workflows/collect.yml`（Phase 3）负责：每日 cron 运行，
结果以自动 PR 形式回流（仅 `src/data` 与 `src/reports`，不触碰 `docs/`）。

## 如何新增信源

1. 实测可用性：`curl -sIL -A "Mozilla/5.0" <feed-url>`，确认返回 200 且为 RSS/Atom；
2. 在 `config/sources.ts` 登记（字段见 `lib/types.ts` 的 `Source`），`notes` 记录实测日期与结果；
3. 泛科技信源设 `aiFilter: true`，采集时自动按 AI 相关性过滤（`lib/filter.ts`）；
4. 无 RSS 但为服务端渲染的站点，登记 `type: 'html'` 并配置 `selectors`（参考 caict 条目）；
   JS 渲染的 SPA 站点（如机器之心）保持 `enabled: false` 并在 `notes` 说明。

## 开发记录

见 `src/log/`，最新计划：`src/log/2026-08-16-plan.md`。

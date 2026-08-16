/**
 * 候选更新报告生成：读取当日（或指定日期）的 raw 采集结果 →
 * 事件聚类 + 交叉验证 → 渲染 Markdown 报告到 reports/YYYY-MM-DD.md。
 *
 * 报告仅供人工审核，脚本绝不直接修改 docs/。
 *
 * 用法：npm run collect:report [-- YYYY-MM-DD]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sources } from '../config/sources.ts';
import { clusterEvents, type EventCluster } from '../lib/verify.ts';
import type { CollectedItem, Source } from '../lib/types.ts';

const SRC_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RAW_DIR = join(SRC_ROOT, 'data', 'raw');
const REPORTS_DIR = join(SRC_ROOT, 'reports');

interface CollectResult {
  date: string;
  collectedAt: string;
  stats: { sourceId: string; fetched: number; filtered?: number; error?: string }[];
  items: CollectedItem[];
}

const sourceById = new Map<string, Source>(sources.map((s) => [s.id, s]));

function sourceLabel(id: string): string {
  const s = sourceById.get(id);
  return s ? `${s.name}（${id}）` : id;
}

/** 关键词 → 建议更新位置的简单规则（仅供人工参考，不做自动判断） */
function suggestTarget(cluster: EventCluster): string {
  const text = cluster.items.map((i) => `${i.title} ${i.summary ?? ''}`).join(' ');
  if (/白皮书|蓝皮书|研究报告|国家标准|行业标准/.test(text))
    return '书（treatises，如国别史/产业专题）';
  if (/融资|上市|收购|IPO|估值|成立公司|裁员|破产/.test(text)) return '世家（houses，机构史）';
  if (/逝世|去世|获图灵奖|获诺贝尔奖|出任|加入|离职/.test(text))
    return '列传（biographies，人物传记）';
  if (/发布|开源|推出|上线|升级|模型|芯片|智能体/.test(text))
    return '本纪（annals）/ 大事年表（timeline.ts）';
  return '大事年表（timeline.ts）候选，人工判断';
}

function renderCluster(cluster: EventCluster, index: number): string {
  const status = cluster.corroborated
    ? `✅ 已交叉验证（${cluster.sourceIds.length} 个独立信源）`
    : '⚠️ 待核实（单信源）';
  const lines: string[] = [
    `### ${index}. ${cluster.representativeTitle}`,
    '',
    `- 验证状态：${status}`,
    `- 最早发布：${cluster.earliestAt.slice(0, 10)}`,
    `- 建议更新位置：${suggestTarget(cluster)}`,
    '',
    '信源：',
  ];
  for (const item of cluster.items) {
    lines.push(`- [${sourceLabel(item.sourceId)}](${item.link})（${item.publishedAt.slice(0, 10)}）`);
    if (item.summary) lines.push(`  > ${item.summary}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const rawPath = join(RAW_DIR, `${date}.json`);
  let raw: CollectResult;
  try {
    raw = JSON.parse(await readFile(rawPath, 'utf-8')) as CollectResult;
  } catch {
    console.error(`[report] 找不到采集结果：${rawPath}（请先运行 npm run collect）`);
    process.exit(1);
  }

  const clusters = clusterEvents(raw.items);
  const corroborated = clusters
    .filter((c) => c.corroborated)
    .sort((a, b) => b.sourceIds.length - a.sourceIds.length);
  const pending = clusters.filter((c) => !c.corroborated);
  // 官方/智库类高可靠信源单独列出（即使单信源也值得优先人工核实）
  const highReliability = pending.filter((c) =>
    c.sourceIds.some((id) => sourceById.get(id)?.reliability === 'high'),
  );
  const others = pending.filter((c) => !highReliability.includes(c));

  const lines: string[] = [
    `# ${date} 候选更新报告`,
    '',
    `> 自动生成于 ${new Date().toISOString()}。本报告仅供人工审核，`,
    '> 确认事实后请按 AGENTS.md 写作规范手动更新 docs 与 timeline.ts。',
    '',
    '## 采集概况',
    '',
    '| 信源 | 抓取 | AI 过滤后 | 备注 |',
    '|---|---|---|---|',
    ...raw.stats.map(
      (s) =>
        `| ${sourceLabel(s.sourceId)} | ${s.fetched} | ${s.filtered != null ? s.fetched - s.filtered : '—'} | ${s.error ? `❌ ${s.error}` : ''} |`,
    ),
    '',
    `共 ${raw.items.length} 条新增条目，聚为 ${clusters.length} 个事件：`,
    `已交叉验证 ${corroborated.length} 个，待核实 ${pending.length} 个。`,
    '',
  ];

  let index = 1;
  if (corroborated.length > 0) {
    lines.push('## 已交叉验证（≥2 个独立信源）', '');
    for (const c of corroborated) lines.push(renderCluster(c, index++), '');
  }
  if (highReliability.length > 0) {
    lines.push('## 高可靠信源（官方/智库，单信源）', '');
    for (const c of highReliability) lines.push(renderCluster(c, index++), '');
  }
  if (others.length > 0) {
    lines.push('## 待核实（单信源）', '');
    for (const c of others) lines.push(renderCluster(c, index++), '');
  }

  await mkdir(REPORTS_DIR, { recursive: true });
  const outPath = join(REPORTS_DIR, `${date}.md`);
  await writeFile(outPath, lines.join('\n'), 'utf-8');
  console.log(`[report] 报告已生成 → ${outPath}`);
  console.log(
    `[report] ${clusters.length} 个事件：已验证 ${corroborated.length}，待核实 ${pending.length}`,
  );
}

main().catch((err) => {
  console.error('[report] 生成失败：', err);
  process.exit(1);
});

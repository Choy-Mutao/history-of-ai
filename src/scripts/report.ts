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
import { scoreCluster } from '../lib/score.ts';
import { isRecorded, loadKnownEvents } from '../lib/timeline-check.ts';
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

function renderCluster(cluster: EventCluster, index: number, score: number, recorded: boolean): string {
  const status = recorded
    ? '📖 年表已收录'
    : cluster.corroborated
      ? `✅ 已交叉验证（${cluster.sourceIds.length} 个独立信源）`
      : '⚠️ 待核实（单信源）';
  const lines: string[] = [
    `### ${index}. ${cluster.representativeTitle}`,
    '',
    `- 验证状态：${status}（重要性评分 ${score}）`,
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

/** 为未收录的已验证事件生成 timeline.ts 条目草稿（人工润色后粘贴） */
function renderTimelineDraft(cluster: EventCluster): string {
  const d = cluster.earliestAt.slice(0, 10);
  const [year, month] = d.split('-');
  const first = cluster.items[0];
  return [
    `{ year: '${year}', month: ${Number(month)},`,
    `  event: '${cluster.representativeTitle.replace(/'/g, "\\'")}', // TODO: 润色为书面语，补 event_en`,
    `  link: '', // TODO: 指向站内页面；一手来源：${first?.link ?? ''}`,
    `  type: 'product', importance: 'major' }, // TODO: 按实际类型调整`,
  ].join('\n');
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

  const known = loadKnownEvents();
  const clusters = clusterEvents(raw.items).map((c) => ({
    cluster: c,
    score: scoreCluster(c, sourceById),
    recorded: isRecorded(c, known),
  }));
  // 已收录的沉底，其余按评分降序
  const active = clusters
    .filter((c) => !c.recorded)
    .sort((a, b) => b.score - a.score || a.cluster.earliestAt.localeCompare(b.cluster.earliestAt));
  const recorded = clusters.filter((c) => c.recorded);
  const TOP_N = 10;
  const top = active.slice(0, TOP_N);
  const draftCandidates = active.filter((c) => c.cluster.corroborated).slice(0, 5);

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
    `共 ${raw.items.length} 条新增条目，聚为 ${clusters.length} 个事件：` +
      `待审 ${active.length} 个（已交叉验证 ${active.filter((c) => c.cluster.corroborated).length} 个），` +
      `年表已收录 ${recorded.length} 个（见文末附录）。`,
    '',
  ];

  // 今日要点：Top N 一行一条，3 分钟审完
  lines.push(`## 今日要点（Top ${top.length}）`, '');
  if (top.length === 0) {
    lines.push('（无待审事件）', '');
  }
  for (const [i, { cluster, score }] of top.entries()) {
    const first = cluster.items[0];
    const mark = cluster.corroborated ? `✅${cluster.sourceIds.length}信源` : '⚠️单信源';
    lines.push(
      `${i + 1}. [${cluster.representativeTitle}](${first?.link ?? ''})` +
        ` — ${mark} · ${cluster.earliestAt.slice(0, 10)} · 评分${score} · ${suggestTarget(cluster)}`,
    );
  }
  lines.push('');

  // timeline.ts 条目草稿
  if (draftCandidates.length > 0) {
    lines.push(
      '## timeline.ts 条目草稿',
      '',
      '> 已交叉验证且年表未收录的事件。人工核实、润色书面语后粘贴到',
      '> `docs/.vitepress/data/timeline.ts` 对应时代的 events 中。',
      '',
      '```ts',
    );
    for (const { cluster } of draftCandidates) lines.push(renderTimelineDraft(cluster), '');
    lines.push('```', '');
  }

  // 完整附录：全部待审事件按评分排序
  lines.push('## 附录：全部待审事件（按重要性评分排序）', '');
  for (const [i, { cluster, score }] of active.entries()) {
    lines.push(renderCluster(cluster, i + 1, score, false), '');
  }

  if (recorded.length > 0) {
    lines.push('## 附录：年表已收录（仅供参考，无需处理）', '');
    for (const [i, { cluster, score }] of recorded.entries()) {
      lines.push(renderCluster(cluster, i + 1, score, true), '');
    }
  }

  await mkdir(REPORTS_DIR, { recursive: true });
  const outPath = join(REPORTS_DIR, `${date}.md`);
  await writeFile(outPath, lines.join('\n'), 'utf-8');
  console.log(`[report] 报告已生成 → ${outPath}`);
  console.log(
    `[report] ${clusters.length} 个事件：待审 ${active.length}（Top ${top.length} 已摘要），已收录 ${recorded.length}`,
  );
}

main().catch((err) => {
  console.error('[report] 生成失败：', err);
  process.exit(1);
});

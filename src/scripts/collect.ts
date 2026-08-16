/**
 * 采集入口：读取信源注册表 → 抓取 enabled 的 RSS 信源 → 归一化 →
 * 增量去重（data/state.json）→ 新条目写入 data/raw/YYYY-MM-DD.json。
 *
 * 用法：npm run collect
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sources } from '../config/sources.ts';
import { fetchFeed } from '../lib/fetch.ts';
import { filterNewItems, loadState, saveState } from '../lib/dedupe.ts';
import type { CollectedItem } from '../lib/types.ts';

const SRC_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATE_PATH = join(SRC_ROOT, 'data', 'state.json');
const RAW_DIR = join(SRC_ROOT, 'data', 'raw');
const POLITE_DELAY_MS = 1000;

interface CollectResult {
  date: string;
  collectedAt: string;
  stats: { sourceId: string; fetched: number; error?: string }[];
  items: CollectedItem[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const active = sources.filter((s) => s.enabled && s.type === 'rss');
  console.log(`[collect] ${active.length} 个 RSS 信源待采集`);

  const state = await loadState(STATE_PATH);
  const allItems: CollectedItem[] = [];
  const stats: CollectResult['stats'] = [];

  for (const source of active) {
    try {
      const items = await fetchFeed(source);
      allItems.push(...items);
      stats.push({ sourceId: source.id, fetched: items.length });
      console.log(`[collect] ${source.name}（${source.id}）：抓取 ${items.length} 条`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stats.push({ sourceId: source.id, fetched: 0, error: message });
      console.warn(`[collect] ${source.name}（${source.id}）失败：${message}`);
    }
    await sleep(POLITE_DELAY_MS);
  }

  const fresh = filterNewItems(allItems, state, today);
  await saveState(STATE_PATH, state);

  await mkdir(RAW_DIR, { recursive: true });
  const outPath = join(RAW_DIR, `${today}.json`);

  // 同日重复运行时与已有留档合并，避免覆盖当日早些时候的新增条目
  let mergedItems = fresh;
  let mergedStats = stats;
  try {
    const existing = JSON.parse(await readFile(outPath, 'utf-8')) as CollectResult;
    const known = new Set(existing.items.map((i) => i.fingerprint));
    mergedItems = [...existing.items, ...fresh.filter((i) => !known.has(i.fingerprint))];
    mergedStats = stats.map((s) => {
      const prev = existing.stats.find((p) => p.sourceId === s.sourceId);
      return prev ? { ...s, fetched: s.fetched + prev.fetched } : s;
    });
  } catch {
    // 当日尚无留档，直接写入
  }

  const result: CollectResult = {
    date: today,
    collectedAt: new Date().toISOString(),
    stats: mergedStats,
    items: mergedItems,
  };
  await writeFile(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');

  console.log(
    `[collect] 完成：共抓取 ${allItems.length} 条，新增 ${fresh.length} 条，当日累计 ${mergedItems.length} 条 → ${outPath}`,
  );
}

main().catch((err) => {
  console.error('[collect] 采集失败：', err);
  process.exit(1);
});

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CollectedItem, DedupeState } from './types.ts';

/** 生成条目去重指纹（link + 规范化标题的 SHA-1 前 16 位） */
export function makeFingerprint(link: string, title: string): string {
  const normalized = `${link.trim()}|${title.trim().toLowerCase()}`;
  return createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

/** 读取去重状态；文件不存在时返回空状态 */
export async function loadState(path: string): Promise<DedupeState> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as DedupeState;
    return { seen: parsed.seen ?? {} };
  } catch {
    return { seen: {} };
  }
}

/** 持久化去重状态（key 排序，保证 diff 稳定） */
export async function saveState(path: string, state: DedupeState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(state.seen).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(path, JSON.stringify({ seen: sorted }, null, 2) + '\n', 'utf-8');
}

/**
 * 过滤出未见过的条目，并把新条目登记进 state（调用方负责 saveState）。
 * 同日重复条目（fingerprint 已在 state 中）直接跳过。
 */
export function filterNewItems(
  items: CollectedItem[],
  state: DedupeState,
  today: string,
): CollectedItem[] {
  const fresh: CollectedItem[] = [];
  for (const item of items) {
    if (state.seen[item.fingerprint]) continue;
    state.seen[item.fingerprint] = today;
    fresh.push(item);
  }
  return fresh;
}

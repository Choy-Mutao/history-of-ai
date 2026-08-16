import type { CollectedItem } from './types.ts';

/** 标题相似度阈值：Jaccard ≥ 0.45 或 包含度 ≥ 0.7 视为同一事件 */
const JACCARD_THRESHOLD = 0.45;
const CONTAINMENT_THRESHOLD = 0.7;
/** 日期邻近窗口：发布时间相差不超过 48 小时（±1 天） */
const DATE_WINDOW_MS = 48 * 60 * 60 * 1000;

/** 一个「事件簇」：被多个（或单个）信源报道的同一事件 */
export interface EventCluster {
  /** 簇内条目 */
  items: CollectedItem[];
  /** 涉及的独立信源 id（去重、排序） */
  sourceIds: string[];
  /** 是否被 ≥2 个相互独立的信源报道 */
  corroborated: boolean;
  /** 代表标题（取最短的一条，通常最干净） */
  representativeTitle: string;
  /** 簇内最早发布时间 */
  earliestAt: string;
}

/**
 * 标题分词：拉丁字母/数字按词切分，CJK 按二元组（bigram）切分。
 * 规则实现，不引入 NLP 库。
 */
export function tokenize(title: string): Set<string> {
  const lower = title.toLowerCase();
  const tokens = new Set<string>();
  for (const m of lower.matchAll(/[a-z0-9]+/g)) tokens.add(m[0]);
  for (const run of lower.matchAll(/[一-鿿]+/g)) {
    const chars = run[0];
    if (chars.length === 1) {
      tokens.add(chars);
    } else {
      for (let i = 0; i + 1 < chars.length; i++) tokens.add(chars.slice(i, i + 2));
    }
  }
  return tokens;
}

function similarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  if (intersection === 0) return 0;
  const jaccard = intersection / (a.size + b.size - intersection);
  const containment = intersection / Math.min(a.size, b.size);
  return Math.max(jaccard, containment >= CONTAINMENT_THRESHOLD ? 1 : 0);
}

/**
 * 事件聚类（并查集）：
 * 同一对条目满足「不同信源 + 日期邻近 + 标题相似」即合并为一簇。
 */
export function clusterEvents(items: CollectedItem[]): EventCluster[] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const tokenSets = items.map((it) => tokenize(it.title));
  const times = items.map((it) => new Date(it.publishedAt).getTime());

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].sourceId === items[j].sourceId) continue;
      if (Math.abs(times[i] - times[j]) > DATE_WINDOW_MS) continue;
      if (similarity(tokenSets[i], tokenSets[j]) >= JACCARD_THRESHOLD) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  return [...groups.values()].map((indices) => {
    const clusterItems = indices.map((i) => items[i]);
    const sourceIds = [...new Set(clusterItems.map((it) => it.sourceId))].sort();
    const representativeTitle = clusterItems.reduce((a, b) =>
      a.title.length <= b.title.length ? a : b,
    ).title;
    const earliestAt = clusterItems.reduce((a, b) =>
      a.publishedAt <= b.publishedAt ? a : b,
    ).publishedAt;
    return {
      items: clusterItems,
      sourceIds,
      corroborated: sourceIds.length >= 2,
      representativeTitle,
      earliestAt,
    };
  });
}

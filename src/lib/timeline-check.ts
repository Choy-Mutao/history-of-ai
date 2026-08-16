import { timeline } from '../../docs/.vitepress/data/timeline.ts';
import { tokenize } from './verify.ts';
import type { EventCluster } from './verify.ts';

/**
 * 已收录检测：把候选事件与 docs 大事年表（timeline.ts）比对，
 * 避免报告反复建议已经写进书里的内容。
 *
 * 判据：同年 + 标题与年表事件描述有显著重合
 * （Jaccard ≥ 0.25 或包含度 ≥ 0.5，年表描述与新闻标题措辞差异大，阈值从宽）。
 */
interface KnownEvent {
  year: string;
  event: string;
  tokens: Set<string>;
}

let cache: KnownEvent[] | null = null;

export function loadKnownEvents(): KnownEvent[] {
  if (cache) return cache;
  cache = timeline.flatMap((era) =>
    era.events.map((e) => ({
      year: e.year,
      event: e.event,
      tokens: tokenize(`${e.event} ${e.event_en ?? ''}`),
    })),
  );
  return cache;
}

export function isRecorded(cluster: EventCluster, known?: KnownEvent[]): boolean {
  const events = known ?? loadKnownEvents();
  const year = cluster.earliestAt.slice(0, 4);
  const titleTokens = tokenize(cluster.representativeTitle);
  for (const e of events) {
    if (e.year !== year) continue;
    let intersection = 0;
    for (const t of titleTokens) if (e.tokens.has(t)) intersection++;
    if (intersection === 0) continue;
    const jaccard = intersection / (titleTokens.size + e.tokens.size - intersection);
    const containment = intersection / Math.min(titleTokens.size, e.tokens.size);
    if (jaccard >= 0.25 || containment >= 0.5) return true;
  }
  return false;
}

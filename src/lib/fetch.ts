import { XMLParser } from 'fast-xml-parser';
import type { CollectedItem, Source } from './types.ts';
import { makeFingerprint } from './dedupe.ts';

const USER_AGENT =
  'history-of-ai-collector/0.1 (+https://github.com/zsjunai/history-of-ai)';
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const SUMMARY_MAX_LEN = 200;

/** 带超时与重试的抓取，返回响应文本 */
async function fetchText(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** 去除 HTML 标签并压缩空白 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    // fast-xml-parser 解析 <link href="..."/> 时可能产出对象
    const obj = value as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text']);
    if ('@_href' in obj) return String(obj['@_href']);
    return '';
  }
  return String(value);
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** 解析 RSS 2.0 条目 */
function parseRssItems(doc: Record<string, unknown>): CollectedItem[] {
  const rss = doc['rss'] as Record<string, unknown> | undefined;
  const channel = rss?.['channel'] as Record<string, unknown> | undefined;
  if (!channel) return [];
  return toArray(channel['item'] as Record<string, unknown>[]).map((raw) => {
    const title = toText(raw['title']).trim();
    const link = toText(raw['link']).trim();
    const pubDate = toText(raw['pubDate']) || toText(raw['dc:date']);
    const summary = stripHtml(toText(raw['description'])).slice(0, SUMMARY_MAX_LEN);
    return {
      sourceId: '',
      title,
      link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      summary: summary || undefined,
      fingerprint: makeFingerprint(link, title),
    };
  });
}

/** 解析 Atom 条目 */
function parseAtomEntries(doc: Record<string, unknown>): CollectedItem[] {
  const feed = doc['feed'] as Record<string, unknown> | undefined;
  if (!feed) return [];
  return toArray(feed['entry'] as Record<string, unknown>[]).map((raw) => {
    const title = toText(raw['title']).trim();
    const linkRaw = raw['link'];
    const linkNode = Array.isArray(linkRaw)
      ? (linkRaw.find((l) => (l as Record<string, unknown>)['@_rel'] === 'alternate') ?? linkRaw[0])
      : linkRaw;
    const link = toText(linkNode).trim();
    const published = toText(raw['published']) || toText(raw['updated']);
    const summary = stripHtml(toText(raw['summary']) || toText(raw['content'])).slice(0, SUMMARY_MAX_LEN);
    return {
      sourceId: '',
      title,
      link,
      publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
      summary: summary || undefined,
      fingerprint: makeFingerprint(link, title),
    };
  });
}

/** 抓取并解析单个 RSS/Atom 信源，返回归一化条目（sourceId 已填充） */
export async function fetchFeed(source: Source): Promise<CollectedItem[]> {
  const xml = await fetchText(source.url);
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '#text' });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const items = doc['rss'] ? parseRssItems(doc) : parseAtomEntries(doc);
  return items
    .filter((item) => item.title && item.link)
    .map((item) => ({ ...item, sourceId: source.id }));
}

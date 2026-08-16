import * as cheerio from 'cheerio';
import type { CollectedItem, Source } from './types.ts';
import { fetchText } from './fetch.ts';
import { makeFingerprint } from './dedupe.ts';

/**
 * HTML 列表页采集（服务端渲染站点专用）：
 * 按 source.selectors 提取「标题 + 链接 + 日期」，归一化为 CollectedItem。
 *
 * 注意：JS 渲染的 SPA 站点（如机器之心、智源社区）不适用，
 * 这类站点请保持 enabled: false 并在 notes 中说明。
 */
export async function fetchHtmlList(source: Source): Promise<CollectedItem[]> {
  const sel = source.selectors;
  if (!sel) throw new Error(`信源 ${source.id} 缺少 selectors 配置`);

  const html = await fetchText(source.url);
  const $ = cheerio.load(html);
  const linkPattern = sel.linkPattern ? new RegExp(sel.linkPattern) : null;
  const items: CollectedItem[] = [];

  $(sel.item).each((_, el) => {
    const a = $(el);
    const href = a.attr('href')?.trim();
    if (!href || href.startsWith('javascript:')) return;
    if (linkPattern && !linkPattern.test(href)) return;

    const title = (sel.titleAttr ? a.attr(sel.titleAttr) : a.text())?.trim() ?? '';
    if (!title) return;

    const link = new URL(href, source.url).toString();

    let publishedAt = new Date().toISOString();
    if (sel.date) {
      const scope = sel.dateScope ? a.closest(sel.dateScope) : a.parent();
      // 范围内可能有多个匹配节点（如标题 span 与日期 span 同选择器），取第一个含日期的
      scope.find(sel.date).each((_, node) => {
        const m = $(node).text().match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
        if (m) {
          publishedAt = new Date(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T00:00:00.000Z`).toISOString();
          return false; // break
        }
      });
    }

    items.push({
      sourceId: source.id,
      title,
      link,
      publishedAt,
      fingerprint: makeFingerprint(link, title),
    });
  });

  return items;
}

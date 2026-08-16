import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAiRelated, filterAiRelated } from '../lib/filter.ts';
import { makeFingerprint, filterNewItems } from '../lib/dedupe.ts';
import type { CollectedItem, DedupeState } from '../lib/types.ts';

const mk = (title: string, summary?: string): CollectedItem => ({
  sourceId: 'x',
  title,
  link: `https://example.com/${title.length}`,
  publishedAt: '2026-08-16T08:00:00.000Z',
  summary,
  fingerprint: title,
});

test('filter：AI 相关条目保留', () => {
  assert.ok(isAiRelated(mk('DeepSeek 发布新一代大模型')));
  assert.ok(isAiRelated(mk('OpenAI announces GPT-6')));
  assert.ok(isAiRelated(mk('某公司发布新款手机', '搭载自研 AI 芯片与智能体功能')));
});

test('filter：无关条目过滤', () => {
  assert.ok(!isAiRelated(mk('某品牌发布新款电饭煲')));
  assert.ok(!isAiRelated(mk('周末郊游好去处')));
});

test('filterAiRelated：分组正确', () => {
  const items = [mk('大模型开源'), mk('电饭煲评测')];
  const [kept, dropped] = filterAiRelated(items);
  assert.equal(kept.length, 1);
  assert.equal(dropped.length, 1);
  assert.equal(kept[0].title, '大模型开源');
});

test('dedupe：同 link+title 指纹稳定，不同则不同', () => {
  assert.equal(makeFingerprint('https://a.com/1', '标题'), makeFingerprint('https://a.com/1', '标题'));
  assert.notEqual(makeFingerprint('https://a.com/1', '标题'), makeFingerprint('https://a.com/2', '标题'));
  assert.notEqual(makeFingerprint('https://a.com/1', '标题'), makeFingerprint('https://a.com/1', '别的标题'));
});

test('filterNewItems：已见条目跳过，新条目登记', () => {
  const state: DedupeState = { seen: { 旧条目: '2026-08-15' } };
  const items = [mk('旧条目'), mk('新条目')];
  const fresh = filterNewItems(items, state, '2026-08-16');
  assert.deepEqual(fresh.map((i) => i.title), ['新条目']);
  assert.equal(state.seen['新条目'], '2026-08-16');
  // 再次过滤同批条目，全部跳过
  assert.equal(filterNewItems(items, state, '2026-08-16').length, 0);
});

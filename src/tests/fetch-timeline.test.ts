import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toText } from '../lib/fetch.ts';
import { isRecorded } from '../lib/timeline-check.ts';
import type { EventCluster } from '../lib/verify.ts';

test('toText：原始字符串', () => {
  assert.equal(toText('hello'), 'hello');
  assert.equal(toText(123), '123');
  assert.equal(toText(null), '');
  assert.equal(toText(undefined), '');
});

test('toText：CDATA 对象', () => {
  assert.equal(toText({ '#text': '标题' }), '标题');
});

test('toText：换行包裹 CDATA 解析为数组时递归解包（回归：极客公园/开源中国 0 条目 bug）', () => {
  assert.equal(toText([{ '#text': '标题' }]), '标题');
  assert.deepEqual(toText([]), '');
});

test('toText：Atom link 对象取 href', () => {
  assert.equal(toText({ '@_href': 'https://a.com/1', '@_rel': 'alternate' }), 'https://a.com/1');
});

const mkCluster = (title: string, earliestAt: string): EventCluster => ({
  items: [],
  sourceIds: ['a'],
  corroborated: false,
  representativeTitle: title,
  earliestAt,
});

const known = [
  { year: '2026', event: 'DeepSeek 发布 V3 模型并开源', tokens: new Set(['deepseek', '发布', '布 v', 'v3', '模型', '开源']) },
];

test('isRecorded：同年且显著重合判为已收录', () => {
  // 与已知事件共享 deepseek/发布/模型 等 token
  const cluster = mkCluster('DeepSeek 发布 V3 模型', '2026-01-01T00:00:00.000Z');
  assert.ok(isRecorded(cluster, known));
});

test('isRecorded：年份不同不判收录', () => {
  const cluster = mkCluster('DeepSeek 发布 V3 模型', '2025-01-01T00:00:00.000Z');
  assert.ok(!isRecorded(cluster, known));
});

test('isRecorded：无关事件不判收录', () => {
  const cluster = mkCluster('英伟达财报超预期', '2026-01-01T00:00:00.000Z');
  assert.ok(!isRecorded(cluster, known));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterEvents, tokenize } from '../lib/verify.ts';
import type { CollectedItem } from '../lib/types.ts';

const mk = (sourceId: string, title: string, day: string): CollectedItem => ({
  sourceId,
  title,
  link: `https://example.com/${sourceId}/${title.length}`,
  publishedAt: `${day}T08:00:00.000Z`,
  fingerprint: `${sourceId}-${title}`,
});

test('tokenize：拉丁词 + CJK 二元组', () => {
  const tokens = tokenize('DeepSeek 发布模型');
  assert.ok(tokens.has('deepseek'));
  assert.ok(tokens.has('发布'));
  assert.ok(tokens.has('布模'));
  assert.ok(tokens.has('模型'));
});

test('clusterEvents：跨信源同事件聚为一簇并标记已验证', () => {
  const items = [
    mk('a', 'DeepSeek 发布 V4 模型，性能大幅领先', '2026-08-16'),
    mk('b', 'DeepSeek发布V4模型：性能大幅领先', '2026-08-16'),
  ];
  const clusters = clusterEvents(items);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].corroborated, true);
  assert.deepEqual(clusters[0].sourceIds, ['a', 'b']);
});

test('clusterEvents：±1 天日期窗口内仍可聚类', () => {
  const items = [
    mk('a', 'DeepSeek 发布 V4 模型，性能大幅领先', '2026-08-16'),
    mk('b', 'DeepSeek 发布 V4 模型 性能大幅领先', '2026-08-17'),
  ];
  assert.equal(clusterEvents(items).length, 1);
});

test('clusterEvents：同一信源不聚类', () => {
  const items = [
    mk('a', 'DeepSeek 发布 V4 模型，性能大幅领先', '2026-08-16'),
    mk('a', 'DeepSeek 发布 V4 模型：性能大幅领先', '2026-08-16'),
  ];
  const clusters = clusterEvents(items);
  assert.equal(clusters.length, 2);
  assert.ok(clusters.every((c) => !c.corroborated));
});

test('clusterEvents：超出日期窗口不聚类', () => {
  const items = [
    mk('a', 'DeepSeek 发布 V4 模型，性能大幅领先', '2026-08-10'),
    mk('b', 'DeepSeek 发布 V4 模型：性能大幅领先', '2026-08-16'),
  ];
  assert.equal(clusterEvents(items).length, 2);
});

test('clusterEvents：无关事件各自独立', () => {
  const items = [
    mk('a', '英伟达财报超预期', '2026-08-16'),
    mk('b', '阿里通义千问开源新模型', '2026-08-16'),
  ];
  assert.equal(clusterEvents(items).length, 2);
});

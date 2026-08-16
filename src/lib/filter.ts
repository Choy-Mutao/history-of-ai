import type { CollectedItem } from './types.ts';

/**
 * AI 相关性过滤：对泛科技信源（少数派、IT之家、开源中国等）降噪。
 * 关键词命中标题或摘要即保留；刻意从宽，宁可误留不可误杀。
 */
const AI_KEYWORDS = [
  // 核心术语
  '人工智能', '大模型', '大语言模型', '机器学习', '深度学习', '神经网络',
  'transformer', '扩散模型', '强化学习', '多模态', '生成式', 'aigc',
  '具身智能', '人形机器人', '智能驾驶', '自动驾驶', '智能体',
  // 模型与产品
  'gpt', 'chatgpt', 'claude', 'gemini', 'deepseek', 'llama', 'qwen',
  '通义', '文心', '混元', '豆包', 'kimi', '智谱', '讯飞', '星火',
  'copilot', 'sora', 'midjourney', 'agent', 'rag', '提示词',
  // 算力与基础设施
  '英伟达', 'nvidia', '算力', 'gpu', '昇腾', '寒武纪', '推理模型',
  // 机构与人物
  'openai', 'anthropic', 'deepmind', 'ai实验室',
];

const AI_PATTERN = new RegExp(AI_KEYWORDS.join('|'), 'i');

/** 判断条目是否与 AI 相关 */
export function isAiRelated(item: CollectedItem): boolean {
  return AI_PATTERN.test(`${item.title} ${item.summary ?? ''}`);
}

/** 过滤条目列表，返回 [保留, 被过滤] */
export function filterAiRelated(items: CollectedItem[]): [CollectedItem[], CollectedItem[]] {
  const kept: CollectedItem[] = [];
  const dropped: CollectedItem[] = [];
  for (const item of items) (isAiRelated(item) ? kept : dropped).push(item);
  return [kept, dropped];
}

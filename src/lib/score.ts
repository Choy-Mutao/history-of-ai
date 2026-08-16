import type { Source } from './types.ts';
import type { EventCluster } from './verify.ts';

/**
 * 事件重要性评分：用于报告降噪排序。
 * 评分是启发式的，只决定阅读顺序，不影响事实判断。
 */
const MILESTONE_KEYWORDS =
  /发布|开源|上线|白皮书|蓝皮书|研究报告|突破|首次|上市|融资|收购|逝世|去世|图灵奖|诺贝尔奖|国家标准/;

export function scoreCluster(cluster: EventCluster, sourceById: Map<string, Source>): number {
  let score = 0;
  // 多信源交叉验证是最重要的信号
  if (cluster.corroborated) score += 3;
  score += Math.min(cluster.sourceIds.length - 1, 3);
  // 官方/智库类高可靠信源
  if (cluster.sourceIds.some((id) => sourceById.get(id)?.reliability === 'high')) score += 2;
  // 里程碑类关键词
  const text = cluster.items.map((i) => i.title).join(' ');
  if (MILESTONE_KEYWORDS.test(text)) score += 2;
  return score;
}

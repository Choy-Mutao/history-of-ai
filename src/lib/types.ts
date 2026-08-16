/**
 * 信源采集子系统核心类型定义。
 *
 * 设计目标（见 src/log/2026-08-16-plan.md）：
 * 1. 实时追踪国内 AI 领域最新动态与研究报告；
 * 2. 多信源交叉验证，辅助内容真实性校验；
 * 3. 只产出候选更新报告，docs 更新一律人工审核后进行。
 */

/** 信源类别 */
export type SourceCategory =
  | 'official' // 官方机构 / 智库（如中国信通院、智源研究院）
  | 'media' // 行业媒体（如机器之心、量子位）
  | 'lab' // 高校 / 研究机构实验室
  | 'company'; // 企业研究院 / 厂商官方渠道

/** 信源可靠度，用于报告中的验证权重 */
export type Reliability = 'high' | 'medium-high' | 'medium';

/** 信源注册项 */
export interface Source {
  /** 唯一标识，小写英文 + 连字符（如 `qbitai`） */
  id: string;
  /** 信源中文名称 */
  name: string;
  /** RSS/Atom 地址或列表页地址 */
  url: string;
  /** 采集方式：rss（Phase 1 支持）/ html（占位，Phase 2+ 再实现） */
  type: 'rss' | 'html';
  category: SourceCategory;
  reliability: Reliability;
  /** 是否参与采集；未实测可用的一律 false */
  enabled: boolean;
  /** 备注：可用性实测记录、降级原因等 */
  notes?: string;
}

/** 归一化后的采集条目 */
export interface CollectedItem {
  /** 来源信源 id */
  sourceId: string;
  title: string;
  link: string;
  /** 发布时间，ISO 8601 */
  publishedAt: string;
  /** 摘要（RSS 中带则保留，纯文本、截断） */
  summary?: string;
  /** 去重指纹（由 link + title 生成） */
  fingerprint: string;
}

/** 交叉验证结果 */
export interface VerifyResult {
  item: CollectedItem;
  /** 是否被 ≥2 个相互独立的信源报道 */
  corroborated: boolean;
  /** 报道同一事件的其他信源 id 列表 */
  corroboratingSources: string[];
}

/** 增量去重状态（持久化在 src/data/state.json，提交到仓库） */
export interface DedupeState {
  /** fingerprint -> 首次见到日期（YYYY-MM-DD） */
  seen: Record<string, string>;
}

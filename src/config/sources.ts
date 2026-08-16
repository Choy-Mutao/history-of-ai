import type { Source } from '../lib/types.ts';

/**
 * 信源注册表（国内信源为主）。
 *
 * 维护规则：
 * - 新增信源前必须实测可用性（curl 检查 HTTP 状态与 Content-Type），
 *   并在 notes 中记录实测日期与结果；
 * - 无公开 RSS 的信源登记为 `type: 'html'` 且 `enabled: false`，
 *   待 Phase 2+ 实现 HTML 采集后再启用；
 * - 官方/智库类信源 reliability 标 high，报告中单独列出。
 *
 * 最近一轮实测：2026-08-16（见各条 notes）。
 */
export const sources: Source[] = [
  // ── 行业媒体（已实测 RSS 可用，2026-08-16）────────────────────
  {
    id: 'qbitai',
    name: '量子位',
    url: 'https://www.qbitai.com/feed',
    type: 'rss',
    category: 'media',
    reliability: 'medium',
    enabled: true,
    notes: '2026-08-16 实测 200 application/rss+xml',
  },
  {
    id: 'leiphone',
    name: '雷锋网',
    url: 'https://www.leiphone.com/feed',
    type: 'rss',
    category: 'media',
    reliability: 'medium',
    enabled: true,
    notes: '2026-08-16 实测 200 application/rss+xml',
  },
  {
    id: 'infoq-cn',
    name: 'InfoQ 中文',
    url: 'https://www.infoq.cn/feed',
    type: 'rss',
    category: 'media',
    reliability: 'medium',
    enabled: true,
    notes: '2026-08-16 实测 200 application/xml',
  },
  {
    id: 'sspai',
    name: '少数派',
    url: 'https://sspai.com/feed',
    type: 'rss',
    category: 'media',
    reliability: 'medium',
    enabled: true,
    notes: '2026-08-16 实测 200 application/xml；泛科技媒体，采集后需按 AI 相关性过滤',
  },

  // ── 行业媒体（无可用 RSS，占位待 HTML 采集）────────────────────
  {
    id: 'jiqizhixin',
    name: '机器之心',
    url: 'https://www.jiqizhixin.com/',
    type: 'html',
    category: 'media',
    reliability: 'medium',
    enabled: false,
    notes: '2026-08-16 实测 /rss 返回 HTML 页面而非 feed；可考虑 RSSHub 路由或 HTML 采集',
  },
  {
    id: 'kr36',
    name: '36氪',
    url: 'https://36kr.com/',
    type: 'html',
    category: 'media',
    reliability: 'medium',
    enabled: false,
    notes: '2026-08-16 实测 /feed 返回 200 但 Content-Type 为 text/html，非有效 feed',
  },
  {
    id: 'zhidx',
    name: '智东西',
    url: 'https://zhidx.com/',
    type: 'html',
    category: 'media',
    reliability: 'medium',
    enabled: false,
    notes: '2026-08-16 实测 /feed 返回 500',
  },

  // ── 官方 / 智库（占位待 HTML 采集）─────────────────────────────
  {
    id: 'caict',
    name: '中国信息通信研究院',
    url: 'http://www.caict.ac.cn/kxyj/qwfb/bps/',
    type: 'html',
    category: 'official',
    reliability: 'high',
    enabled: false,
    notes: '白皮书发布页；2026-08-16 实测官网返回 412（反爬），需浏览器态或人工订阅',
  },
  {
    id: 'baai',
    name: '智源研究院',
    url: 'https://hub.baai.ac.cn/',
    type: 'html',
    category: 'official',
    reliability: 'high',
    enabled: false,
    notes: '智源社区；2026-08-16 实测 /feed 返回 404',
  },
  {
    id: 'shanghai-ai-lab',
    name: '上海人工智能实验室',
    url: 'https://www.shlab.org.cn/news',
    type: 'html',
    category: 'official',
    reliability: 'high',
    enabled: false,
    notes: '未实测 RSS，官网新闻页，待 HTML 采集方案',
  },

  // ── 企业研究院 / 厂商官方渠道（占位）───────────────────────────
  {
    id: 'damo-academy',
    name: '阿里达摩院',
    url: 'https://damo.alibaba.com/news',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官网无公开 RSS，待 HTML 采集方案',
  },
  {
    id: 'tencent-ai-lab',
    name: '腾讯 AI Lab',
    url: 'https://ai.tencent.com/ailab/zh/news',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官网无公开 RSS，待 HTML 采集方案',
  },
  {
    id: 'zhipu-ai',
    name: '智谱 AI',
    url: 'https://www.zhipuai.cn/news',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官网无公开 RSS，待 HTML 采集方案',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://api-docs.deepseek.com/zh-cn/news/news250825',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官方文档站新闻页，无 RSS，待 HTML 采集方案',
  },
  {
    id: 'moonshot',
    name: '月之暗面',
    url: 'https://www.moonshot.cn/',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官网无公开 RSS，待 HTML 采集方案',
  },
  {
    id: 'baidu-research',
    name: '百度研究院',
    url: 'http://research.baidu.com/',
    type: 'html',
    category: 'company',
    reliability: 'medium-high',
    enabled: false,
    notes: '官网无公开 RSS，待 HTML 采集方案',
  },
];

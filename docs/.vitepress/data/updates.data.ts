/**
 * 每日采集动态数据加载器（构建时执行）。
 *
 * 读取 src/data/raw/YYYY-MM-DD.json，复用采集子系统的聚类/评分/已收录检测，
 * 按事件**发布时间**（而非采集时间）分组倒序输出，供 UpdatesPage 组件渲染。
 *
 * 数据流：collect PR 合并 → main 更新 → deploy 构建时本加载器产出静态页面。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { clusterEvents } from '../../../src/lib/verify'
import { scoreCluster } from '../../../src/lib/score'
import { isRecorded, loadKnownEvents } from '../../../src/lib/timeline-check'
import { sources } from '../../../src/config/sources'
import type { CollectedItem } from '../../../src/lib/types'

/** 最多展示最近多少天的采集数据 */
const MAX_DAYS = 30
/** 每个事件最多列出几条信源链接 */
const MAX_SOURCES_PER_CLUSTER = 4

interface RawFile {
  date: string
  stats: { sourceId: string; fetched: number; filtered?: number; error?: string }[]
  items: CollectedItem[]
}

export interface UpdateSource {
  name: string
  link: string
}

export interface UpdateCluster {
  title: string
  summary?: string
  date: string
  corroborated: boolean
  sourceCount: number
  score: number
  recorded: boolean
  sources: UpdateSource[]
}

export interface UpdateDay {
  /** 事件发布日期（分组键） */
  date: string
  /** 贡献本日事件的采集运行日期 */
  collectedDates: string[]
  clusters: UpdateCluster[]
}

declare const data: UpdateDay[]
export { data }

const sourceNameById = new Map(sources.map((s) => [s.id, s.name]))

export default {
  watch: ['../../../src/data/raw/*.json'],
  async load(): Promise<UpdateDay[]> {
    const rawDir = join(process.cwd(), 'src', 'data', 'raw')
    let files: string[]
    try {
      files = (await readdir(rawDir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    } catch {
      return []
    }
    files = files.sort().reverse().slice(0, MAX_DAYS)

    const known = loadKnownEvents()
    const scoreMap = new Map(sources.map((s) => [s.id, s]))
    /** 按发布日期聚合：published -> { collectedDates, clusters } */
    const byPublished = new Map<string, { collectedDates: Set<string>; clusters: UpdateCluster[] }>()

    for (const file of files) {
      let raw: RawFile
      try {
        raw = JSON.parse(await readFile(join(rawDir, file), 'utf-8')) as RawFile
      } catch {
        continue
      }
      if (!raw.items?.length) continue

      const clusters: UpdateCluster[] = clusterEvents(raw.items).map((c) => ({
        title: c.representativeTitle,
        summary: c.items.find((i) => i.summary)?.summary,
        date: c.earliestAt.slice(0, 10),
        corroborated: c.corroborated,
        sourceCount: c.sourceIds.length,
        score: scoreCluster(c, scoreMap),
        recorded: isRecorded(c, known),
        sources: c.items.slice(0, MAX_SOURCES_PER_CLUSTER).map((i) => ({
          name: sourceNameById.get(i.sourceId) ?? i.sourceId,
          link: i.link,
        })),
      }))

      for (const c of clusters) {
        let day = byPublished.get(c.date)
        if (!day) {
          day = { collectedDates: new Set(), clusters: [] }
          byPublished.set(c.date, day)
        }
        day.collectedDates.add(raw.date)
        day.clusters.push(c)
      }
    }

    return [...byPublished.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, day]) => ({
        date,
        collectedDates: [...day.collectedDates].sort().reverse(),
        clusters: day.clusters.sort(
          (a, b) => Number(a.recorded) - Number(b.recorded) || b.score - a.score,
        ),
      }))
  },
}

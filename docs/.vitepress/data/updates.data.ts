/**
 * 每日采集动态数据加载器（构建时执行）。
 *
 * 读取 src/data/raw/YYYY-MM-DD.json，复用采集子系统的聚类/评分/已收录检测，
 * 输出按日期倒序的分组数据，供 UpdatesPage 组件渲染。
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
  date: string
  stats: { name: string; fetched: number; kept: number | null; error?: string }[]
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
    const days: UpdateDay[] = []

    for (const file of files) {
      let raw: RawFile
      try {
        raw = JSON.parse(await readFile(join(rawDir, file), 'utf-8')) as RawFile
      } catch {
        continue
      }
      if (!raw.items?.length) continue

      const clusters: UpdateCluster[] = clusterEvents(raw.items)
        .map((c) => ({
          title: c.representativeTitle,
          summary: c.items.find((i) => i.summary)?.summary,
          date: c.earliestAt.slice(0, 10),
          corroborated: c.corroborated,
          sourceCount: c.sourceIds.length,
          score: scoreCluster(c, new Map(sources.map((s) => [s.id, s]))),
          recorded: isRecorded(c, known),
          sources: c.items.slice(0, MAX_SOURCES_PER_CLUSTER).map((i) => ({
            name: sourceNameById.get(i.sourceId) ?? i.sourceId,
            link: i.link,
          })),
        }))
        .sort((a, b) => Number(a.recorded) - Number(b.recorded) || b.score - a.score)

      days.push({
        date: raw.date,
        stats: raw.stats.map((s) => ({
          name: sourceNameById.get(s.sourceId) ?? s.sourceId,
          fetched: s.fetched,
          kept: s.filtered != null ? s.fetched - s.filtered : null,
          error: s.error,
        })),
        clusters,
      })
    }

    return days
  },
}

<template>
  <div class="updates-page">
    <!-- 机器采集声明 -->
    <div class="disclaimer">
      <span class="disclaimer-icon">⚠</span>
      <div>
        <strong>本页由机器每日自动采集生成，事件未经人工核实。</strong>
        <p>
          经人工核实的内容会收录进正史各卷（本纪 / 世家 / 列传 / 书 / 大事年表）。
          绿色「已验证」表示同一事件被 ≥2 个相互独立的信源报道；黄色「待核实」为单信源报道，请自行甄别。
        </p>
      </div>
    </div>

    <div v-if="days.length === 0" class="empty">暂无采集数据。</div>

    <div v-else class="updates-layout">
      <!-- 左侧采集时间线：年 > 月 > 日 -->
      <aside class="timeline-nav">
        <div v-for="y in tree" :key="y.year" class="tl-year">
          <button class="tl-node tl-year-node" @click="toggle(y.year)">
            <span class="tl-chevron" :class="{ open: openKeys.has(y.year) }">▸</span>
            <span class="tl-label">{{ y.year }} 年</span>
            <span class="tl-count">{{ y.count }}</span>
          </button>
          <div v-show="openKeys.has(y.year)" class="tl-children">
            <div v-for="m in y.months" :key="m.key" class="tl-month">
              <button class="tl-node tl-month-node" @click="toggle(m.key)">
                <span class="tl-chevron" :class="{ open: openKeys.has(m.key) }">▸</span>
                <span class="tl-label">{{ m.month }} 月</span>
                <span class="tl-count">{{ m.count }}</span>
              </button>
              <div v-show="openKeys.has(m.key)" class="tl-children tl-days">
                <button
                  v-for="d in m.days"
                  :key="d.date"
                  class="tl-node tl-day-node"
                  :class="{ active: d.date === selectedDate }"
                  @click="selectedDate = d.date"
                >
                  <span class="tl-dot"></span>
                  <span class="tl-label">{{ d.day }} 日</span>
                  <span class="tl-count">{{ d.count }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧：仅显示选中日期 -->
      <section v-if="selectedDay" class="day-block">
        <header class="day-header">
          <h2 class="day-title">{{ formatDate(selectedDay.date) }}</h2>
          <div class="day-stats">
            <span
              v-for="s in selectedDay.stats"
              :key="s.name"
              class="stat-badge"
              :class="{ 'stat-error': s.error }"
              :title="s.error || undefined"
            >
              {{ s.name }} {{ s.error ? '失败' : s.kept != null ? `${s.fetched}/${s.kept}` : s.fetched }}
            </span>
          </div>
        </header>

        <article
          v-for="(c, i) in selectedDay.clusters"
          :key="i"
          class="event-card"
          :class="{ 'is-recorded': c.recorded }"
        >
          <div class="event-head">
            <span v-if="c.recorded" class="badge badge-recorded">📖 年表已收录</span>
            <span v-else-if="c.corroborated" class="badge badge-verified">✅ 已验证 · {{ c.sourceCount }} 信源</span>
            <span v-else class="badge badge-pending">⚠️ 待核实</span>
            <a :href="c.sources[0]?.link" target="_blank" rel="noopener" class="event-title">
              {{ c.title }}
            </a>
            <span class="event-date">{{ c.date }}</span>
          </div>
          <p v-if="c.summary" class="event-summary">{{ c.summary }}</p>
          <div class="event-sources">
            <a
              v-for="(s, j) in c.sources"
              :key="j"
              :href="s.link"
              target="_blank"
              rel="noopener"
              class="source-badge"
            >{{ s.name }}</a>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { data as days } from '../../data/updates.data.js'

interface TlDay {
  date: string
  day: number
  count: number
}
interface TlMonth {
  key: string
  month: number
  count: number
  days: TlDay[]
}
interface TlYear {
  year: string
  count: number
  months: TlMonth[]
}

/** 年 > 月 > 日 三级树（days 已按日期倒序） */
const tree = computed<TlYear[]>(() => {
  const years: TlYear[] = []
  for (const d of days) {
    const [year, month, day] = d.date.split('-')
    let y = years.find((v) => v.year === year)
    if (!y) {
      y = { year, count: 0, months: [] }
      years.push(y)
    }
    const monthKey = `${year}-${month}`
    let m = y.months.find((v) => v.key === monthKey)
    if (!m) {
      m = { key: monthKey, month: Number(month), count: 0, days: [] }
      y.months.push(m)
    }
    m.days.push({ date: d.date, day: Number(day), count: d.clusters.length })
    m.count += d.clusters.length
    y.count += d.clusters.length
  }
  return years
})

/** 默认选中最新一天，并展开其所在的年、月 */
const selectedDate = ref(days[0]?.date ?? '')
const openKeys = reactive(new Set<string>())
if (days[0]) {
  const [year, month] = days[0].date.split('-')
  openKeys.add(year)
  openKeys.add(`${year}-${month}`)
}

function toggle(key: string) {
  if (openKeys.has(key)) openKeys.delete(key)
  else openKeys.add(key)
}

const selectedDay = computed(() => days.find((d) => d.date === selectedDate.value))

function formatDate(iso: string): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(`${iso}T00:00:00`)
  return `${iso} 星期${weekdays[d.getDay()]}`
}
</script>

<style scoped>
.updates-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}

/* ===== 声明横幅 ===== */
.disclaimer {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 32px;
  border-left: 4px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.disclaimer strong {
  color: var(--vp-c-text-1);
}
.disclaimer p {
  margin: 6px 0 0;
}
.disclaimer-icon {
  font-size: 20px;
  line-height: 1.4;
  color: var(--vp-c-brand-1);
}

.empty {
  padding: 48px 0;
  text-align: center;
  color: var(--vp-c-text-3);
}

/* ===== 布局：左时间线 + 右内容 ===== */
.updates-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 32px;
  align-items: start;
}

/* ===== 采集时间线（仿提交历史） ===== */
.timeline-nav {
  position: sticky;
  top: calc(var(--vp-nav-height) + 24px);
  max-height: calc(100vh - var(--vp-nav-height) - 48px);
  overflow-y: auto;
  padding-right: 8px;
}

.tl-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  background: none;
  border-radius: 4px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, color 0.2s ease;
}
.tl-node:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.tl-year-node {
  font-family: var(--vp-font-family-serif);
  font-size: 16px;
  font-weight: 800;
  color: var(--vp-c-text-1);
}

.tl-children {
  margin-left: 15px;
  padding-left: 12px;
  border-left: 1px solid var(--vp-c-divider);
}

.tl-month-node {
  font-weight: 600;
}

/* 日节点：时间线上的圆点 */
.tl-days {
  position: relative;
}
.tl-day-node {
  position: relative;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
.tl-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-left: -16px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-text-3);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.tl-day-node:hover .tl-dot {
  border-color: var(--vp-c-brand-1);
}
.tl-day-node.active {
  color: var(--vp-c-brand-1);
  font-weight: 700;
  background: var(--vp-c-brand-soft);
}
.tl-day-node.active .tl-dot {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
}

.tl-chevron {
  flex-shrink: 0;
  width: 14px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
}
.tl-chevron.open {
  transform: rotate(90deg);
}

.tl-label {
  flex: 1;
  white-space: nowrap;
}

.tl-count {
  flex-shrink: 0;
  min-width: 22px;
  padding: 0 6px;
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  text-align: center;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
}
.tl-day-node.active .tl-count {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

/* ===== 日期区块 ===== */
.day-header {
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--vp-c-brand-1);
}
.day-title {
  margin: 0 0 8px;
  font-family: var(--vp-font-family-serif);
  font-size: 24px;
  font-weight: 800;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
}
.day-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.stat-badge {
  padding: 2px 8px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}
.stat-error {
  color: #d4351c;
  background: rgba(212, 53, 28, 0.08);
}

/* ===== 事件卡片 ===== */
.event-card {
  padding: 14px 18px;
  margin-bottom: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.event-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 6px 24px rgba(0, 0, 242, 0.1);
}
.dark .event-card:hover {
  box-shadow: 0 6px 24px rgba(107, 107, 255, 0.12);
}
.event-card.is-recorded {
  opacity: 0.55;
}

.event-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.event-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.event-title:hover {
  color: var(--vp-c-brand-1);
}
.event-date {
  margin-left: auto;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

.badge {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
}
.badge-verified {
  color: #15803d;
  background: rgba(21, 128, 61, 0.1);
}
.dark .badge-verified {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}
.badge-pending {
  color: #a16207;
  background: rgba(161, 98, 7, 0.1);
}
.dark .badge-pending {
  color: #facc15;
  background: rgba(250, 204, 21, 0.1);
}
.badge-recorded {
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
}

.event-summary {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.event-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.source-badge {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  text-decoration: none;
  transition: filter 0.2s ease;
}
.source-badge:hover {
  filter: brightness(1.15);
}

@media (max-width: 768px) {
  .updates-page {
    padding: 16px 16px 48px;
  }
  .updates-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .timeline-nav {
    position: static;
    max-height: 260px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 4px;
    padding: 8px;
  }
  .event-date {
    margin-left: 0;
    width: 100%;
  }
}
</style>

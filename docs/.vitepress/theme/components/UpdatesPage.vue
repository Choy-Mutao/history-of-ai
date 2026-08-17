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

    <section v-for="day in days" :key="day.date" class="day-block">
      <header class="day-header">
        <h2 class="day-title">{{ formatDate(day.date) }}</h2>
        <div class="day-stats">
          <span
            v-for="s in day.stats"
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
        v-for="(c, i) in day.clusters"
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
</template>

<script setup lang="ts">
import { data as days } from '../../data/updates.data.js'

function formatDate(iso: string): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(`${iso}T00:00:00`)
  return `${iso} 星期${weekdays[d.getDay()]}`
}
</script>

<style scoped>
.updates-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}

/* ===== 声明横幅 ===== */
.disclaimer {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 40px;
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

/* ===== 日期区块 ===== */
.day-block {
  margin-bottom: 48px;
}
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

@media (max-width: 640px) {
  .updates-page {
    padding: 16px 16px 48px;
  }
  .event-date {
    margin-left: 0;
    width: 100%;
  }
}
</style>

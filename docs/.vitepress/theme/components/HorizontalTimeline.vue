<template>
  <div class="ht">
    <!-- 工具栏：缩放 + 操作提示 -->
    <div class="ht-toolbar">
      <div class="ht-zoom">
        <button
          class="ht-zoom-btn"
          :disabled="zoomIdx === 0"
          :aria-label="isEn ? 'Zoom out' : '缩小'"
          @click="setZoom(zoomIdx - 1)"
        >−</button>
        <button
          class="ht-zoom-btn"
          :disabled="zoomIdx === ZOOMS.length - 1"
          :aria-label="isEn ? 'Zoom in' : '放大'"
          @click="setZoom(zoomIdx + 1)"
        >+</button>
        <span class="ht-zoom-label">{{ pxPerMonth }}px/{{ isEn ? 'mo' : '月' }}</span>
      </div>
      <span class="ht-hint">{{ isEn ? 'Drag or scroll to explore · click an event to open its chapter' : '拖拽或滚动探索 · 点击事件跳转对应章节' }}</span>
    </div>

    <!-- 横向滚动轨道（水合定位 2022 前淡入，避免年代跳变） -->
    <noscript>
      <component :is="'style'">.ht-track { opacity: 1 !important; }</component>
    </noscript>
    <div
      ref="track"
      class="ht-track"
      :class="{ dragging: isDragging, 'is-ready': ready }"
      role="region"
      tabindex="0"
      :aria-label="isEn ? 'AI history timeline, scrollable horizontally' : 'AI 历史时间轴，可横向滚动'"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
    >
      <div class="ht-canvas" :style="{ width: `${totalWidth}px`, height: `${canvasHeight}px` }">
        <!-- 时代标签 -->
        <template v-if="pxPerMonth >= 4">
          <span
            v-for="e in eraLabels"
            :key="e.name"
            class="ht-era"
            :style="{ left: `${e.x}px`, color: eraColor(e.idx) }"
          >{{ e.name }}</span>
        </template>

        <!-- 年份刻度与竖直网格线 -->
        <div
          v-for="t in yearTicks"
          :key="t.year"
          class="ht-tick"
          :style="{ left: `${t.x}px` }"
        >
          <span class="ht-tick-label">{{ t.year }}</span>
        </div>

        <!-- 事件卡片 -->
        <component
          :is="ev.href ? 'a' : 'span'"
          v-for="ev in laidOut"
          :key="ev.key"
          class="ht-event"
          :class="{ 'is-milestone': ev.importance === 'milestone', 'no-drag': ev.href }"
          :style="{
            left: `${ev.x}px`,
            top: `${ev.top}px`,
            maxWidth: `${ev.w}px`,
            '--era-hue': ev.hue,
          }"
          :href="ev.href"
          :title="ev.text"
          @click="onEventClick"
        >
          <span class="ht-dot"></span>
          <span class="ht-event-text">{{ ev.text }}</span>
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase, useData } from 'vitepress'
import { timeline, type TimelineEvent } from '../../data/timeline'

const { lang } = useData()
const isEn = computed(() => lang.value === 'en-US')

/* ===== 缩放：px/月 ===== */
const ZOOMS = [1, 2, 4, 8, 16, 32]
const DEFAULT_ZOOM_IDX = 4 // 16px/月：2022–2026 约 960px，一屏可读
const zoomIdx = ref(DEFAULT_ZOOM_IDX)
const pxPerMonth = computed(() => ZOOMS[zoomIdx.value])

/* ===== 数据展平 ===== */
const HUES = [200, 180, 220, 30, 0, 260, 280, 145, 320, 15]

interface FlatEvent {
  key: string
  year: number
  month: number
  text: string
  href?: string
  importance?: TimelineEvent['importance']
  hue: number
}

function localizeLink(link: string): string {
  if (!isEn.value || !link.startsWith('/')) return link
  if (link.startsWith('/en/')) return link
  return `/en${link}`
}

const flat = computed<FlatEvent[]>(() =>
  timeline.flatMap((era, eraIdx) =>
    era.events.map((ev, i) => ({
      key: `${eraIdx}-${i}`,
      year: Number(ev.year),
      month: ev.month ?? 6,
      text: isEn.value ? ev.event_en ?? ev.event : ev.event,
      href: ev.link ? withBase(localizeLink(ev.link)) : undefined,
      importance: ev.importance,
      hue: HUES[eraIdx % HUES.length],
    })),
  ),
)

const minYear = computed(() => Math.min(...flat.value.map((e) => e.year)))
const maxYear = computed(() => Math.max(...flat.value.map((e) => e.year)))

/** 以 1 月为单位的线性时间 → x 坐标 */
function xOf(year: number, month: number): number {
  return ((year - minYear.value) * 12 + (month - 1)) * pxPerMonth.value + 40
}

const totalWidth = computed(() => xOf(maxYear.value + 1, 1) + 40)

/* ===== 年份刻度（按缩放自适应密度）===== */
const yearTicks = computed(() => {
  const yearWidth = 12 * pxPerMonth.value
  const step = yearWidth >= 96 ? 1 : yearWidth >= 48 ? 2 : yearWidth >= 24 ? 5 : 10
  const ticks: { year: number; x: number }[] = []
  const start = Math.ceil(minYear.value / step) * step
  for (let y = start; y <= maxYear.value; y += step) {
    ticks.push({ year: y, x: xOf(y, 1) })
  }
  return ticks
})

/* ===== 时代标签（取各时代首个事件的位置）===== */
const eraLabels = computed(() =>
  timeline.map((era, idx) => {
    const first = era.events[0]
    return {
      name: isEn.value ? era.name_en ?? era.name : era.name,
      x: xOf(Number(first?.year ?? minYear.value), first?.month ?? 1),
      idx,
    }
  }),
)

function eraColor(idx: number): string {
  return `hsl(${HUES[idx % HUES.length]}, 60%, 55%)`
}

/* ===== 泳道分配（防重叠）===== */
const ROW_H = 42
const AXIS_H = 64
const MAX_W = 280
const GAP = 16

/** 估算文本宽度：CJK 按全宽，其余按半宽 */
function estimateWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    w += /[⺀-鿿豈-﫿︰-﹏＀-￠]/.test(ch) ? 13 : 7
  }
  return Math.min(w + 26, MAX_W)
}

const laidOut = computed(() => {
  const lanes: number[] = []
  const items = [...flat.value]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((ev) => {
      const x = xOf(ev.year, ev.month)
      const w = estimateWidth(ev.text)
      let row = lanes.findIndex((last) => last <= x - GAP)
      if (row === -1) {
        if (lanes.length < 12) {
          row = lanes.length
          lanes.push(-Infinity)
        } else {
          row = lanes.indexOf(Math.min(...lanes))
        }
      }
      lanes[row] = x + w
      return { ...ev, x, w, top: AXIS_H + row * ROW_H }
    })
  return items
})

const laneCount = computed(() => laidOut.value.reduce((m, e) => Math.max(m, Math.round((e.top - AXIS_H) / ROW_H) + 1), 1))
const canvasHeight = computed(() => AXIS_H + laneCount.value * ROW_H + 16)

/* ===== 滚动与拖拽 ===== */
const track = ref<HTMLElement>()
const isDragging = ref(false)
const ready = ref(false)
let dragStartX = 0
let dragStartScroll = 0
let dragMoved = false

function onWheel(e: WheelEvent) {
  const el = track.value
  if (el) el.scrollLeft += e.deltaY + e.deltaX
}

function onPointerDown(e: PointerEvent) {
  const el = track.value
  if (!el || e.button !== 0) return
  isDragging.value = true
  dragMoved = false
  dragStartX = e.clientX
  dragStartScroll = el.scrollLeft
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
  const el = track.value
  if (!el || !isDragging.value) return
  const dx = e.clientX - dragStartX
  if (Math.abs(dx) > 4) dragMoved = true
  el.scrollLeft = dragStartScroll - dx
}

function onPointerUp() {
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  // 拖拽刚结束时抑制一次点击跳转
  setTimeout(() => {
    dragMoved = false
  }, 0)
}

function onEventClick(e: MouseEvent) {
  if (dragMoved) {
    e.preventDefault()
    e.stopPropagation()
  }
}

/* ===== 默认定位到 2022 年 ===== */
function scrollToYear(year: number) {
  const el = track.value
  if (!el) return
  el.scrollLeft = Math.max(0, xOf(year, 1) - el.clientWidth * 0.08)
}

function setZoom(idx: number) {
  const el = track.value
  // 以当前视野中心为锚点缩放
  const ratio = el ? (el.scrollLeft + el.clientWidth / 2) / totalWidth.value : 0
  zoomIdx.value = idx
  requestAnimationFrame(() => {
    if (el) el.scrollLeft = ratio * totalWidth.value - el.clientWidth / 2
  })
}

onMounted(() => {
  requestAnimationFrame(() => {
    scrollToYear(2022)
    ready.value = true
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
})
</script>

<style scoped>
.ht {
  margin-bottom: 32px;
}

/* ===== 工具栏 ===== */
.ht-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.ht-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ht-zoom-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.ht-zoom-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.ht-zoom-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.ht-zoom-label {
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 12px;
  color: var(--vp-c-text-3);
  min-width: 64px;
}
.ht-hint {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* ===== 轨道 ===== */
.ht-track {
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  cursor: grab;
  user-select: none;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.ht-track.is-ready {
  opacity: 1;
}
.ht-track.dragging {
  cursor: grabbing;
}
.ht-track:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.ht-canvas {
  position: relative;
}

/* ===== 时代标签 ===== */
.ht-era {
  position: absolute;
  top: 10px;
  font-family: var(--vp-font-family-serif);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0.85;
}

/* ===== 年份刻度 ===== */
.ht-tick {
  position: absolute;
  top: 32px;
  bottom: 0;
  width: 1px;
  background: var(--vp-c-divider);
  opacity: 0.5;
}
.ht-tick-label {
  position: absolute;
  top: 0;
  left: 4px;
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-feature-settings: 'tnum';
}

/* ===== 事件卡片 ===== */
.ht-event {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-size: 12px;
  line-height: 1.4;
  color: var(--vp-c-text-2);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ht-event:hover {
  border-color: hsl(var(--era-hue), 60%, 55%);
  box-shadow: 0 2px 10px hsla(var(--era-hue), 60%, 50%, 0.2);
  color: var(--vp-c-text-1);
  z-index: 2;
}

.ht-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 2px solid hsl(var(--era-hue), 55%, 55%);
}

.ht-event-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ht-event.is-milestone {
  border-color: hsl(var(--era-hue), 60%, 55%);
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.ht-event.is-milestone .ht-dot {
  background: linear-gradient(135deg, #edff45, #c8d400);
  border-color: transparent;
  box-shadow: 0 0 0 2px hsla(var(--era-hue), 60%, 50%, 0.3);
}

@media (max-width: 640px) {
  .ht-hint {
    display: none;
  }
}
</style>

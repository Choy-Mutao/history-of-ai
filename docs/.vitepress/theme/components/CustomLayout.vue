<template>
  <Layout>
    <template #home-hero-before>
      <HomeHero />
    </template>
    <template #home-hero-after>
      <StatsBar />
      <section class="home-timeline">
        <header class="home-timeline-header">
          <h2 class="home-timeline-title">{{ isEn ? 'The Timeline' : '大事年表' }}</h2>
          <p class="home-timeline-sub">
            {{ isEn ? 'Every entry is a clickable link into its chapter.' : '每条事件均可点击，跳转到对应的正史章节。' }}
          </p>
        </header>
        <TimelinePage />
      </section>
    </template>
    <template #home-features-after>
      <HomeFooter />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import HomeHero from './HomeHero.vue'
import StatsBar from './StatsBar.vue'
import TimelinePage from './TimelinePage.vue'
import HomeFooter from './HomeFooter.vue'

const { Layout } = DefaultTheme
const { lang } = useData()
const isEn = computed(() => lang.value === 'en-US')
</script>

<style scoped>
.home-timeline {
  padding: 24px 24px 32px;
}

.home-timeline-header {
  max-width: 880px;
  margin: 0 auto 24px;
  text-align: center;
}

.home-timeline-title {
  margin: 0 0 8px;
  font-family: var(--vp-font-family-serif);
  font-size: 2em;
  font-weight: 800;
  color: var(--vp-c-text-1);
}

.home-timeline-sub {
  margin: 0;
  font-size: 0.9em;
  color: var(--vp-c-text-3);
}
</style>

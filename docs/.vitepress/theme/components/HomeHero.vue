<template>
  <section class="home-hero">
    <div class="hero-inner">
      <div class="hero-text">
        <p class="hero-range">1943 — 2026</p>
        <h1 class="hero-title">{{ isEn ? 'History of AI' : 'AI 史记' }}</h1>
        <p class="hero-tagline">
          {{ isEn ? 'From Logic on Paper to a Mind in Every Pocket' : '人工智能的前世今生' }}
        </p>

        <p v-if="isEn" class="hero-desc">
          An open-source book on the history of artificial intelligence, structured in the
          five-fold form of <em>Records of the Grand Historian</em> —
          <a :href="withBase('/en/annals/01-dawn')">Annals</a>,
          <a :href="withBase('/en/houses/mit-ai-lab')">Houses</a>,
          <a :href="withBase('/en/biographies/turing')">Biographies</a>,
          <a :href="withBase('/en/treatises/neural-networks')">Treatises</a> and
          <a :href="withBase('/en/timeline/')">Timeline</a> — telling the story of AI since
          1943, from cultural currents to technical breakthroughs. Every event in the
          timeline below is a clickable link into the corresponding chapter.
        </p>
        <p v-else class="hero-desc">
          这是一本开源的 AI 历史书籍，仿《史记》五体——
          <a :href="withBase('/annals/01-dawn')">本纪</a>、
          <a :href="withBase('/houses/mit-ai-lab')">世家</a>、
          <a :href="withBase('/biographies/turing')">列传</a>、
          <a :href="withBase('/treatises/neural-networks')">书</a>、
          <a :href="withBase('/timeline/')">表</a>——
          讲述 1943 年以来人工智能的故事：从文化潮流到技术突破，从实验室的争论到每个人口袋里的模型。
          下方年表中的每个事件都可点击，跳转到对应的正史章节。
        </p>

        <p v-if="isEn" class="hero-note">
          Note: Curation is inherently subjective, and omissions are inevitable. Visit the
          <a href="https://github.com/zsjunai/history-of-ai" target="_blank" rel="noopener">GitHub repository</a>
          to suggest corrections, or read the
          <a :href="withBase('/en/guide/how-to-contribute')">contributing guide</a> —
          history should not be written by a single hand.
        </p>
        <p v-else class="hero-note">
          注：史料编排难免主观，疏漏在所难免。欢迎访问
          <a href="https://github.com/zsjunai/history-of-ai" target="_blank" rel="noopener">GitHub 仓库</a>
          提出修订，或阅读<a :href="withBase('/guide/how-to-contribute')">贡献指南</a>参与书写——历史不应由一个人书写。
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value === 'en-US')
</script>

<style scoped>
.home-hero {
  position: relative;
  z-index: 0;
  padding: calc(var(--vp-nav-height) + 48px) 24px 40px;
}

.hero-inner {
  max-width: 880px;
  margin: 0 auto;
}

.hero-range {
  margin: 0 0 12px;
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 0.9em;
  letter-spacing: 0.3em;
  color: var(--vp-c-brand-1);
}

.hero-title {
  margin: 0 0 12px;
  font-family: var(--vp-font-family-serif);
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--vp-c-text-1);
}

.hero-tagline {
  margin: 0 0 28px;
  font-family: var(--vp-font-family-serif);
  font-size: 1.3em;
  color: var(--vp-c-text-2);
}

.hero-desc {
  max-width: 580px;
  margin: 0 0 16px;
  font-size: 0.98em;
  line-height: 1.9;
  color: var(--vp-c-text-2);
}

.hero-note {
  max-width: 580px;
  margin: 0;
  font-size: 0.86em;
  line-height: 1.8;
  color: var(--vp-c-text-3);
}

.hero-desc a,
.hero-note a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}
.hero-desc a:hover,
.hero-note a:hover {
  border-bottom-color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .home-hero {
    padding: calc(var(--vp-nav-height) + 24px) 20px 24px;
  }
}
</style>

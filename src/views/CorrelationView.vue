<template>
  <div class="correlation-container">
    <h2>相関分析</h2>
    <p>福岡県の2つの統計指標を選択し、相関グラフとAI解説を表示します。</p>

    <CategorySelectorMultiple
      :categories="categories"
      :selected="selectedCategories"
      @update="onSelect"
    />

    <div class="action-area">
      <button
        class="analyze-button"
        :disabled="selectedCategories.length !== 2 || loading"
        @click="runCorrelation"
      >
        <span v-if="!loading">相関分析実行</span>
        <span v-else>分析中…</span>
      </button>
    </div>

    <Loader v-if="loading" />
    <ErrorMessage v-if="error" :message="error" />

    <CorrelationChart
      v-if="correlationResult"
      :points="correlationResult.points"
      :regression="correlationResult.regressionLine"
    />

    <div v-if="aiExplanation" class="ai-explanation">
      <h3>AI解説</h3>
      <p>{{ aiExplanation }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { categories } from '@/data/estatData'
import type { CategoryDefinition, FilterCondition } from '@/data/estatData'
import useCorrelationStats from '@/composables/useCorrelationStats'
import CategorySelectorMultiple from '@/components/CategorySelectorMultiple.vue'
import CorrelationChart from '@/components/CorrelationChart.vue'
import Loader from '@/components/Loader.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'

const selectedCategories = ref<CategoryDefinition[]>([])
const aiExplanation = ref<string>('')

const { loading, error, result: correlationResult, analyzeCorrelation } = useCorrelationStats()

function onSelect(updated: CategoryDefinition[]) {
  selectedCategories.value = updated
  aiExplanation.value = ''
}

async function runCorrelation() {
  if (selectedCategories.value.length !== 2) return

  // 指標のフィルター条件だけを抽出して分析
  const filters = selectedCategories.value.map(c => c.filters) as [FilterCondition, FilterCondition]
  await analyzeCorrelation(filters)

  // AI解説の呼び出し
  const prompt = `これは福岡県の${selectedCategories.value[0].name}と${selectedCategories.value[1].name}の相関散布図です。相関係数は${correlationResult.value?.corr}です。解説してください。`
  try {
    const res = await fetch('/api/analyze-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: prompt })
    })
    const data = await res.json()
    aiExplanation.value = data.explanation || ''
  } catch (e: any) {
    aiExplanation.value = 'AI解説の取得に失敗しました。'
  }
}
</script>

<style scoped>
.correlation-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
.action-area {
  margin: 1.5rem 0;
  text-align: center;
}
.analyze-button {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.analyze-button:disabled {
  background: #a0c3ff;
  cursor: not-allowed;
}
.ai-explanation {
  margin-top: 2rem;
  background: var(--card-background-color);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.ai-explanation h3 {
  margin-top: 0;
}
</style>

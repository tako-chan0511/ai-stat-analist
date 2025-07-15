<template>
  <div class="container">
    <h1>AI 統計アナリスト</h1>

    <div class="button-group">
      <StatsButton
        v-for="cat in categories"
        :key="cat.key"
        :category="cat"
        :loading="loading"
        @analyze="handleAnalyze"
      />
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="result" class="result">
      <!-- 結果のレンダリング。Chart.js やテーブル表示など -->
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { categories } from '@/data/estatData'
import StatsButton from '@/components/StatsButton.vue'
import useAnalyzeStats from '@/composables/useAnalyzeStats'

const { loading, result, error, analyzeStats } = useAnalyzeStats()

function handleAnalyze(key: string) {
  const cat = categories.find(c => c.key === key)
  if (!cat) {
    console.warn(`Unknown category: ${key}`)
    return
  }
  analyzeStats(cat.filter)
}
</script>

<style scoped>
.button-group {
  display: flex;
  flex-wrap: wrap;
}
.error {
  color: red;
  margin-top: 1rem;
}
.result {
  margin-top: 1rem;
  white-space: pre-wrap;
}
</style>

<template>
  <div class="results-area">
    <div class="explanation-card">
      <h2>AIによる解説</h2>
      <p>{{ result.explanation }}</p>
    </div>
    <div class="chart-card" v-if="result.chartData">
      <h2>データの可視化</h2>
      <DataChart
        :chart-type="result.chartType"
        :chart-data="result.chartData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DataChart from '@/components/DataChart.vue'
const props = defineProps<{ result: any }>()
</script>

<style scoped>
.results-area {
  display: grid;
  gap: 2rem;
}
.explanation-card,
.chart-card {
  background: var(--card-background-color);
  padding: 2rem; border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.explanation-card h2,
.chart-card h2 {
  margin-top: 0;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}
</style>

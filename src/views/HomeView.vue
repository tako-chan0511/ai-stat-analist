<template>
  <div class="analysis-single">
    <h2 class="view-title">単独分析</h2>

    <CategorySelector
      :categories="categories"
      :selected="selectedCategory"
      @select="onSelectCategory"
    />

    <SearchArea
      v-model:question="question"
      :disabled="!selectedCategory"
      :loading="loading"
      @analyze="getAnalysis"
    />

    <Loader v-if="loading" />
    <ErrorMessage v-if="error" :message="error" />
    <AnalysisResults v-if="analysisResult" :result="analysisResult" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categories } from '@/data/estatData'
import type { CategoryDefinition } from '@/data/estatData'
import useAnalyzeStats, { AnalyzePayload } from '@/composables/useAnalyzeStats'
import CategorySelector from '@/components/CategorySelector.vue'
import SearchArea from '@/components/SearchArea.vue'
import Loader from '@/components/Loader.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import AnalysisResults from '@/components/AnalysisResults.vue'

const selectedCategory = ref<CategoryDefinition|null>(null)
const question         = ref('')
const { loading, result: analysisResult, error, analyzeStats } = useAnalyzeStats()

function onSelectCategory(cat: CategoryDefinition) {
  selectedCategory.value = cat
  question.value         = cat.defaultQuestion || ''
}

async function getAnalysis() {
  if (!selectedCategory.value || !question.value.trim()) return

  const payload: AnalyzePayload = {
    question:    question.value,
    filter:      selectedCategory.value.filters,
    statsDataId: selectedCategory.value.id,
    categoryInfo: {
      name: selectedCategory.value.name,
      unit: selectedCategory.value.unit
    }
  }
  await analyzeStats(payload)
}

onMounted(() => {
  if (categories.length) onSelectCategory(categories[0])
})
</script>

<style scoped>
.analysis-single {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.view-title {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}
</style>
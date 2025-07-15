<template>
  <div id="app">
    <div class="analyst-container">
      <AppHeader />

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categories } from '@/data/estatData'
import type { CategoryDefinition } from '@/data/estatData'

import AppHeader        from '@/components/AppHeader.vue'
import CategorySelector from '@/components/CategorySelector.vue'
import SearchArea       from '@/components/SearchArea.vue'
import Loader           from '@/components/Loader.vue'
import ErrorMessage     from '@/components/ErrorMessage.vue'
import AnalysisResults  from '@/components/AnalysisResults.vue'
import useAnalyzeStats  from '@/composables/useAnalyzeStats'

const selectedCategory = ref<CategoryDefinition | null>(null)
const question = ref<string>('')

const { loading, result: analysisResult, error, analyzeStats } = useAnalyzeStats()

function onSelectCategory(cat: CategoryDefinition) {
  selectedCategory.value = cat
  question.value = cat.defaultQuestion || ''
  getAnalysis()
}

async function getAnalysis() {
  if (!selectedCategory.value) {
    error.value = '統計カテゴリを選択してください。'
    return
  }
  if (!question.value.trim()) {
    error.value = '質問を入力してください。'
    return
  }

  // 「filters」→「filter」に修正し、バックエンドの必須チェックを通過させる
  await analyzeStats({
    question: question.value,
    filter: selectedCategory.value.filters,
    categoryInfo: {
      name: selectedCategory.value.name,
      unit: selectedCategory.value.unit
    }
  })
}

// 起動時に最初のカテゴリを選択
onMounted(() => {
  if (categories.length) {
    onSelectCategory(categories[0])
  }
})
</script>

<style scoped>
.analyst-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
</style>

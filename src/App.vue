<template>
  <div id="app">
    <div class="analyst-container">
      <header class="app-header">
        <h1>福岡県 AI統計アナリスト</h1>
        <p>福岡県の公式統計データを、AIが分かりやすく解説・可視化します。</p>
      </header>

      <main>
        <div class="category-selection">
          <h2>分析したい統計データを選択してください（2つまで）</h2>
          
          <div v-for="group in categoryGroups" :key="group.groupName" class="category-group">
            <h3>{{ group.groupName }}</h3>
            <div class="category-buttons">
              <template v-for="(item, index) in group.items" :key="index">
                <button
                  v-if="item.type !== 'subgroup'"
                  @click="selectCategory(item as EStatCategory)"
                  :class="{ 
                    'first-selection': isFirstSelection(item as EStatCategory),
                    'second-selection': isSecondSelection(item as EStatCategory)
                  }"
                >
                  {{ (item as EStatCategory).name }}
                </button>
                
                <div v-else class="button-sub-group">
                  <button
                    v-for="subItem in (item as EStatButtonSubGroup).items"
                    :key="subItem.name"
                    @click="selectCategory(subItem)"
                    :class="{ 
                      'first-selection': isFirstSelection(subItem),
                      'second-selection': isSecondSelection(subItem)
                    }"
                  >
                    {{ subItem.name }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-if="selectedCategories.length === 1" class="info-message">
          <p>📈 比較するデータをもう一つ選択してください。</p>
        </div>
        <div class="search-area" v-if="selectedCategories.length > 0">
          <textarea v-model="question" placeholder="AIへの質問を入力してください..." rows="3" class="question-textarea"></textarea>
          <button @click="getAnalysis" :disabled="loading || selectedCategories.length === 0">
            <span v-if="!loading">AIに質問する</span>
            <span v-else class="loading-state"><div class="loading-spinner-small"></div>分析中...</span>
          </button>
        </div>
        <div v-if="loading" class="loading-spinner-large"></div>
        <div v-if="error" class="error-message"><strong>エラー:</strong> {{ error }}</div>
        <div v-if="analysisResult" class="results-area">
          <div class="explanation-card">
            <h2>AIによる分析と洞察</h2>
            <p>{{ analysisResult.explanation }}</p>
          </div>
          <div class="chart-card">
            <h2>データの可視化</h2>
            <!-- ★★★★★ ここが修正点 ★★★★★ -->
            <DataChart 
              v-if="analysisResult.chartData" 
              :chart-data="analysisResult.chartData"
              :chart-options="analysisResult.chartOptions"
            />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import DataChart from './components/DataChart.vue';
import { estatCategoryGroups, type EStatCategory, type EStatCategoryGroup, type EStatButtonSubGroup } from './services/estatData';

const categoryGroups = ref<EStatCategoryGroup[]>(estatCategoryGroups);
const selectedCategories = ref<EStatCategory[]>([]);
const question = ref('');
const loading = ref(false);
const error = ref('');
const analysisResult = ref<any>(null);

const isSelected = (category: EStatCategory) => selectedCategories.value.some(c => c.name === category.name);
const isFirstSelection = (category: EStatCategory) => selectedCategories.value[0]?.name === category.name;
const isSecondSelection = (category: EStatCategory) => selectedCategories.value[1]?.name === category.name;

const selectCategory = (category: EStatCategory) => {
  const index = selectedCategories.value.findIndex(c => c.name === category.name);
  if (index > -1) {
    selectedCategories.value.splice(index, 1);
  } else {
    if (selectedCategories.value.length < 2) {
      selectedCategories.value.push(category);
    }
  }
};

watch(selectedCategories, (newSelection) => {
  analysisResult.value = null;
  error.value = '';
  if (newSelection.length === 1) {
    question.value = `${newSelection[0].name}の推移を教えてください。`;
  } else if (newSelection.length === 2) {
    question.value = `${newSelection[0].name}と${newSelection[1].name}には、どのような関係がありますか？`;
    getAnalysis();
  } else {
    question.value = '';
  }
}, { deep: true });

const getAnalysis = async () => {
  if (selectedCategories.value.length === 0) { return; }
  loading.value = true;
  error.value = '';
  analysisResult.value = null;
  try {
    const response = await fetch('/api/analyze-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: question.value,
        categories: selectedCategories.value.map(c => ({
          statsDataId: c.id,
          filters: c.filters,
          categoryInfo: { name: c.name, unit: c.unit }
        }))
      }),
    });
    const data = await response.json();
    if (response.ok) {
      analysisResult.value = data;
    } else {
      error.value = data.error || '分析に失敗しました。';
    }
  } catch (e: any) {
    error.value = `通信エラーが発生しました: ${e.message}`;
  } finally {
    loading.value = false;
  }
};
</script>

<style>
/* スタイルは変更なし */
:root {
  --primary-color: #1a73e8;
  --secondary-color: #ff6d00;
  --background-color: #f8f9fa;
  --card-background-color: #ffffff;
  --text-color: #202124;
  --sub-text-color: #5f6368;
  --border-color: #dadce0;
}
body { font-family: 'Google Sans', 'Noto Sans JP', sans-serif; margin: 0; background-color: var(--background-color); color: var(--text-color); }
#app { padding: 2rem; }
.analyst-container { max-width: 900px; margin: 0 auto; }
.app-header { text-align: center; margin-bottom: 2.5rem; }
.app-header h1 { font-size: 2.5rem; font-weight: 500; color: var(--primary-color); }
.app-header p { font-size: 1.1rem; color: var(--sub-text-color); }
.category-selection h2 { font-size: 1.2rem; text-align: center; margin-bottom: 1.5rem; color: var(--sub-text-color); }
.category-group { margin-bottom: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; }
.category-group:first-child { border-top: none; padding-top: 0; }
.category-group h3 { text-align: center; font-weight: 500; color: var(--sub-text-color); margin-bottom: 1rem; }
.category-buttons { display: flex; justify-content: center; flex-wrap: wrap; gap: 1rem; align-items: center; }
.category-buttons button { padding: 0.75rem 1.5rem; border: 1px solid var(--border-color); border-radius: 2rem; background-color: var(--card-background-color); color: var(--text-color); font-size: 1rem; cursor: pointer; transition: all 0.2s ease-in-out; }
.category-buttons button:hover { background-color: #f1f1f1; transform: translateY(-2px); }
.category-buttons button.first-selection { background-color: var(--primary-color); color: white; border-color: var(--primary-color); font-weight: 500; }
.category-buttons button.second-selection { background-color: var(--secondary-color); color: white; border-color: var(--secondary-color); font-weight: 500; }
.button-sub-group { display: flex; gap: 0.5rem; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 2.5rem; }
.button-sub-group button { border: none; box-shadow: none; }
.button-sub-group button:hover { background-color: #f1f1f1; }
.button-sub-group button.first-selection, .button-sub-group button.second-selection { border: none; }
.info-message { text-align: center; padding: 1rem; background-color: #e8f0fe; color: #174ea6; border-radius: 8px; margin-bottom: 2rem; }
.search-area { background: var(--card-background-color); padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 2rem; }
.question-textarea { width: 100%; padding: 1rem; font-size: 1.1rem; border: 1px solid var(--border-color); border-radius: 8px; box-sizing: border-box; resize: vertical; margin-bottom: 1rem; }
.search-area button { width: 100%; padding: 1rem; font-size: 1.1rem; font-weight: 500; color: white; background-color: #34a853; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
.search-area button:hover:not(:disabled) { background-color: #1e8e3e; }
.search-area button:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.loading-state { display: flex; align-items: center; gap: 0.75rem; }
.loading-spinner-small { width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: #ffffff; animation: spin 1s ease infinite; }
.loading-spinner-large { width: 48px; height: 48px; border: 5px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: var(--primary-color); animation: spin 1s ease infinite; margin: 3rem auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-message { margin-top: 1.5rem; padding: 1rem; background-color: #fdeaed; color: #a50e0e; border: 1px solid #f4c7c7; border-radius: 8px; }
.results-area { display: grid; grid-template-columns: 1fr; gap: 2rem; }
.explanation-card, .chart-card { background: var(--card-background-color); padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.explanation-card h2, .chart-card h2 { margin-top: 0; font-size: 1.5rem; font-weight: 500; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.explanation-card p { line-height: 1.8; font-size: 1.1rem; }
</style>

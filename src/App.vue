<template>
  <div id="app">
    <div class="analyst-container">
      <header class="app-header">
        <h1>AI統計アナリスト</h1>
        <p>e-Statの統計データを、AIが分かりやすく解説・可視化します。</p>
      </header>

      <main>
        <div class="search-area">
          <textarea
            v-model="question"
            placeholder="例: 日本の人口は今後どうなりますか？"
            rows="3"
            class="question-textarea"
          ></textarea>
          <button @click="getAnalysis" :disabled="loading" class="analyze-button">
            <span v-if="!loading">AIに質問する</span>
            <span v-else class="loading-state">
              <div class="loading-spinner-small"></div>
              分析中...
            </span>
          </button>
        </div>

        <div v-if="loading" class="loading-spinner-large"></div>

        <div v-if="error" class="error-message">
          <strong>エラー:</strong> {{ error }}
        </div>

        <div v-if="analysisResult" class="results-area">
          <div class="explanation-card">
            <h2>AIによる解説</h2>
            <p>{{ analysisResult.explanation }}</p>
          </div>
          <div class="chart-card">
            <h2>データの可視化</h2>
            <DataChart 
              v-if="analysisResult.chartData"
              :chart-type="analysisResult.chartType" 
              :chart-data="analysisResult.chartData"
            />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DataChart from './components/DataChart.vue';

const question = ref('日本の総人口は、どのように推移していますか？');
const loading = ref(false);
const error = ref('');
const analysisResult = ref<any>(null);

const getAnalysis = async () => {
  if (!question.value.trim()) {
    error.value = '質問を入力してください。';
    return;
  }

  loading.value = true;
  error.value = '';
  analysisResult.value = null;

  try {
    const response = await fetch('/api/analyze-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.value }),
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
:root {
  --primary-color: #1a73e8;
  --background-color: #f8f9fa;
  --card-background-color: #ffffff;
  --text-color: #202124;
  --sub-text-color: #5f6368;
  --border-color: #dadce0;
  --button-hover-color: #185abc;
}

body {
  font-family: 'Google Sans', 'Noto Sans JP', sans-serif;
  margin: 0;
  background-color: var(--background-color);
  color: var(--text-color);
}

#app {
  padding: 2rem;
}

.analyst-container {
  max-width: 900px;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.app-header h1 {
  font-size: 2.5rem;
  font-weight: 500;
  color: var(--primary-color);
}

.app-header p {
  font-size: 1.1rem;
  color: var(--sub-text-color);
}

.search-area {
  background: var(--card-background-color);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.question-textarea {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-sizing: border-box;
  resize: vertical;
  margin-bottom: 1rem;
}

.question-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.analyze-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 500;
  color: white;
  background-color: var(--primary-color);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.analyze-button:hover:not(:disabled) {
  background-color: var(--button-hover-color);
}

.analyze-button:disabled {
  background-color: #a0c3ff;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.loading-spinner-small {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease infinite;
}

.loading-spinner-large {
  width: 48px;
  height: 48px;
  border: 5px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s ease infinite;
  margin: 3rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #fdeaed;
  color: #a50e0e;
  border: 1px solid #f4c7c7;
  border-radius: 8px;
}

.results-area {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.explanation-card, .chart-card {
  background: var(--card-background-color);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.explanation-card h2, .chart-card h2 {
  margin-top: 0;
  font-size: 1.5rem;
  font-weight: 500;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}

.explanation-card p {
  line-height: 1.8;
  font-size: 1.1rem;
}
</style>

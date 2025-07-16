<template>
  <div id="app">
    <div class="analyst-container">
      <header class="app-header">
        <h1>汎用AI統計アナリスト</h1>
        <p>e-Statの公式統計データを、キーワードで検索し、AIが分析・可視化します。</p>
      </header>
      <main>
        <div class="search-box">
          <h2>1. 分析したい統計データを検索</h2>
          <div class="search-form">
            <input v-model="searchWord" @keyup.enter="searchStats" placeholder="例：人口、GDP" />
            <button @click="searchStats" :disabled="loading.search">
              <span v-if="!loading.search">検索</span><span v-else>検索中...</span>
            </button>
          </div>
        </div>

        <div v-if="loading.search || loading.meta || loading.analysis" class="loading-spinner-large"></div>
        <div v-if="error" class="error-message"><strong>エラー:</strong> {{ error }}</div>

        <div v-if="statsList.length > 0 && !selectedStat" class="results-list">
          <h2>2. 分析する統計表を選択</h2>
          <ul>
            <li v-for="stat in statsList" :key="stat['@id']">
              <button class="stat-select-button" @click="selectStat(stat)">
                {{ stat.STATISTICS_NAME }} / {{ stat.TITLE.$ }}
              </button>
            </li>
          </ul>
        </div>
        
        <div v-if="selectedStat && metaInfo.length > 0" class="config-box">
          <h2>3. 分析項目を選択</h2>
          <p><strong>選択中の統計表:</strong> {{ selectedStat.TITLE.$ }}</p>

          <div v-for="meta in metaInfo" :key="meta['@id']" class="meta-group">
            <label :for="meta['@id']">{{ meta['@name'] }}:</label>
            <select :id="meta['@id']" v-model="selectedFilters[meta['@id']]">
              <option v-for="cls in Array.isArray(meta.CLASS) ? meta.CLASS : [meta.CLASS]" :key="cls['@code']" :value="cls['@code']">
                {{ cls['@name'] }}
              </option>
            </select>
          </div>
          
          <div class="action-buttons">
            <button @click="resetSelection">戻る</button>
            <button class="primary" @click="getAnalysis" :disabled="loading.analysis">この内容で分析する</button>
          </div>
        </div>

        <div v-if="analysisResult" class="results-area">
          <div class="explanation-card">
            <h2>AIによる分析と洞察</h2>
            <p>{{ analysisResult.explanation }}</p>
          </div>
          <div class="chart-card">
            <h2>データの可視化</h2>
            <DataChart 
              v-if="analysisResult.chartData" 
              :chart-data="analysisResult.chartData"
            />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import DataChart from './components/DataChart.vue';

const searchWord = ref('人口推計 都道府県');
const loading = reactive({ search: false, meta: false, analysis: false });
const error = ref('');
const statsList = ref<any[]>([]);
const selectedStat = ref<any>(null);
const metaInfo = ref<any[]>([]);
const selectedFilters = ref<any>({});
const analysisResult = ref<any>(null);

const searchStats = async () => {
  if (!searchWord.value) return;
  resetSelection();
  loading.search = true;
  error.value = '';
  try {
    const response = await fetch(`/api/search-stats?searchWord=${encodeURIComponent(searchWord.value)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '検索に失敗しました。');
    statsList.value = Array.isArray(data) ? data : [data];
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.search = false;
  }
};

const selectStat = async (stat: any) => {
  selectedStat.value = stat;
  loading.meta = true;
  error.value = '';
  metaInfo.value = [];
  try {
    const response = await fetch(`/api/get-meta-info?statsDataId=${stat['@id']}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '分析項目の取得に失敗しました。');
    // 絞り込み可能なカテゴリ(cat01, cat02など)と地域(area)だけを抽出
    metaInfo.value = data.filter((m: any) => m['@id'].startsWith('cat') || m['@id'] === 'area');
    // 各フィルターの初期値を設定
    selectedFilters.value = {};
    metaInfo.value.forEach(meta => {
      const firstOption = Array.isArray(meta.CLASS) ? meta.CLASS[0] : meta.CLASS;
      if(firstOption) {
        selectedFilters.value[meta['@id']] = firstOption['@code'];
      }
    });
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.meta = false;
  }
};

const resetSelection = () => {
  statsList.value = [];
  selectedStat.value = null;
  metaInfo.value = [];
  selectedFilters.value = {};
  analysisResult.value = null;
  error.value = '';
};

const getAnalysis = async () => {
  loading.analysis = true;
  error.value = '';
  analysisResult.value = null;
  try {
    // 選択されたフィルターの人間が読める名前もバックエンドに送る
    const filterNames = Object.fromEntries(
      Object.entries(selectedFilters.value).map(([key, value]) => {
        const meta = metaInfo.value.find(m => m['@id'] === key);
        if (!meta) return [key, value];
        const option = (Array.isArray(meta.CLASS) ? meta.CLASS : [meta.CLASS]).find((c: any) => c['@code'] === value);
        return [key, option ? option['@name'] : value];
      })
    );

    const response = await fetch('/api/analyze-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDataId: selectedStat.value['@id'],
        filters: selectedFilters.value,
        filterNames,
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '分析に失敗しました。');
    analysisResult.value = data;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.analysis = false;
  }
};
</script>

<style>
/* ... スタイルは一旦リセット、または既存のものを流用 ... */
body { font-family: 'Google Sans', 'Noto Sans JP', sans-serif; margin: 0; background-color: #f8f9fa; color: #202124; }
#app { padding: 2rem; }
.analyst-container { max-width: 900px; margin: 0 auto; }
.app-header { text-align: center; margin-bottom: 2.5rem; }
.app-header h1 { font-size: 2.5rem; font-weight: 500; color: #1a73e8; }
.app-header p { font-size: 1.1rem; color: #5f6368; }
.action-buttons button.primary { 
  color: white; 
  /* 検索ボタンと同じ緑色に設定 */
  background-color: #34a853; 
  border: 1px solid #34a853; 
}
/* ★★★ 「戻る」ボタン用のスタイルを追加 ★★★ */
.action-buttons button:not(.primary) {
  background-color: #f1f3f4;
  border: 1px solid #dadce0;
  color: #3c4043;
}
.action-buttons button.primary:hover:not(:disabled) { 
  background-color: #1e8e3e; 
}
.search-box { background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 2rem; }
.search-box h2 { margin-top: 0; font-size: 1.5rem; font-weight: 500; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.search-form { display: flex; gap: 1rem; }
.search-form input { flex-grow: 1; padding: 1rem; font-size: 1.1rem; border: 1px solid #dadce0; border-radius: 8px; }
.search-form button { padding: 1rem 2rem; font-size: 1.1rem; font-weight: 500; color: white; background-color: #34a853; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
.search-form button:hover:not(:disabled) { background-color: #1e8e3e; }
.search-form button:disabled { background-color: #a5d6a7; cursor: not-allowed; }

.results-list { background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.results-list h2 { margin-top: 0; font-size: 1.5rem; font-weight: 500; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.results-list ul { list-style: none; padding: 0; margin: 0; }
.results-list li { margin-bottom: 1rem; }
.stat-select-button { width: 100%; padding: 1rem; text-align: left; background-color: #f8f9fa; border: 1px solid #dadce0; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background-color 0.2s, transform 0.2s; }
.stat-select-button:hover { background-color: #e8f0fe; transform: translateY(-2px); }

.loading-spinner-large { width: 48px; height: 48px; border: 5px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: #1a73e8; animation: spin 1s ease infinite; margin: 3rem auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-message { margin-top: 1.5rem; padding: 1rem; background-color: #fdeaed; color: #a50e0e; border: 1px solid #f4c7c7; border-radius: 8px; }
</style>
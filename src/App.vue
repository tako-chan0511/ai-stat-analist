<template>
  <div id="app">
    <div class="analyst-container">
      <header class="app-header">
        <h1>汎用AI統計アナリスト</h1>
        <p>e-Statの公式統計データを、キーワードで検索し、AIが分析・可視化します。</p>
      </header>
      <main>
        <div class="search-box" v-if="uiState === 'search'">
          <h2>1. 分析したい統計データを検索</h2>
          <div class="search-form">
            <input v-model="searchWord" @keyup.enter="searchStats" placeholder="例：人口、GDP" />
            <button @click="searchStats" :disabled="isAnyLoading">
              <span v-if="!loading.search">検索</span><span v-else>検索中...</span>
            </button>
          </div>
        </div>

        <div v-if="isAnyLoading" class="loading-spinner-large"></div>
        <div v-if="error" class="error-message"><strong>エラー:</strong> {{ error }}</div>

        <div v-if="uiState === 'list'" class="results-list">
          <h2>2. 分析する統計表を選択</h2>
          <ul>
            <li v-for="stat in statsList" :key="stat['@id']">
              <button class="stat-select-button" @click="selectStat(stat)">
                <span class="stat-title">{{ stat.STATISTICS_NAME }} / {{ stat.TITLE.$ }}</span>
                <span class="stat-details">
                  <code class="stat-id">ID: {{ stat['@id'] }}</code>
                  <span class="stat-date">調査年: {{ stat.SURVEY_DATE || 'N/A' }}</span>
                </span>
              </button>
            </li>
          </ul>
           <div class="action-buttons">
            <button @click="backToState('search')">検索に戻る</button>
          </div>
        </div>
        
        <div v-if="uiState === 'config'" class="config-box">
          <h2>3. 分析項目を選択</h2>
          <p><strong>選択中の統計表:</strong> {{ selectedStat.TITLE.$ }}</p>

          <div class="filter-set">
            <p v-if="isComparing" class="filter-set-title">比較対象１</p>
            <div v-for="meta in metaInfo" :key="meta['@id']" class="meta-group">
              <label :for="`set1-${meta['@id']}`">{{ meta['@name'] }}:</label>
              <select :id="`set1-${meta['@id']}`" v-model="filters1[meta['@id']]">
                <option v-for="cls in Array.isArray(meta.CLASS) ? meta.CLASS : [meta.CLASS]" :key="cls['@code']" :value="cls['@code']">
                  {{ cls['@name'] }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="comparison-control">
            <button v-if="!isComparing" @click="addComparison" class="add-button">+ 比較対象を追加</button>
            <button v-if="isComparing" @click="removeComparison" class="remove-button">- 比較対象を削除</button>
          </div>

          <div v-if="isComparing" class="filter-set comparison-set">
            <p class="filter-set-title">比較対象２</p>
            <div v-for="meta in metaInfo" :key="meta['@id']" class="meta-group">
              <label :for="`set2-${meta['@id']}`">{{ meta['@name'] }}:</label>
              <select :id="`set2-${meta['@id']}`" v-model="filters2[meta['@id']]">
                <option v-for="cls in Array.isArray(meta.CLASS) ? meta.CLASS : [meta.CLASS]" :key="cls['@code']" :value="cls['@code']">
                  {{ cls['@name'] }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="action-buttons">
            <button @click="backToState('list')">表の選択に戻る</button>
            <button class="primary" @click="getAnalysis" :disabled="loading.analysis">この内容で分析する</button>
          </div>
        </div>

        <div v-if="uiState === 'result'" class="results-area">
          <div class="explanation-card">
            <h2>AIによる分析と洞察</h2>
            <p v-html="analysisResult.explanation.replace(/\n/g, '<br>')"></p>
          </div>
          
          <div class="search-box follow-up-box">
            <h2>さらに質問（分析の深掘り）</h2>
            <div class="search-form">
              <textarea v-model="followUpQuestion" placeholder="現在のデータについて、さらに質問を入力してください..." rows="3"></textarea>
              <button class="primary" @click="getAnalysis" :disabled="loading.analysis">
                <span v-if="!loading.analysis">追加で質問する</span><span v-else>分析中...</span>
              </button>
            </div>
          </div>
          <div class="chart-card">
            <h2>データの可視化</h2>
            <DataChart 
              v-if="analysisResult.chartData" 
              :chart-data="analysisResult.chartData"
            />
          </div>
          <div class="action-buttons">
            <button @click="backToState('config')">フィルターを修正</button>
            <button class="primary" @click="resetToSearch">新しい分析を始める</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import DataChart from './components/DataChart.vue';

type UIState = 'search' | 'list' | 'config' | 'result';

const uiState = ref<UIState>('search');
const searchWord = ref('人口推計 都道府県');
const loading = reactive({ search: false, meta: false, analysis: false });
const error = ref('');
const statsList = ref<any[]>([]);
const selectedStat = ref<any>(null);
const metaInfo = ref<any[]>([]);
const filters1 = ref<any>({});
const filters2 = ref<any>({});
const isComparing = ref(false);
const analysisResult = ref<any>(null);
const followUpQuestion = ref('');

const isAnyLoading = computed(() => loading.search || loading.meta || loading.analysis);

const getFilterNames = (filterSet: any) => {
  return Object.fromEntries(
    Object.entries(filterSet).map(([key, value]) => {
      const meta = metaInfo.value.find(m => m['@id'] === key);
      if (!meta) return [key, value];
      const option = (Array.isArray(meta.CLASS) ? meta.CLASS : [meta.CLASS]).find((c: any) => c['@code'] === value);
      return [meta['@name'], option ? option['@name'] : value];
    })
  );
};

const searchStats = async () => {
  if (!searchWord.value) {
    error.value = '検索キーワードを入力してください。';
    return;
  }
  // 検索時には、以前の選択状態をすべてリセットする
  backToState('search');
  loading.search = true;
  try {
    const response = await fetch(`/api/search-stats?searchWord=${encodeURIComponent(searchWord.value)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '検索に失敗しました。');
    statsList.value = data;
    uiState.value = 'list';
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
  try {
    const response = await fetch(`/api/get-meta-info?statsDataId=${stat['@id']}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '分析項目の取得に失敗しました。');
    metaInfo.value = data.filter((m: any) => m['@id'].startsWith('cat') || m['@id'] === 'area');
    filters1.value = {};
    metaInfo.value.forEach(meta => {
      const firstOption = Array.isArray(meta.CLASS) ? meta.CLASS[0] : meta.CLASS;
      if (firstOption) {
        filters1.value[meta['@id']] = firstOption['@code'];
      }
    });
    uiState.value = 'config';
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.meta = false;
  }
};

const getAnalysis = async () => {
  loading.analysis = true;
  error.value = '';
  try {
    const analyses = [{ filters: filters1.value, filterNames: getFilterNames(filters1.value) }];
    if (isComparing.value) {
      analyses.push({ filters: filters2.value, filterNames: getFilterNames(filters2.value) });
    }

    let question = followUpQuestion.value;
    if (!question) {
      const itemNames = analyses.map(a => Object.values(a.filterNames).join(' '));
      question = `以下の統計データ「${itemNames.join('」と「')}」について、それらの関係性、傾向、背景にある社会的・経済的要因を分析・解説してください。`;
    }

    const response = await fetch('/api/analyze-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDataId: selectedStat.value['@id'],
        analyses: analyses,
        question: question
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '分析に失敗しました。');
    
    if (uiState.value === 'result' && analysisResult.value && followUpQuestion.value) {
      analysisResult.value.explanation += `\n\n--- (追加の質問への回答) ---\n${data.explanation}`;
    } else {
      analysisResult.value = data;
    }
    
    uiState.value = 'result';
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.analysis = false;
  }
};

const backToState = (targetState: UIState) => {
  error.value = '';
  if (targetState !== 'result') {
    analysisResult.value = null;
    followUpQuestion.value = '';
  }
  if (targetState === 'list') {
    selectedStat.value = null;
    metaInfo.value = [];
    isComparing.value = false;
  } else if (targetState === 'search') {
    statsList.value = [];
    selectedStat.value = null;
    metaInfo.value = [];
    isComparing.value = false;
  }
  uiState.value = targetState;
};

const resetToSearch = () => {
  searchWord.value = '';
  backToState('search');
};

const addComparison = () => {
  isComparing.value = true;
  filters2.value = { ...filters1.value };
};

const removeComparison = () => {
  isComparing.value = false;
  filters2.value = {};
};
</script>

<style>
/* スタイルは変更ありません */
body { font-family: 'Google Sans', 'Noto Sans JP', sans-serif; margin: 0; background-color: #f8f9fa; color: #202124; }
#app { padding: 2rem; }
.analyst-container { max-width: 900px; margin: 0 auto; }
.app-header { text-align: center; margin-bottom: 2.5rem; }
.app-header h1 { font-size: 2.5rem; font-weight: 500; color: #1a73e8; }
.app-header p { font-size: 1.1rem; color: #5f6368; }
.search-box, .results-list, .config-box, .results-area { background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 2rem; }
h2 { margin-top: 0; font-size: 1.5rem; font-weight: 500; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.search-form { display: flex; gap: 1rem; align-items: center;}
.search-form input, .search-form textarea { flex-grow: 1; padding: 1rem; font-size: 1.1rem; border: 1px solid #dadce0; border-radius: 8px; }
.search-form button { padding: 1rem 2rem; font-size: 1.1rem; font-weight: 500; color: white; background-color: #34a853; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; white-space: nowrap;}
.search-form button:hover:not(:disabled) { background-color: #1e8e3e; }
.results-list ul { list-style: none; padding: 0; margin: 0; }
.results-list li { margin-bottom: 1rem; }
.stat-select-button { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; padding: 1rem; text-align: left; background-color: #f8f9fa; border: 1px solid #dadce0; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background-color 0.2s, transform 0.2s; }
.stat-select-button:hover { background-color: #e8f0fe; transform: translateY(-2px); }
.stat-title { font-weight: 500; }
.stat-details { display: flex; gap: 1rem; align-items: center; }
.stat-id { font-size: 0.85rem; color: #5f6368; background-color: #e8eaed; padding: 0.2rem 0.5rem; border-radius: 4px; }
.stat-date { font-size: 0.85rem; color: #5f6368; }
.meta-group { margin-bottom: 1.5rem; }
.meta-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; }
.meta-group select { width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #dadce0; border-radius: 8px; }
.filter-set { border: 1px solid #e0e0e0; padding: 1.5rem; border-radius: 8px; position: relative; }
.filter-set-title { font-weight: bold; margin-bottom: 1rem; font-size: 1.1rem; color: #1a73e8; }
.comparison-set { border-color: #ff6d00; margin-top: 1.5rem; }
.comparison-set .filter-set-title { color: #ff6d00; }
.comparison-control { text-align: center; margin: 1.5rem 0; }
.comparison-control button { background: none; border: 1px solid #1a73e8; color: #1a73e8; padding: 0.5rem 1rem; border-radius: 1rem; cursor: pointer; }
.action-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.action-buttons button { padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 500; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
.action-buttons button:not(.primary) { background-color: #f1f3f4; border: 1px solid #dadce0; color: #3c4043; }
.action-buttons button:not(.primary):hover { background-color: #e8eaed; }
.action-buttons button.primary, .follow-up-box button.primary { color: white; background-color: #34a853; border: 1px solid #34a853; }
.action-buttons button.primary:hover:not(:disabled), .follow-up-box button.primary:hover:not(:disabled) { background-color: #1e8e3e; }
.loading-spinner-large { width: 48px; height: 48px; border: 5px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: #1a73e8; animation: spin 1s ease infinite; margin: 3rem auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-message { margin: 1.5rem 0; padding: 1rem; background-color: #fdeaed; color: #a50e0e; border: 1px solid #f4c7c7; border-radius: 8px; }
.results-area { display: flex; flex-direction: column; gap: 2rem; }
.explanation-card, .chart-card { background: var(--card-background-color); padding: 2rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.explanation-card h2, .chart-card h2 { margin-top: 0; font-size: 1.5rem; font-weight: 500; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.explanation-card p { line-height: 1.8; font-size: 1.1rem; white-space: pre-wrap; }
.follow-up-box { border-top: 1px solid #dadce0; margin-top: 1rem; padding-top: 2rem; }
.follow-up-box h2 { border: none; font-size: 1.2rem; text-align: center; margin-bottom: 1rem; }
</style>
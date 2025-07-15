<!-- src/components/SearchArea.vue -->
<template>
  <div class="search-area">
    <!-- 質問入力 -->
    <!-- <textarea> は必ず開閉タグで囲む -->
    <textarea
      :value="question"
      :disabled="disabled"
      rows="4"
      placeholder="AIへの質問を入力してください…"
      @input="onInput"
    ></textarea>

    <!-- 実行ボタン -->
    <button
      class="analyze-button"
      :disabled="disabled || loading"
      @click="onAnalyze"
    >
      <span v-if="!loading">AIに質問する</span>
      <span v-else>分析中…</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/* 1. props 定義 */
const props = defineProps<{
  question: string
  disabled: boolean
  loading: boolean
}>()

/* 2. emit 定義 */
const emit = defineEmits<{
  (e: 'update:question', value: string): void
  (e: 'analyze'): void
}>()

/* 3. 入力時のハンドラ */
function onInput(e: Event) {
  const v = (e.target as HTMLTextAreaElement).value
  emit('update:question', v)
}

/* 4. 実行ボタン押下時のハンドラ */
function onAnalyze() {
  emit('analyze')
}
</script>

<style scoped>
.search-area {
  background: var(--card-background-color);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

textarea {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: vertical;
}

.analyze-button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 500;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.analyze-button:disabled {
  background: #a0c3ff;
  cursor: not-allowed;
}
</style>

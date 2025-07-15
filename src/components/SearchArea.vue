<template>
  <div class="search-area">
    <textarea
      :value="question"
      :disabled="disabled"
      rows="4"
      placeholder="AIへの質問を入力してください…"
      @input="onInput"
    ></textarea>
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
const props = defineProps<{
  question: string
  disabled: boolean
  loading: boolean
}>()
const emit = defineEmits<{
  (e: 'update:question', value: string): void
  (e: 'analyze'): void
}>()

function onInput(e: Event) {
  emit('update:question', (e.target as HTMLTextAreaElement).value)
}
function onAnalyze() {
  emit('analyze')
}
</script>

<style scoped>
.search-area {
  background: var(--card-background-color);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
textarea {
  width: 100%; padding: 1rem; font-size: 1.1rem;
  border: 1px solid var(--border-color); border-radius: 8px;
  resize: vertical;
}
.analyze-button {
  align-self: flex-end; padding: 1rem 1.5rem;
  background: var(--primary-color); color: white;
  border: none; border-radius: 8px; cursor: pointer;
}
.analyze-button:disabled {
  background: #a0c3ff; cursor: not-allowed;
}
</style>
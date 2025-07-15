<template>
  <button
    class="stats-btn"
    :disabled="loading"
    @click="onClick"
  >
    {{ category.label }}
  </button>
</template>

<script lang="ts" setup>
import type { CategoryDefinition } from '@/data/estatData'

const props = defineProps<{
  category: CategoryDefinition
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'analyze', key: string): void
}>()

function onClick() {
  emit('analyze', props.category.key)
}
</script>

<style scoped>
.stats-btn {
  margin: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}
.stats-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

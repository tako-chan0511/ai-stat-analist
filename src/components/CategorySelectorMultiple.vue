<template>
  <div class="category-selector-multiple">
    <button
      v-for="cat in categories"
      :key="cat.id"
      @click="toggle(cat)"
      :class="{ active: isSelected(cat) }"
      :disabled="!isSelected(cat) && selected.length >= 2"
    >
      {{ cat.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CategoryDefinition } from '@/data/estatData'

const props = defineProps<{
  categories: CategoryDefinition[]
  selected: CategoryDefinition[]
}>()

const emit = defineEmits<{
  (e: 'update', val: CategoryDefinition[]): void
}>()

function isSelected(cat: CategoryDefinition) {
  return props.selected.some(c => c.id === cat.id)
}

function toggle(cat: CategoryDefinition) {
  const currently = isSelected(cat)
  let updated = [...props.selected]
  if (currently) {
    updated = updated.filter(c => c.id !== cat.id)
  } else if (updated.length < 2) {
    updated.push(cat)
  }
  emit('update', updated)
}
</script>

<style scoped>
.category-selector-multiple {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}
.category-selector-multiple button {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--card-background-color);
  cursor: pointer;
  transition: background 0.2s;
}
.category-selector-multiple button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.category-selector-multiple button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

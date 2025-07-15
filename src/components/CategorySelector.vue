<template>
  <section class="category-selection">
    <h2>分析したい統計データを選択してください</h2>
    <div class="buttons">
      <button
        v-for="cat in categories"
        :key="cat.key"
        @click="$emit('select', cat)"
        :class="{ active: selected?.key === cat.key }"
      >
        {{ cat.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CategoryDefinition } from '@/data/estatData'
const props = defineProps<{
  categories: CategoryDefinition[]
  selected: CategoryDefinition | null
}>()
</script>

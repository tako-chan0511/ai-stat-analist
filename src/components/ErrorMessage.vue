<!-- ErrorMessage.vue -->
<template>
  <div class="error-message">
    <strong>エラー:</strong> {{ message }}
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ message: string }>()
</script>
<style scoped>
.error-message {
  margin-top: 1.5rem; padding: 1rem;
  background: #fdeaed; color: #a50e0e;
  border: 1px solid #f4c7c7; border-radius: 8px;
}
</style>

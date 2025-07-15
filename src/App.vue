<template>
  <HomeView />
</template>

<script setup lang="ts">
// src/App.vue
// シンプルに HomeView コンポーネントをマウントする
import HomeView from './views/HomeView.vue'
</script>

<style>
/* グローバルスタイル */
body {
  margin: 0;
  font-family: 'Noto Sans JP', sans-serif;
  background-color: #f8f9fa;
}

#app {
  padding: 2rem;
}
</style>

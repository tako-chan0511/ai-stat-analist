<!-- Loader.vue -->
<template><div class="loading-spinner-large"></div></template>
<style scoped>
.loading-spinner-large {
  width: 48px; height: 48px;
  border: 5px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin: 3rem auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

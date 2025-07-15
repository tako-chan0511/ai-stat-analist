// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App)
  .use(router)      // ← vue-router をプラグインとして登録
  .mount('#app')

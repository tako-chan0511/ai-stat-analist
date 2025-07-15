// src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomeView        from '@/views/HomeView.vue'
import CorrelationView from '@/views/CorrelationView.vue'

const routes = [
  { path: '/',            name: 'Home',        component: HomeView },
  { path: '/correlation', name: 'Correlation', component: CorrelationView }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

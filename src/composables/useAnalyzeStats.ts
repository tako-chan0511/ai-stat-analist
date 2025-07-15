import { ref } from 'vue'
import type { FilterCondition } from '@/data/estatData'

export interface AnalyzePayload {
  question: string
  filter: FilterCondition
  statsDataId: string
  categoryInfo: {
    name: string
    unit?: string
  }
}

export default function useAnalyzeStats() {
  const loading = ref(false)
  const result  = ref<any>(null)
  const error   = ref<string|null>(null)

  async function analyzeStats(payload: AnalyzePayload) {
    loading.value = true
    error.value   = null
    try {
      const res = await fetch('/api/analyze-stats', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      result.value = data
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { loading, result, error, analyzeStats }
}
import { ref } from 'vue'
import type { FilterCondition } from '@/data/estatData'

export default function useAnalyzeStats() {
  const loading = ref(false)
  const result = ref<any>(null)
  const error = ref<string | null>(null)

  async function analyzeStats(filter: FilterCondition) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/analyze-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter })
      })
      if (!res.ok) throw new Error(await res.text())
      result.value = await res.json()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { loading, result, error, analyzeStats }
}

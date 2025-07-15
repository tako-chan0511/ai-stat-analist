// composables/useCorrelationStats.ts
import { ref } from 'vue'

export default function useCorrelationStats() {
  const loading = ref(false)
  const error = ref<string|null>(null)
  const result = ref<{ points: {x:number,y:number}[], corr: number } | null>(null)

  async function analyzeCorrelation(filters: [FilterCondition, FilterCondition]) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/analyze-correlation', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ filters })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||res.statusText)
      result.value = data
    } catch(e:any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { loading, error, result, analyzeCorrelation }
}

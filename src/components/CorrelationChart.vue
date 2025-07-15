<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Chart from 'chart.js/auto'

// Props: 散布図のデータ点と回帰直線のデータ
interface Point { x: number; y: number }
interface RegressionLine { x: number[]; y: number[] }

const props = defineProps<{
  points: Point[];
  regression: RegressionLine;
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

// チャート生成／更新関数
function renderChart() {
  if (!canvasRef.value) return

  // 既存インスタンスを破棄
  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(canvasRef.value, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'データ点',
          data: props.points,
          showLine: false,
          pointBackgroundColor: undefined, // デフォルト色を適用
        },
        {
          label: '回帰直線',
          data: props.regression.x.map((x, i) => ({ x, y: props.regression.y[i] })),
          showLine: true,
          fill: false,
          pointRadius: 0,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: '指標X'
          }
        },
        y: {
          title: {
            display: true,
            text: '指標Y'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  })
}

onMounted(renderChart)
watch(() => [props.points, props.regression], renderChart, { deep: true })
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 400px;
  margin: 2rem 0;
}
</style>

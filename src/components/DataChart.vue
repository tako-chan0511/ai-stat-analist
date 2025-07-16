<template>
  <div>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartData, ChartOptions } from 'chart.js';

const props = defineProps<{
  chartData: ChartData;
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

// グラフ用のカラーパレット
const colorPalette = [
  '#1a73e8', // Blue
  '#ff6d00', // Orange
  '#34a853', // Green
  '#fbbc05', // Yellow
  '#ea4335', // Red
  '#9c27b0', // Purple
];
const colorPaletteRGBA = [
  'rgba(26, 115, 232, 0.2)',
  'rgba(255, 109, 0, 0.2)',
  'rgba(52, 168, 83, 0.2)',
  'rgba(251, 188, 5, 0.2)',
  'rgba(234, 67, 53, 0.2)',
  'rgba(156, 39, 176, 0.2)',
];


const renderChart = () => {
  if (chartInstance) {
    chartInstance.destroy();
  }
  if (chartCanvas.value && props.chartData) {
    const ctx = chartCanvas.value.getContext('2d');
    if (ctx) {
      // ★★★★★ ここからが修正点 ★★★★★
      const options: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            beginAtZero: true, // Y軸を常に0から始める
          },
          // 第2Y軸（y1）が必要な場合のみ表示
          ...(props.chartData.datasets.some(d => (d as any).yAxisID === 'y1') && {
            y1: {
              type: 'linear' as const,
              display: true,
              position: 'right' as const,
              grid: {
                drawOnChartArea: false, 
              },
              beginAtZero: true, // 第2Y軸も常に0から始める
            }
          })
        }
      };
      // ★★★★★ ここまでが修正点 ★★★★★

      // データセットの数に応じて動的に色を割り当てる
      props.chartData.datasets.forEach((dataset, index) => {
        dataset.borderColor = colorPalette[index % colorPalette.length];
        dataset.backgroundColor = colorPaletteRGBA[index % colorPaletteRGBA.length];
      });

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: props.chartData,
        options: options,
      });
    }
  }
};

onMounted(renderChart);
watch(() => props.chartData, renderChart, { deep: true });

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>

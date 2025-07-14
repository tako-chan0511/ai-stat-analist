<template>
  <div class="chart-container">
    <component 
      :is="chartComponent" 
      v-if="chartComponent"
      :data="chartData" 
      :options="chartOptions" 
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line, Bar } from 'vue-chartjs';
import { 
  Chart as ChartJS, 
  Title, 
  Tooltip, 
  Legend, 
  LineElement, 
  BarElement,
  CategoryScale, 
  LinearScale,
  PointElement,
} from 'chart.js';

// Chart.jsに必要なコンポーネントを登録
ChartJS.register(
  Title, 
  Tooltip, 
  Legend, 
  LineElement, 
  BarElement,
  CategoryScale, 
  LinearScale,
  PointElement
);

// 親コンポーネント(App.vue)から渡されるプロパティを定義
const props = defineProps<{
  chartType: 'line' | 'bar';
  chartData: any;
}>();

// chartTypeに応じて、描画するグラフコンポーネントを動的に切り替える
const chartComponent = computed(() => {
  if (props.chartType === 'line') return Line;
  if (props.chartType === 'bar') return Bar;
  return null;
});

// グラフのオプション設定
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
}
</style>

<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface TrendSeries {
  color: string;
  name: string;
  values: number[];
}

const props = defineProps<{
  height: number;
  series: TrendSeries[];
  times: string[];
  unit: string;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function chartOption(): ECOption {
  return {
    animation: false,
    grid: { left: 44, right: 20, top: 32, bottom: 30 },
    tooltip: { trigger: 'axis' },
    legend: { right: 12, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.times,
      axisLine: { lineStyle: { color: '#dfe4ea' } },
      axisLabel: { color: '#7b8493' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: props.unit === '%' ? 100 : undefined,
      axisLabel: { formatter: `{value}${props.unit}`, color: '#7b8493' },
      splitLine: { lineStyle: { color: '#edf0f5' } },
    },
    series: props.series.map((item) => ({
      name: item.name,
      type: 'line',
      data: item.values,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: item.color },
      itemStyle: { color: item.color },
    })),
  };
}

onMounted(() => renderEcharts(chartOption()));
watch(
  () => [props.times, props.series, props.unit],
  () => renderEcharts(chartOption()),
  { deep: true },
);
</script>

<template>
  <EchartsUI ref="chartRef" :height="`${height}px`" />
</template>

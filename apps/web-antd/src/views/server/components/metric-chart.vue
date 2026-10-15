<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

/** 单个指标的曲线：points 为 [时间, 值]，值为 null 表示这段时间没有数据（曲线断开）；compact 为列表里的小图 */
const props = defineProps<{
  compact?: boolean;
  end: number;
  height: number;
  name: string;
  points: [number, null | number][];
  start: number;
  unit: string;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1);
}

function chartOption(): ECOption {
  const sameDay = dayjs(props.start).isSame(props.end, 'day');
  return {
    animation: false,
    grid: props.compact
      ? { bottom: 6, left: 56, right: 12, top: 10 }
      : { bottom: 36, left: 64, right: 24, top: 24 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => (typeof value === 'number' ? `${format(value)} ${props.unit}` : '—'),
    },
    xAxis: {
      axisLabel: {
        color: '#7b8493',
        formatter: (value: number) => dayjs(value).format(sameDay ? 'HH:mm' : 'MM-DD HH:mm'),
        hideOverlap: true,
        show: !props.compact,
      },
      axisLine: { lineStyle: { color: '#dfe4ea' } },
      axisTick: { show: false },
      max: props.end,
      min: props.start,
      type: 'time',
    },
    yAxis: {
      axisLabel: { color: '#7b8493', formatter: (value: number) => format(value) },
      min: 0,
      splitLine: { lineStyle: { color: '#edf0f5' } },
      splitNumber: props.compact ? 2 : 5,
      type: 'value',
    },
    series: [
      {
        data: props.points,
        itemStyle: { color: '#1677ff' },
        lineStyle: { color: '#1677ff', width: props.compact ? 1.2 : 1.8 },
        name: props.name,
        showSymbol: false,
        symbol: 'circle',
        type: 'line',
      },
    ],
  };
}

async function render() {
  await renderEcharts(chartOption());
}

onMounted(render);
watch(() => [props.points, props.start, props.end, props.unit], render);
</script>

<template>
  <EchartsUI ref="chartRef" :height="`${height}px`" />
</template>

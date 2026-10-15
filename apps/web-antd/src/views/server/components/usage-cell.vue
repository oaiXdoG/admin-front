<script lang="ts" setup>
import { computed } from 'vue';

/** 列表里的用量：第一行进度条 + 百分比，第二行说明；CPU、内存、磁盘共用，保证几列高度和位置一致 */
const props = defineProps<{ detail: string; percent?: number }>();

const value = computed(() => Math.min(100, Math.max(0, props.percent ?? 0)));
const color = computed(() => {
  if (value.value >= 90) return '#ff4d4f';
  return value.value >= 75 ? '#faad14' : '#1677ff';
});
</script>

<template>
  <div v-if="percent !== undefined" class="usage-cell">
    <div class="usage-line">
      <div class="usage-track">
        <div :style="{ width: `${value}%`, background: color }" class="usage-bar"></div>
      </div>
      <span class="usage-percent">{{ value.toFixed(value < 10 ? 1 : 0) }}%</span>
    </div>
    <div class="text-muted-foreground text-xs">{{ detail }}</div>
  </div>
  <span v-else class="text-muted-foreground">—</span>
</template>

<style scoped>
.usage-cell {
  width: 100%;
  line-height: 1.6;
}

.usage-line {
  display: flex;
  gap: 8px;
  align-items: center;
}

.usage-track {
  flex: 1;
  height: 6px;
  overflow: hidden;
  background: hsl(var(--accent));
  border-radius: 3px;
}

.usage-bar {
  height: 100%;
  border-radius: 3px;
}

.usage-percent {
  flex: none;
  width: 44px;
  text-align: right;
}
</style>

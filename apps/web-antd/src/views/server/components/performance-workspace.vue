<script lang="ts" setup>
import type { ProcessIdentity, ServerSample } from '../store';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, RadioGroup, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import ServerIdentity from './server-identity.vue';
import TrendChart from './trend-chart.vue';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    project: string;
    sample?: ServerSample;
    target?: ProcessIdentity;
  }>(),
  { compact: false, sample: undefined, target: undefined },
);

const rangeOptions = [
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
];

const range = ref(60);
const autoRefresh = ref(true);
const refreshedAt = ref<string>();

const sampleSizes: Record<number, number> = { 15: 4, 30: 7, 60: 12 };

const sampleSize = computed(() => sampleSizes[range.value] ?? 12);
const times = computed(
  () => props.sample?.times.slice(-sampleSize.value) ?? [],
);

function trend(name: string, values: number[] | undefined, color: string) {
  return { name, values: values?.slice(-sampleSize.value) ?? [], color };
}

const metrics = computed(() => [
  { label: '进程 CPU 使用率', value: props.sample?.cpu, color: '#646cff' },
  {
    label: '进程内存占用',
    value: props.sample?.memory,
    color: '#168b73',
    unit: ' MB',
  },
  { label: '所在主机磁盘使用率', value: props.sample?.disk, color: '#c08a32' },
]);

const cpuSeries = computed(() => [
  trend('CPU', props.sample?.cpuTrend, '#646cff'),
]);
const memorySeries = computed(() => [
  trend('内存', props.sample?.memoryTrend, '#168b73'),
]);
const networkSeries = computed(() => [
  trend('接收', props.sample?.networkIn, '#168b73'),
  trend('发送', props.sample?.networkOut, '#c08a32'),
]);

function refresh() {
  refreshedAt.value = dayjs().format('HH:mm:ss');
}
</script>

<template>
  <div
    class="admin-page server-page"
    :class="{ 'server-performance-compact': compact }"
  >
    <section class="server-section">
      <ServerIdentity
        :project="project"
        :running="sample?.running ?? true"
        :sample="sample"
        :target="target"
      />
      <div class="server-metrics">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="server-metric"
        >
          <span>{{ metric.label }}</span>
          <strong>
            {{
              metric.value == null
                ? '—'
                : `${metric.value.toFixed(1)}${metric.unit ?? '%'}`
            }}
          </strong>
          <div v-if="!metric.unit" class="server-meter">
            <i
              :style="{
                width: `${metric.value ?? 0}%`,
                backgroundColor: metric.color,
              }"
            ></i>
          </div>
        </div>
        <div class="server-metric">
          <span>进程运行时间</span>
          <strong class="server-uptime">{{ sample?.uptime ?? '—' }}</strong>
          <span class="server-metric-foot">{{ sample?.version ?? '—' }}</span>
        </div>
      </div>
    </section>
    <section class="server-section">
      <div class="server-toolbar">
        <h3>性能趋势</h3>
        <div class="server-toolbar-actions">
          <RadioGroup
            v-model:value="range"
            button-style="solid"
            option-type="button"
            :options="rangeOptions"
          />
          <Tooltip :title="autoRefresh ? '暂停刷新' : '恢复刷新'">
            <Button
              :aria-label="autoRefresh ? '暂停刷新' : '恢复刷新'"
              :disabled="!sample"
              @click="autoRefresh = !autoRefresh"
            >
              <IconifyIcon
                class="server-btn-icon only"
                :icon="
                  autoRefresh ? 'lucide:circle-pause' : 'lucide:refresh-cw'
                "
              />
            </Button>
          </Tooltip>
          <Tooltip title="刷新">
            <Button aria-label="刷新监控" :disabled="!sample" @click="refresh">
              <IconifyIcon
                class="server-btn-icon only"
                icon="lucide:rotate-cw"
              />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div class="server-chart-grid">
        <div class="server-chart">
          <h4>CPU</h4>
          <TrendChart
            v-if="sample"
            :height="compact ? 160 : 240"
            :series="cpuSeries"
            :times="times"
            unit="%"
          />
          <Empty
            v-else
            description="暂无监控数据"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
        <div class="server-chart">
          <h4>进程内存</h4>
          <TrendChart
            v-if="sample"
            :height="compact ? 160 : 240"
            :series="memorySeries"
            :times="times"
            unit=" MB"
          />
          <Empty
            v-else
            description="暂无监控数据"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
      </div>
      <div class="server-chart server-network">
        <h4>所在主机网络流量</h4>
        <TrendChart
          v-if="sample"
          :height="compact ? 160 : 220"
          :series="networkSeries"
          :times="times"
          unit=" MB/s"
        />
        <Empty
          v-else
          description="暂无监控数据"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </div>
      <div class="server-update-time">
        {{ refreshedAt ? `更新时间 ${refreshedAt}` : '更新时间 —' }}
      </div>
    </section>
  </div>
</template>

<style scoped src="../server.css"></style>

<style scoped>
.server-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 26px;
}

.server-metric {
  padding: 0 24px;
  border-left: 1px solid #edf0f5;
}

.server-metric:first-child {
  padding-left: 0;
  border: 0;
}

.server-metric > span {
  display: block;
  font-size: 13px;
  color: #7b8493;
}

.server-metric strong {
  display: block;
  margin-top: 12px;
  font-size: 27px;
  font-weight: 600;
  line-height: 34px;
}

.server-metric strong.server-uptime {
  font-size: 19px;
}

.server-metric .server-metric-foot {
  margin-top: 14px;
  overflow-wrap: anywhere;
}

.server-meter {
  height: 4px;
  margin-top: 18px;
  background: #edf0f5;
}

.server-meter i {
  display: block;
  height: 100%;
}

.server-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
}

.server-chart h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
}

.server-chart :deep(.ant-empty) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 160px;
  margin-block: 20px;
}

.server-network {
  padding-top: 22px;
  margin-top: 24px;
  border-top: 1px solid #edf0f5;
}

.server-update-time {
  margin-top: 12px;
  font-size: 12px;
  color: #8b95a4;
  text-align: right;
}

.admin-page.server-performance-compact {
  gap: 12px;
  min-height: 0;
}

.server-performance-compact .server-section {
  padding: 14px 18px;
}

.server-performance-compact .server-metrics {
  margin-top: 14px;
}

.server-performance-compact .server-metric strong {
  margin-top: 6px;
  font-size: 23px;
}

.server-performance-compact .server-meter {
  margin-top: 10px;
}

.server-performance-compact > .server-section:last-child {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 18px;
}

.server-performance-compact .server-toolbar {
  grid-column: 1 / -1;
  margin: 0;
}

.server-performance-compact .server-chart-grid {
  display: contents;
}

.server-performance-compact .server-network {
  padding: 0;
  margin: 0;
  border: 0;
}

.server-performance-compact .server-update-time {
  grid-column: 1 / -1;
  margin: 0;
}

.server-performance-compact .server-chart :deep(.ant-empty) {
  min-height: 100px;
  margin-block: 12px;
}

@media (max-width: 767px) {
  .server-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 0;
  }

  .server-metric {
    padding-inline: 16px;
  }

  .server-metric:nth-child(3) {
    padding-left: 0;
    border: 0;
  }

  .server-metric strong {
    font-size: 23px;
  }

  .server-metric strong.server-uptime {
    font-size: 16px;
  }

  .server-chart-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .server-performance-compact > .server-section:last-child {
    grid-template-columns: 1fr;
  }

  .server-performance-compact .server-section {
    padding-inline: 14px;
  }
}
</style>

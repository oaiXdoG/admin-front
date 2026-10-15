<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { MetricPoint, ProcessRecord, ServerRecord } from '#/api/types';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Empty,
  message,
  Modal,
  RadioButton,
  RadioGroup,
  Select,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getProcessesApi, getServerMetricsApi, getServersApi } from '#/api';
import { downloadCsv } from '#/components/field-mapping/types';
import { useProjectStore } from '#/store';

import MetricChart from './components/metric-chart.vue';
import { formatBytes, serverStatusTags } from './format';

type Range = '1h' | '7d' | '24h' | 'custom';

interface MetricDefinition {
  key: string;
  name: string;
  unit: string;
  help?: string;
  value: (point: MetricPoint) => number;
}

interface MetricGroup {
  name: string;
  metrics: MetricDefinition[];
}

const MB = 1024 * 1024;
const GB = 1024 * MB;
const DAY = 86_400_000;
/** 粒度（秒）和对应的名称；每条曲线最多约 2000 个点 */
const STEPS = [
  { label: '10 秒', value: 10 },
  { label: '1 分钟', value: 60 },
  { label: '5 分钟', value: 300 },
  { label: '1 小时', value: 3600 },
];
const POINTS_MAX = 2100;
const REALTIME_REFRESH_MS = 10_000;

const HOST_GROUPS: MetricGroup[] = [
  {
    metrics: [
      { key: 'cpu', name: 'CPU 利用率', unit: '%', value: (p) => p.cpu },
      { help: '可运行和等待 IO 的进程平均数，持续超过 CPU 核数说明负载偏高', key: 'load1', name: '1 分钟负载', unit: '', value: (p) => p.load1 },
    ],
    name: 'CPU 监控',
  },
  {
    metrics: [
      { key: 'memoryUsed', name: '内存使用量', unit: 'MB', value: (p) => p.memoryUsed / MB },
      { key: 'memoryRate', name: '内存利用率', unit: '%', value: (p) => (p.memoryTotal ? (p.memoryUsed / p.memoryTotal) * 100 : 0) },
    ],
    name: '内存监控',
  },
  {
    metrics: [
      { key: 'diskUsed', name: '磁盘使用量（/）', unit: 'GB', value: (p) => p.diskUsed / GB },
      { key: 'diskRate', name: '磁盘利用率（/）', unit: '%', value: (p) => (p.diskTotal ? (p.diskUsed / p.diskTotal) * 100 : 0) },
    ],
    name: '磁盘监控',
  },
  {
    metrics: [
      { key: 'netOut', name: '出带宽', unit: 'Mbps', value: (p) => (p.netOut * 8) / 1_000_000 },
      { key: 'netIn', name: '入带宽', unit: 'Mbps', value: (p) => (p.netIn * 8) / 1_000_000 },
      { key: 'packetsOut', name: '出包量', unit: '个/秒', value: (p) => p.packetsOut },
      { key: 'packetsIn', name: '入包量', unit: '个/秒', value: (p) => p.packetsIn },
      { help: '已建立（ESTABLISHED）的 TCP 连接数', key: 'tcp', name: 'TCP 连接数', unit: '个', value: (p) => p.tcp },
    ],
    name: '网络监控',
  },
];

const PROCESS_GROUPS: MetricGroup[] = [
  {
    metrics: [{ help: '占整机 CPU 的百分比', key: 'cpu', name: 'CPU 利用率', unit: '%', value: (p) => p.cpu }],
    name: 'CPU 监控',
  },
  {
    metrics: [{ help: '进程实际占用的物理内存（RSS），不等于 JVM 堆使用量', key: 'memoryUsed', name: '常驻内存', unit: 'MB', value: (p) => p.memoryUsed / MB }],
    name: '内存监控',
  },
  {
    metrics: [{ key: 'threads', name: '线程数', unit: '个', value: (p) => p.threads }],
    name: '线程监控',
  },
  {
    metrics: [{ help: '这个进程已建立的 TCP 连接数，游戏服可以粗略反映在线连接', key: 'tcp', name: 'TCP 连接数', unit: '个', value: (p) => p.tcp }],
    name: '网络监控',
  },
];

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const projectId = computed(() => projectStore.currentProjectId as number);

const servers = ref<ServerRecord[]>([]);
const processes = ref<ProcessRecord[]>([]);
const serverId = ref<number>();
/** 0 为主机 */
const target = ref(0);
const range = ref<Range>('1h');
const customRange = ref<[Dayjs, Dayjs]>();
const step = ref(10);
const timeWindow = ref<[number, number]>([Date.now() - 3_600_000, Date.now()]);
const points = ref<MetricPoint[]>([]);
const loading = ref(false);
const expanded = ref<MetricDefinition | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

const server = computed(() => servers.value.find((item) => item.id === serverId.value));
const serverProcesses = computed(() => processes.value.filter((item) => item.serverId === serverId.value));
const targetOptions = computed(() => [
  { label: '主机', value: 0 },
  ...serverProcesses.value.map((item) => ({ label: item.remark ? `${item.name}（${item.remark}）` : item.name, value: item.id })),
]);
const groups = computed(() => (target.value === 0 ? HOST_GROUPS : PROCESS_GROUPS));
const allMetrics = computed(() => groups.value.flatMap((group) => group.metrics));
const stepOptions = computed(() =>
  STEPS.filter((item) => (timeWindow.value[1] - timeWindow.value[0]) / (item.value * 1000) <= POINTS_MAX),
);
const targetName = computed(() =>
  target.value === 0 ? '主机' : (serverProcesses.value.find((item) => item.id === target.value)?.name ?? ''),
);

/** 按选择的范围算出起止时间，并把粒度调到合适的值 */
function computeWindow() {
  const now = Date.now();
  if (range.value === 'custom' && customRange.value) {
    timeWindow.value = [customRange.value[0].valueOf(), customRange.value[1].valueOf()];
  } else {
    const length = { '1h': 3_600_000, '7d': 7 * DAY, '24h': DAY, custom: 3_600_000 }[range.value];
    timeWindow.value = [now - length, now];
  }
  if (!stepOptions.value.some((item) => item.value === step.value)) {
    step.value = stepOptions.value[0]?.value ?? 3600;
  }
}

function defaultStep(value: Range) {
  return { '1h': 10, '7d': 300, '24h': 60, custom: 60 }[value];
}

async function load() {
  if (serverId.value === undefined) return;
  computeWindow();
  loading.value = true;
  try {
    const processId = target.value === 0 ? null : target.value;
    points.value = (
      await getServerMetricsApi(projectId.value, serverId.value, processId, timeWindow.value[0], timeWindow.value[1], step.value)
    ).list;
  } catch {
    points.value = [];
  } finally {
    loading.value = false;
  }
}

/** 曲线数据：相邻两点间隔超过两个粒度视为没有数据，插入 null 让曲线断开 */
function seriesOf(metric: MetricDefinition): [number, null | number][] {
  const result: [number, null | number][] = [];
  let previous: number | undefined;
  for (const point of points.value) {
    if (previous !== undefined && point.time - previous > step.value * 2000) {
      result.push([previous + step.value * 1000, null]);
    }
    result.push([point.time, Number(metric.value(point).toFixed(3))]);
    previous = point.time;
  }
  return result;
}

const series = computed(() => Object.fromEntries(allMetrics.value.map((metric) => [metric.key, seriesOf(metric)])));

function stats(key: string) {
  const values = (series.value[key] ?? []).map((item) => item[1]).filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return { avg: sum / values.length, max: Math.max(...values), min: Math.min(...values) };
}

function formatValue(value: number | undefined, unit: string) {
  if (value === undefined) return '—';
  const text = Number.isInteger(value) ? String(value) : value.toFixed(Math.abs(value) < 10 ? 3 : 1);
  return `${Number(text)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
}

function exportData() {
  if (points.value.length === 0) {
    message.warning('当前时间范围没有数据');
    return;
  }
  downloadCsv(
    `监控-${server.value?.name ?? ''}-${targetName.value}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
    [
      { title: '时间', value: (point: MetricPoint) => dayjs(point.time).format('YYYY-MM-DD HH:mm:ss') },
      ...allMetrics.value.map((metric) => ({
        title: `${metric.name}${metric.unit ? `（${metric.unit}）` : ''}`,
        value: (point: MetricPoint) => Number(metric.value(point).toFixed(3)),
      })),
    ],
    points.value,
  );
}

function onRangeChange() {
  step.value = defaultStep(range.value);
  if (range.value === 'custom' && !customRange.value) {
    customRange.value = [dayjs().subtract(6, 'hour'), dayjs()];
  }
  void load();
}

function disabledDate(current: Dayjs) {
  return current.isAfter(dayjs().endOf('day')) || current.isBefore(dayjs().subtract(7, 'day').startOf('day'));
}

/** 切换对象时同步到地址栏，刷新页面或分享链接时保持 */
function syncQuery() {
  void router.replace({
    query: { processId: target.value === 0 ? undefined : String(target.value), serverId: String(serverId.value) },
  });
}

function onServerChange() {
  target.value = 0;
  syncQuery();
  void load();
}

function onTargetChange() {
  syncQuery();
  void load();
}

watch(range, (value) => {
  clearInterval(timer);
  if (value === '1h') {
    timer = setInterval(() => void load(), REALTIME_REFRESH_MS);
  }
});

onMounted(async () => {
  const [serverResult, processResult] = await Promise.all([getServersApi(projectId.value), getProcessesApi(projectId.value)]);
  servers.value = serverResult.list.filter((item) => item.status !== 'pending');
  processes.value = processResult.list;
  const queryServer = Number(route.query.serverId);
  const queryProcess = Number(route.query.processId);
  serverId.value = servers.value.some((item) => item.id === queryServer) ? queryServer : servers.value[0]?.id;
  target.value = processes.value.some((item) => item.id === queryProcess && item.serverId === serverId.value) ? queryProcess : 0;
  timer = setInterval(() => void load(), REALTIME_REFRESH_MS);
  await load();
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <Page auto-content-height>
    <div class="monitor-card">
      <div class="monitor-toolbar">
        <div class="flex flex-wrap items-center gap-3">
          <Select
            v-model:value="serverId"
            :options="servers.map((item) => ({ label: item.groupName ? `${item.name}（${item.groupName}）` : item.name, value: item.id }))"
            class="w-[200px]"
            placeholder="选择服务器"
            @change="onServerChange"
          />
          <Select v-model:value="target" :options="targetOptions" class="w-[220px]" @change="onTargetChange" />
          <span v-if="server">
            <Tag :color="serverStatusTags[server.status].color">{{ serverStatusTags[server.status].text }}</Tag>
          </span>
          <span v-if="server" class="text-muted-foreground text-xs">
            {{ server.hostname }} · 公网 {{ server.ip }}{{ server.privateIp ? ` · 内网 ${server.privateIp.replaceAll(',', ', ')}` : '' }} · {{ server.cpuCores }} 核 · {{ formatBytes(server.memoryTotal) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <RadioGroup v-model:value="range" button-style="solid" @change="onRangeChange">
            <RadioButton value="1h">实时</RadioButton>
            <RadioButton value="24h">近 24 小时</RadioButton>
            <RadioButton value="7d">近 7 天</RadioButton>
            <RadioButton value="custom">选择日期</RadioButton>
          </RadioGroup>
          <DatePicker.RangePicker
            v-if="range === 'custom'"
            v-model:value="customRange"
            :disabled-date="disabledDate"
            :show-time="{ format: 'HH:mm' }"
            allow-clear
            format="MM-DD HH:mm"
            @change="load"
          />
          <span class="text-muted-foreground text-sm">时间粒度</span>
          <Select v-model:value="step" :options="stepOptions" class="w-[100px]" @change="load" />
          <Button :loading="loading" @click="load">
            <template #icon><IconifyIcon class="size-4" icon="lucide:refresh-cw" /></template>
            刷新
          </Button>
          <Button @click="exportData">
            <template #icon><IconifyIcon class="size-4" icon="lucide:download" /></template>
            导出数据
          </Button>
        </div>
      </div>
      <div class="text-muted-foreground mb-2 text-xs">
        注：每个点是该粒度内的平均值；Max、Min、Avg 为当前曲线上所有点的最大值、最小值和平均值。{{ range === '1h' ? '实时模式每 10 秒自动刷新。' : '' }}数据保留 7 天。
      </div>

      <Spin :spinning="loading && points.length === 0">
        <Empty v-if="!serverId" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="还没有接入的服务器" />
        <template v-else>
          <div v-for="group in groups" :key="group.name" class="monitor-group">
            <div class="monitor-group-name">{{ group.name }}</div>
            <div class="min-w-0 flex-1">
              <div v-for="metric in group.metrics" :key="metric.key" class="monitor-row">
                <div class="monitor-metric">
                  <span class="font-medium">{{ metric.name }}</span>
                  <span v-if="metric.unit" class="text-muted-foreground ml-1 text-xs">{{ metric.unit }}</span>
                  <Tooltip v-if="metric.help" :title="metric.help">
                    <span class="text-muted-foreground ml-1 inline-flex align-middle">
                      <IconifyIcon class="size-3.5" icon="lucide:circle-help" />
                    </span>
                  </Tooltip>
                </div>
                <div class="min-w-0">
                  <MetricChart
                    :end="timeWindow[1]"
                    :height="96"
                    :name="metric.name"
                    :points="series[metric.key] ?? []"
                    :start="timeWindow[0]"
                    :unit="metric.unit"
                    compact
                    group="server-monitor"
                  />
                </div>
                <div v-for="kind in (['max', 'min', 'avg'] as const)" :key="kind" class="monitor-stat">
                  <div class="text-muted-foreground text-xs">{{ { avg: 'Avg', max: 'Max', min: 'Min' }[kind] }}</div>
                  <div>{{ formatValue(stats(metric.key)?.[kind], metric.unit) }}</div>
                </div>
                <Tooltip title="放大查看">
                  <Button size="small" type="text" @click="expanded = metric">
                    <template #icon><IconifyIcon class="size-4" icon="lucide:maximize-2" /></template>
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </template>
      </Spin>
    </div>

    <Modal
      :footer="null"
      :open="expanded !== null"
      :title="expanded ? `${server?.name ?? ''} · ${targetName} · ${expanded.name}${expanded.unit ? `（${expanded.unit}）` : ''}` : ''"
      :width="1100"
      destroy-on-close
      @cancel="expanded = null"
    >
      <template v-if="expanded">
        <MetricChart
          :end="timeWindow[1]"
          :height="420"
          :name="expanded.name"
          :points="series[expanded.key] ?? []"
          :start="timeWindow[0]"
          :unit="expanded.unit"
        />
        <div class="mt-2 flex gap-10">
          <div v-for="kind in (['max', 'min', 'avg'] as const)" :key="kind">
            <span class="text-muted-foreground mr-2 text-xs">{{ { avg: 'Avg', max: 'Max', min: 'Min' }[kind] }}</span>
            <span>{{ formatValue(stats(expanded.key)?.[kind], expanded.unit) }}</span>
          </div>
        </div>
      </template>
    </Modal>
  </Page>
</template>

<style scoped>
.monitor-card {
  padding: 16px 20px;
  background: hsl(var(--card));
  border-radius: 8px;
}

.monitor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.monitor-group {
  display: flex;
  border-top: 1px solid hsl(var(--border));
}

.monitor-group-name {
  flex: none;
  width: 120px;
  padding-top: 14px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.monitor-row {
  display: grid;
  grid-template-columns: 170px minmax(240px, 1fr) repeat(3, 150px) 40px;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.monitor-row:last-child {
  border-bottom: none;
}

.monitor-metric {
  padding-top: 6px;
  align-self: start;
}

.monitor-stat {
  line-height: 1.6;
}
</style>

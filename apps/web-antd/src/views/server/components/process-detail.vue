<script lang="ts" setup>
import type { ProcessRecord } from '#/api/types';

import { computed, ref, watch } from 'vue';

import { Descriptions, DescriptionsItem, Drawer, Tag } from 'ant-design-vue';

import { formatBytes, formatDuration, formatPercent, processStateTag } from '../format';
import TaskList from './task-list.vue';

/** 进程详情：当前状态、指标和执行记录（监控曲线在「监控详情」页） */
const props = defineProps<{ process: null | ProcessRecord; projectId: number }>();
const emit = defineEmits<{ close: [] }>();

const taskList = ref<InstanceType<typeof TaskList>>();

const state = computed(() => processStateTag(props.process?.state));

/** 指令完成后列表刷新时，执行记录也跟着刷新 */
watch(
  () => props.process?.task?.status,
  () => taskList.value?.reload(),
);
</script>

<template>
  <Drawer
    :open="process !== null"
    :title="process ? `${process.serverName} / ${process.name}` : ''"
    :width="780"
    @close="emit('close')"
  >
    <template v-if="process">
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem label="状态">
          <Tag :color="state.color">{{ state.text }}</Tag>
          <Tag v-if="process.pendingRestart" color="warning">待重启</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="PID">{{ process.metric?.pid || '—' }}</DescriptionsItem>
        <DescriptionsItem label="CPU">{{ formatPercent(process.metric?.cpu) }}</DescriptionsItem>
        <DescriptionsItem label="常驻内存">{{ formatBytes(process.metric?.memory) }}</DescriptionsItem>
        <DescriptionsItem label="线程数">{{ process.metric?.threads ?? '—' }}</DescriptionsItem>
        <DescriptionsItem label="TCP 连接">{{ process.metric?.tcp ?? '—' }}</DescriptionsItem>
        <DescriptionsItem label="运行时长">
          {{
            process.state === 'active' && process.metric?.startedAt
              ? formatDuration((Date.now() - process.metric.startedAt) / 1000)
              : '—'
          }}
        </DescriptionsItem>
        <DescriptionsItem label="工作目录" :span="2">{{ process.workDir }}</DescriptionsItem>
        <DescriptionsItem label="服务名">adm-{{ process.name }}</DescriptionsItem>
        <DescriptionsItem label="配置版本">
          {{ process.configVersion }}
          <span v-if="process.metric?.configVersion" class="text-muted-foreground">
            （运行中：{{ process.metric.configVersion }}）
          </span>
        </DescriptionsItem>
      </Descriptions>
      <div class="mb-1 mt-6 font-medium">执行记录</div>
      <TaskList ref="taskList" :process-id="process.id" :project-id="projectId" />
    </template>
  </Drawer>
</template>

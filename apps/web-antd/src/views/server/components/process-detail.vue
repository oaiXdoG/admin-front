<script lang="ts" setup>
import type { ProcessRecord } from '#/api/types';

import { computed, ref, watch } from 'vue';

import { useAccess } from '@vben/access';

import { Descriptions, DescriptionsItem, Drawer, TabPane, Tabs, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { formatBytes, formatDuration, formatPercent, processStateTag } from '../format';
import ProcessFiles from './process-files.vue';
import TaskList from './task-list.vue';

/** 进程详情：当前状态、指标和执行记录，文件管理（监控曲线在「监控详情」页） */
const props = defineProps<{ process: null | ProcessRecord; projectId: number }>();
const emit = defineEmits<{ close: [] }>();

const { hasAccessByCodes } = useAccess();
const taskList = ref<InstanceType<typeof TaskList>>();
const tab = ref<'files' | 'overview'>('overview');

const state = computed(() => processStateTag(props.process?.state));

/** 换一个进程时回到概况 */
watch(
  () => props.process?.id,
  () => {
    tab.value = 'overview';
  },
);

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
    <Tabs v-if="process" v-model:active-key="tab">
      <TabPane key="overview" tab="概况">
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
          <DescriptionsItem label="类型">{{ process.typeName || '—' }}</DescriptionsItem>
          <DescriptionsItem label="最近部署" :span="2">
            <template v-if="process.deployedAt">
              {{ dayjs(process.deployedAt).format('YYYY-MM-DD HH:mm:ss') }}
              <div v-if="process.deployRemark" class="text-muted-foreground break-all text-xs">
                {{ process.deployRemark }}
              </div>
            </template>
            <template v-else>—</template>
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
      </TabPane>
      <TabPane v-if="hasAccessByCodes(['server_process:file'])" key="files" tab="文件">
        <ProcessFiles v-if="tab === 'files'" :key="process.id" :process="process" :project-id="projectId" />
      </TabPane>
    </Tabs>
  </Drawer>
</template>

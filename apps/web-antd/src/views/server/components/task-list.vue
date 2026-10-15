<script lang="ts" setup>
import type { ServerTaskRecord } from '#/api/types';

import { onMounted, ref, watch } from 'vue';

import { Button, Empty, Pagination, Spin, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getServerTasksApi } from '#/api';

import { actionNames, taskStatusTags } from '../format';

/** 执行记录：processId 为 null 时显示本项目全部进程的记录 */
const props = defineProps<{ processId: null | number; projectId: number }>();

const PAGE_SIZE = 10;
const list = ref<ServerTaskRecord[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const expanded = ref<Set<number>>(new Set());

async function load() {
  loading.value = true;
  try {
    const result = await getServerTasksApi(props.projectId, props.processId, page.value, PAGE_SIZE);
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function toggle(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

watch(() => props.processId, () => {
  page.value = 1;
  void load();
});
onMounted(load);
defineExpose({ reload: load });
</script>

<template>
  <Spin :spinning="loading">
    <div v-for="task in list" :key="task.id" class="server-task">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Tag :color="taskStatusTags[task.status].color">{{ taskStatusTags[task.status].text }}</Tag>
          <span class="font-medium">{{ actionNames[task.action] }} {{ task.processName }}</span>
          <span class="text-muted-foreground text-xs">
            {{ task.operator }} · {{ dayjs(task.createdAt).format('MM-DD HH:mm:ss') }}
            <template v-if="task.finishedAt">
              · 用时 {{ Math.max(1, Math.round((task.finishedAt - task.createdAt) / 1000)) }} 秒
            </template>
          </span>
        </div>
        <Button v-if="task.output" size="small" type="link" @click="toggle(task.id)">
          {{ expanded.has(task.id) ? '收起输出' : '查看输出' }}
        </Button>
      </div>
      <div v-if="task.remark" class="text-muted-foreground mt-1 break-all text-xs">{{ task.remark }}</div>
      <pre v-if="expanded.has(task.id)" class="server-output">{{ task.output }}</pre>
    </div>
    <Empty v-if="!loading && list.length === 0" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="还没有执行记录" />
    <div v-if="total > PAGE_SIZE" class="mt-3 flex justify-end">
      <Pagination v-model:current="page" :page-size="PAGE_SIZE" :total="total" size="small" @change="load" />
    </div>
  </Spin>
</template>

<style scoped>
.server-task {
  padding: 10px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.server-output {
  max-height: 360px;
  padding: 10px 12px;
  margin: 8px 0 0;
  overflow: auto;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  background: hsl(var(--accent));
  border-radius: 6px;
}
</style>

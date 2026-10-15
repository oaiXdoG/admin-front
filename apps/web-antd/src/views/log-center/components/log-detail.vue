<script lang="ts" setup>
import type { LogRow } from '#/api/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Descriptions,
  DescriptionsItem,
  Drawer,
  message,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

/** 一条日志的完整内容，包括模板里没有配置的字段 */
const props = defineProps<{ row: LogRow | null }>();
const emit = defineEmits<{ close: [] }>();

const router = useRouter();

const json = computed(() => JSON.stringify(props.row?.data ?? {}, null, 2));
/** 能看日志查询页面才显示用户轨迹入口 */
const canTrace = computed(
  () => !!props.row?.actor && router.hasRoute('log_query'),
);

async function copy() {
  await navigator.clipboard.writeText(json.value);
  message.success('已复制');
}

/** 打开日志查询，按这个用户查最近 7 天的全部事件 */
function trace() {
  if (!props.row) return;
  emit('close');
  router.push({ name: 'log_query', query: { actor: props.row.actor } });
}
</script>

<template>
  <Drawer :open="!!row" :width="560" title="日志详情" @close="emit('close')">
    <template v-if="row">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem label="时间">
          {{ dayjs(row.time).format('YYYY-MM-DD HH:mm:ss.SSS') }}
        </DescriptionsItem>
        <DescriptionsItem label="事件">
          <Tag color="blue">{{ row.event }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="用户">
          <span>{{ row.actor || '—' }}</span>
          <span v-if="canTrace" class="ml-2">
            <Button size="small" type="link" @click="trace">
              查看该用户轨迹
            </Button>
          </span>
        </DescriptionsItem>
        <DescriptionsItem label="服务器">{{ row.server }}</DescriptionsItem>
        <DescriptionsItem label="保留方式">
          {{ row.retention === 'permanent' ? '永久保存' : '普通' }}
        </DescriptionsItem>
        <DescriptionsItem label="日志 ID">
          <span class="break-all">{{ row.logId }}</span>
        </DescriptionsItem>
      </Descriptions>
      <div class="mb-2 mt-6 flex items-center justify-between">
        <span class="font-medium">业务字段 data</span>
        <Button size="small" @click="copy">复制</Button>
      </div>
      <pre class="dc-json">{{ json }}</pre>
    </template>
  </Drawer>
</template>

<style scoped>
.dc-json {
  max-height: 60vh;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: hsl(var(--muted));
  border-radius: 6px;
}
</style>

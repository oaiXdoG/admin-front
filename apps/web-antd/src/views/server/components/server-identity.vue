<script lang="ts" setup>
import type { ProcessIdentity, ServerSample } from '../store';

import { computed } from 'vue';

import { Space, Tag } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    project: string;
    running?: boolean;
    sample?: ServerSample;
    target?: ProcessIdentity;
  }>(),
  { running: true, sample: undefined, target: undefined },
);

const identity = computed(() => props.target ?? props.sample);
</script>

<template>
  <div class="server-identity">
    <div>
      <h2>{{ identity?.name ?? (project || '未选择进程') }}</h2>
      <span>
        {{
          identity
            ? `${project}${identity.host ? ` · ${identity.host}` : ''}`
            : '暂无进程监控数据'
        }}
      </span>
    </div>
    <Space>
      <Tag :color="sample ? (running ? 'success' : 'warning') : 'default'">
        {{ sample ? (running ? '运行中' : '已关闭') : '未连接' }}
      </Tag>
      <Tag v-if="sample">演示</Tag>
    </Space>
  </div>
</template>

<style scoped>
.server-identity {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.server-identity h2 {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 600;
}

.server-identity > div > span {
  font-size: 13px;
  color: #7b8493;
}

@media (max-width: 767px) {
  .server-identity {
    align-items: flex-start;
  }
}
</style>

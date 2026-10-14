<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Card, TabPane, Tabs } from 'ant-design-vue';

import Backup from './backup.vue';
import Brand from './brand.vue';
import LogStorage from './log-storage.vue';

/** 三块设置互不相关、各自保存；当前标签记在地址栏 ?tab=，刷新不丢，也可以直接打开某一页 */
const TABS = ['brand', 'storage', 'backup'] as const;
type TabKey = (typeof TABS)[number];

const route = useRoute();
const router = useRouter();

const activeKey = computed<TabKey>({
  get: () =>
    TABS.includes(route.query.tab as TabKey)
      ? (route.query.tab as TabKey)
      : 'brand',
  set: (tab) => {
    router.replace({ query: { ...route.query, tab } });
  },
});
</script>

<template>
  <Page>
    <Card :bordered="false">
      <!-- 只渲染当前标签：切走后停止备份进度的轮询，切回时重新读取 -->
      <Tabs v-model:active-key="activeKey" destroy-inactive-tab-pane>
        <TabPane key="brand" tab="品牌信息">
          <Brand />
        </TabPane>
        <TabPane key="storage" tab="日志存储">
          <LogStorage />
        </TabPane>
        <TabPane key="backup" tab="数据备份">
          <Backup />
        </TabPane>
      </Tabs>
    </Card>
  </Page>
</template>

<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { Empty } from 'ant-design-vue';
</script>

<template>
  <Page>
    <div class="flex min-h-[60vh] items-center justify-center">
      <Empty description="还没有可进入的页面，请联系管理员分配菜单权限" />
    </div>
  </Page>
</template>

<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ProjectManageItem } from '#/api/types';

import { watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  closeProjectApi,
  getProjectManageListApi,
  reopenProjectApi,
} from '#/api';
import { STATUS_ENABLED } from '#/api/types';
import { useProjectStore } from '#/store';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const projectStore = useProjectStore();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page },
          formValues: { keyword?: string; status?: number },
        ) => {
          const keyword = formValues.keyword?.trim().toLowerCase() ?? '';
          const list = await getProjectManageListApi();
          const rows = list.filter(
            (item) =>
              (!keyword ||
                `${item.name} ${item.appKey}`
                  .toLowerCase()
                  .includes(keyword)) &&
              (!formValues.status || item.status === formValues.status),
          );
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: rows.slice(start, start + page.pageSize),
            total: rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'projectId' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ProjectManageItem>,
});

// 右上角新建项目后刷新列表
watch(
  () => projectStore.projects.length,
  () => onRefresh(),
);

function onRefresh() {
  gridApi.query();
}

function onEdit(row: ProjectManageItem) {
  formModalApi.setData(row).open();
}

function onClose(row: ProjectManageItem) {
  Modal.confirm({
    cancelText: '取消',
    content: `关闭「${row.name}」后，它不再出现在项目切换列表中，成员和角色保留，可以随时重新启用。`,
    okButtonProps: { danger: true },
    okText: '关闭项目',
    title: '关闭项目',
    async onOk() {
      await closeProjectApi(row.projectId);
      message.success('项目已关闭');
      // 关闭的可能是当前项目，以服务器为准重新同步项目和菜单
      await projectStore.recover();
      onRefresh();
    },
  });
}

async function onReopen(row: ProjectManageItem) {
  await reopenProjectApi(row.projectId);
  message.success('项目已重新启用');
  await projectStore.load();
  onRefresh();
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <Grid table-title="项目列表">
      <template #toolbar-tools>
        <Button
          :disabled="projectStore.mustCreate"
          type="primary"
          @click="projectStore.createOpen = true"
        >
          <Plus class="size-5" />
          新增
        </Button>
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === STATUS_ENABLED ? 'success' : 'default'">
          {{ row.status === STATUS_ENABLED ? '正常' : '已关闭' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Button size="small" type="link" @click="onEdit(row)">编辑</Button>
        <Button
          v-if="row.status === STATUS_ENABLED"
          danger
          size="small"
          type="link"
          @click="onClose(row)"
        >
          关闭
        </Button>
        <Button v-else size="small" type="link" @click="onReopen(row)">
          重新启用
        </Button>
      </template>
    </Grid>
  </Page>
</template>

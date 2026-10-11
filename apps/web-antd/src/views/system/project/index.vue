<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ProjectItem } from '#/api/types';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { closeProjectApi } from '#/api';
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
        query: async ({ page }, formValues: { name?: string }) => {
          await projectStore.load();
          const keyword = formValues.name?.trim() ?? '';
          const rows = projectStore.projects.filter(
            (item) => !keyword || item.name.includes(keyword),
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
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<ProjectItem>,
});

function onRefresh() {
  gridApi.query();
}

function onEdit(row: ProjectItem) {
  formModalApi.setData(row).open();
}

function onClose(row: ProjectItem) {
  Modal.confirm({
    cancelText: '取消',
    content: `关闭「${row.name}」后，将不再出现在项目列表中，项目数据仍然保留。`,
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
      <template #action="{ row }">
        <Button size="small" type="link" @click="onEdit(row)">编辑</Button>
        <Button danger size="small" type="link" @click="onClose(row)">
          关闭
        </Button>
      </template>
    </Grid>
  </Page>
</template>

<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ProjectMember } from '#/api/types';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button, message, Modal, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProjectMembersApi, removeProjectMemberApi } from '#/api';
import { STATUS_ENABLED } from '#/api/types';
import { useProjectStore } from '#/store';

import Form from './modules/form.vue';

const projectStore = useProjectStore();
const userStore = useUserStore();

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form });

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '登录名或显示名' },
        fieldName: 'keyword',
        label: '成员',
      },
    ],
    submitOnChange: true,
  },
  gridOptions: {
    columns: [
      { align: 'left', field: 'account', minWidth: 140, title: '登录名' },
      { align: 'left', field: 'username', minWidth: 120, title: '显示名' },
      {
        field: 'roleName',
        minWidth: 120,
        slots: { default: 'role' },
        title: '项目角色',
      },
      {
        field: 'status',
        slots: { default: 'status' },
        title: '账号状态',
        width: 100,
      },
      {
        field: 'createdAt',
        formatter: ({ cellValue }) =>
          cellValue ? dayjs(cellValue).format('YYYY-MM-DD HH:mm') : '—',
        title: '加入时间',
        width: 160,
      },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 160,
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues: { keyword?: string }) => {
          const keyword = formValues.keyword?.trim().toLowerCase() ?? '';
          const list = await getProjectMembersApi(
            projectStore.currentProjectId ?? 0,
          );
          const rows = list.filter((item) =>
            `${item.account} ${item.username}`.toLowerCase().includes(keyword),
          );
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: rows.slice(start, start + page.pageSize),
            total: rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'accountId' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ProjectMember>,
});

function onRefresh() {
  gridApi.query();
}

function isSelf(row: ProjectMember) {
  return String(row.accountId) === userStore.userInfo?.userId;
}

function onRemove(row: ProjectMember) {
  Modal.confirm({
    cancelText: '取消',
    content: `把「${row.account}」移出「${projectStore.currentProject?.name ?? ''}」？账号本身不会被删除。`,
    okButtonProps: { danger: true },
    okText: '移除',
    title: '移除成员',
    async onOk() {
      await removeProjectMemberApi(
        projectStore.currentProjectId ?? 0,
        row.accountId,
      );
      message.success('成员已移除');
      onRefresh();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <Grid
      :table-title="`成员列表 · ${projectStore.currentProject?.name ?? ''}`"
    >
      <template #toolbar-tools>
        <Button type="primary" @click="formModalApi.setData(null).open()">
          <Plus class="size-5" />
          添加成员
        </Button>
      </template>
      <template #role="{ row }">
        <Tag color="blue">{{ row.roleName || '—' }}</Tag>
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === STATUS_ENABLED ? 'success' : 'default'">
          {{ row.status === STATUS_ENABLED ? '启用' : '已禁用' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Button
          size="small"
          type="link"
          @click="formModalApi.setData(row).open()"
        >
          修改角色
        </Button>
        <Button
          :disabled="isSelf(row)"
          danger
          size="small"
          type="link"
          @click="onRemove(row)"
        >
          移除
        </Button>
      </template>
    </Grid>
  </Page>
</template>

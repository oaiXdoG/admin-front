<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RoleRecord } from '#/api/types';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getRoleListApi, removeRoleApi } from '#/api';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Permission from './modules/permission.vue';

const removing = ref(false);
const selectedCount = ref(0);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
});

const [PermissionModal, permissionModalApi] = useVbenModal({
  connectedComponent: Permission,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridEvents: {
    checkboxAll: updateSelected,
    checkboxChange: updateSelected,
  },
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }: { row: RoleRecord }) => !row.builtIn,
    },
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
          const list = await getRoleListApi();
          const rows = list.filter(
            (role) =>
              (!keyword || role.name.toLowerCase().includes(keyword)) &&
              (!formValues.status || role.status === formValues.status),
          );
          const start = (page.currentPage - 1) * page.pageSize;
          selectedCount.value = 0;
          return {
            items: rows.slice(start, start + page.pageSize),
            total: rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<RoleRecord>,
});

function updateSelected() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function onRefresh() {
  gridApi.query();
}

function onRemove(row: RoleRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除「${row.name}」？`,
    okText: '删除',
    title: '删除角色',
    async onOk() {
      await removeRoleApi(row.id);
      message.success('角色已删除');
      onRefresh();
    },
  });
}

async function onRemoveSelected() {
  const removable = (gridApi.grid.getCheckboxRecords() as RoleRecord[]).filter(
    (role) => !role.builtIn,
  );
  if (removable.length === 0) return;
  removing.value = true;
  try {
    for (const role of removable) await removeRoleApi(role.id);
    message.success(`已删除 ${removable.length} 个角色`);
  } finally {
    removing.value = false;
    onRefresh();
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <PermissionModal />
    <Grid table-title="角色列表">
      <template #toolbar-tools>
        <Button
          class="mr-2"
          type="primary"
          @click="formModalApi.setData(null).open()"
        >
          <Plus class="size-5" />
          新增
        </Button>
        <Button
          :disabled="selectedCount === 0"
          :loading="removing"
          danger
          @click="onRemoveSelected"
        >
          批量删除
        </Button>
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === 1 ? 'success' : 'warning'">
          {{ row.status === 1 ? '启用' : '停用' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Button
          :disabled="row.builtIn"
          size="small"
          type="link"
          @click="formModalApi.setData(row).open()"
        >
          编辑
        </Button>
        <Button
          :disabled="row.builtIn"
          size="small"
          type="link"
          @click="permissionModalApi.setData(row).open()"
        >
          分配菜单
        </Button>
        <Button
          :disabled="row.builtIn"
          danger
          size="small"
          type="link"
          @click="onRemove(row)"
        >
          删除
        </Button>
      </template>
    </Grid>
  </Page>
</template>

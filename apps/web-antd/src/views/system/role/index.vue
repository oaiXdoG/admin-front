<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RoleRecord } from '#/api/types';

import { h, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getRoleListApi, removeRoleApi, updateRoleApi } from '#/api';

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

const statusChanging = ref<null | number>(null);

/** 在列表里直接启用或停用角色，停用后拥有该角色的账号会失去对应菜单 */
function onStatusChange(row: RoleRecord, checked: boolean) {
  const status = checked ? 1 : 2;
  Modal.confirm({
    cancelText: '取消',
    content: h('div', [
      `确定${checked ? '启用' : '停用'}角色「${row.name}」吗？`,
      checked
        ? ''
        : h(
            'div',
            { class: 'mt-1 text-xs' },
            '停用后，拥有该角色的账号将失去这个角色的全部菜单。',
          ),
    ]),
    okText: checked ? '启用' : '停用',
    title: `${checked ? '启用' : '停用'}角色`,
    async onOk() {
      statusChanging.value = row.id;
      try {
        const { code, description, name } = row;
        await updateRoleApi(row.id, { code, description, name, status });
        message.success(`角色已${checked ? '启用' : '停用'}`);
        onRefresh();
      } finally {
        statusChanging.value = null;
      }
    },
  });
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
        <Tag v-if="row.builtIn" color="success">启用</Tag>
        <Switch
          v-else
          :checked="row.status === 1"
          :loading="statusChanging === row.id"
          checked-children="启用"
          un-checked-children="停用"
          @change="(checked) => onStatusChange(row, !!checked)"
        />
      </template>
      <template #globalRole="{ row }">
        <Tag :color="row.globalRole ? 'purple' : 'default'">
          {{ row.globalRole ? '平台' : '项目' }}
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

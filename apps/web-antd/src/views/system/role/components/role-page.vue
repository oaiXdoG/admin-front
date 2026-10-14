<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RoleKind } from '#/api';
import type { RoleRecord } from '#/api/types';

import { h, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useRoleApi } from '#/api';
import { useProjectStore } from '#/store';

import { useColumns, useGridFormSchema } from '../data';
import Form from '../modules/form.vue';
import ImportModalContent from '../modules/import.vue';
import Permission from '../modules/permission.vue';

/**
 * 平台角色、角色模板、项目角色共用的页面；项目角色固定操作当前项目。
 */
const props = defineProps<{ kind: RoleKind; title: string }>();

const projectStore = useProjectStore();
const { hasAccessByCodes } = useAccess();
/** 按钮权限标识的前缀，例如 manage_role:create */
const CODE_PREFIX: Record<RoleKind, string> = {
  platform: 'manage_role',
  project: 'project_role',
  template: 'manage_role_template',
};
function can(action: string) {
  return hasAccessByCodes([`${CODE_PREFIX[props.kind]}:${action}`]);
}
const roleApi = useRoleApi(props.kind, () => projectStore.currentProjectId);

const removing = ref(false);
const selectedCount = ref(0);
const statusChanging = ref<null | number>(null);

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form });
const [PermissionModal, permissionModalApi] = useVbenModal({
  connectedComponent: Permission,
});
const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: ImportModalContent,
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
    columns: useColumns(props.kind),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page },
          formValues: { keyword?: string; status?: number },
        ) => {
          const keyword = formValues.keyword?.trim().toLowerCase() ?? '';
          const list = await roleApi.list();
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
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<RoleRecord>,
});

function updateSelected() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function onRefresh() {
  gridApi.query();
}

function openForm(role: null | RoleRecord) {
  formModalApi.setData({ kind: props.kind, role }).open();
}

function openPermission(role: RoleRecord) {
  permissionModalApi.setData({ kind: props.kind, role }).open();
}

/** 在列表里直接启用或停用角色，停用后拥有该角色的账号会失去对应菜单 */
function onStatusChange(row: RoleRecord, checked: boolean) {
  const status = checked ? 1 : 2;
  Modal.confirm({
    cancelText: '取消',
    content: h('div', [
      `确定${checked ? '启用' : '停用'}「${row.name}」吗？`,
      checked || props.kind === 'template'
        ? ''
        : h(
            'div',
            { class: 'mt-1 text-xs' },
            '停用后，拥有该角色的账号将失去这个角色的全部菜单。',
          ),
    ]),
    okText: checked ? '启用' : '停用',
    title: `${checked ? '启用' : '停用'}${props.title}`,
    async onOk() {
      statusChanging.value = row.id;
      try {
        const { code, description, name } = row;
        await roleApi.update(row.id, { code, description, name, status });
        message.success(`已${checked ? '启用' : '停用'}`);
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
    title: `删除${props.title}`,
    async onOk() {
      await roleApi.remove(row.id);
      message.success('已删除');
      onRefresh();
    },
  });
}

/** 逐个删除，汇总成功和失败的数量；失败的通常是仍被使用的角色 */
async function onRemoveSelected() {
  const removable = (gridApi.grid.getCheckboxRecords() as RoleRecord[]).filter(
    (role) => !role.builtIn,
  );
  if (removable.length === 0) return;
  removing.value = true;
  let failed = 0;
  for (const role of removable) {
    await roleApi.remove(role.id).catch(() => failed++);
  }
  removing.value = false;
  const done = removable.length - failed;
  if (failed === 0) message.success(`已删除 ${done} 个`);
  else message.warning(`已删除 ${done} 个，${failed} 个删除失败`);
  onRefresh();
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <PermissionModal />
    <ImportModal @success="onRefresh" />
    <Grid :table-title="`${title}列表`">
      <template #toolbar-tools>
        <Button
          v-if="can('create')"
          class="mr-2"
          type="primary"
          @click="openForm(null)"
        >
          <Plus class="size-5" />
          新增
        </Button>
        <Button
          v-if="kind === 'project' && can('import')"
          class="mr-2"
          @click="importModalApi.open()"
        >
          从模板导入
        </Button>
        <Button
          v-if="can('remove')"
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
          :disabled="!can('update')"
          :loading="statusChanging === row.id"
          checked-children="启用"
          un-checked-children="停用"
          @change="(checked) => onStatusChange(row, !!checked)"
        />
      </template>
      <template #action="{ row }">
        <Button
          v-if="can('update')"
          :disabled="row.builtIn"
          size="small"
          type="link"
          @click="openForm(row)"
        >
          编辑
        </Button>
        <Button
          v-if="can('menu')"
          :disabled="row.builtIn"
          size="small"
          type="link"
          @click="openPermission(row)"
        >
          分配菜单
        </Button>
        <Button
          v-if="can('remove')"
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

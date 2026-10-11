<script lang="ts" setup>
import type { MenuEditor } from './modules/form.vue';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MenuRecord } from '#/api/types';

import { Page, useVbenModal } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getMenuListApi, removeMenuApi } from '#/api';

import { MENU_TYPE_DIRECTORY, useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

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
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_params, formValues: { keyword?: string }) => {
          const keyword = formValues.keyword?.trim().toLowerCase() ?? '';
          const list = await getMenuListApi();
          const rows = list
            .filter(
              (item) =>
                !keyword ||
                `${item.name} ${item.routeName} ${item.routePath}`
                  .toLowerCase()
                  .includes(keyword),
            )
            .toSorted((a, b) => a.sort - b.sort || a.id - b.id);
          return { items: rows, total: rows.length };
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
    treeConfig: {
      expandAll: true,
      parentField: 'parentId',
      rowField: 'id',
      transform: true,
    },
  } as VxeTableGridOptions<MenuRecord>,
});

function onRefresh() {
  gridApi.query();
}

function openEditor(data: MenuEditor) {
  formModalApi.setData(data).open();
}

function onRemove(row: MenuRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除「${row.name}」？`,
    okText: '删除',
    title: '删除菜单',
    async onOk() {
      await removeMenuApi(row.id);
      message.success('菜单已删除');
      onRefresh();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <Grid table-title="菜单列表">
      <template #toolbar-tools>
        <Button
          type="primary"
          @click="openEditor({ mode: 'create', parent: null })"
        >
          <Plus class="size-5" />
          新增
        </Button>
      </template>
      <template #name="{ row }">
        <span
          :class="{ 'font-medium': row.menuType === MENU_TYPE_DIRECTORY }"
          class="inline-flex items-center gap-1.5"
        >
          <IconifyIcon
            :icon="
              (row.icon?.includes(':') && row.icon) ||
              (row.menuType === MENU_TYPE_DIRECTORY
                ? 'lucide:folder'
                : 'lucide:file-text')
            "
          />
          {{ row.name }}
        </span>
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === 1 ? 'success' : 'warning'">
          {{ row.status === 1 ? '启用' : '停用' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Button
          v-if="row.menuType === MENU_TYPE_DIRECTORY"
          size="small"
          type="link"
          @click="openEditor({ mode: 'create', parent: row })"
        >
          新增子菜单
        </Button>
        <template v-if="!row.builtIn">
          <Button
            size="small"
            type="link"
            @click="openEditor({ mode: 'edit', record: row })"
          >
            编辑
          </Button>
          <Button danger size="small" type="link" @click="onRemove(row)">
            删除
          </Button>
        </template>
      </template>
    </Grid>
  </Page>
</template>

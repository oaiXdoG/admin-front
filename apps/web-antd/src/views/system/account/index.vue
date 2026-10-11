<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AccountRecord } from '#/api/types';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAccountListApi } from '#/api';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Projects from './modules/projects.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
});

const [ProjectsModal, projectsModalApi] = useVbenModal({
  connectedComponent: Projects,
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
        query: async ({ page }, formValues: { keyword?: string }) => {
          const keyword = formValues.keyword?.trim().toLowerCase() ?? '';
          const list = await getAccountListApi();
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
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<AccountRecord>,
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <ProjectsModal />
    <Grid table-title="用户列表">
      <template #toolbar-tools>
        <Button type="primary" @click="formModalApi.setData(null).open()">
          <Plus class="size-5" />
          新增
        </Button>
      </template>
      <template #action="{ row }">
        <Button
          size="small"
          type="link"
          @click="formModalApi.setData(row).open()"
        >
          编辑
        </Button>
        <Button
          size="small"
          type="link"
          @click="projectsModalApi.setData(row).open()"
        >
          关联项目
        </Button>
      </template>
    </Grid>
  </Page>
</template>

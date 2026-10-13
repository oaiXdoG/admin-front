<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AccountRecord } from '#/api/types';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAccountListApi, updateAccountStatusApi } from '#/api';
import { STATUS_DISABLED, STATUS_ENABLED } from '#/api/types';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Projects from './modules/projects.vue';
import Roles from './modules/roles.vue';

const userStore = useUserStore();
const statusChanging = ref<null | number>(null);

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form });
const [ProjectsModal, projectsModalApi] = useVbenModal({
  connectedComponent: Projects,
});
const [RolesModal, rolesModalApi] = useVbenModal({ connectedComponent: Roles });

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
          const list = await getAccountListApi();
          const rows = list.filter(
            (item) =>
              `${item.account} ${item.username}`
                .toLowerCase()
                .includes(keyword) &&
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
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<AccountRecord>,
});

function onRefresh() {
  gridApi.query();
}

function isSelf(row: AccountRecord) {
  return String(row.id) === userStore.userInfo?.userId;
}

/** 禁用后该账号不能登录，已登录的会话立即失效 */
function onStatusChange(row: AccountRecord, checked: boolean) {
  Modal.confirm({
    cancelText: '取消',
    content: checked
      ? `确定启用「${row.account}」吗？`
      : `禁用后「${row.account}」将不能登录，已登录的会话会立即失效。`,
    okButtonProps: { danger: !checked },
    okText: checked ? '启用' : '禁用',
    title: checked ? '启用账号' : '禁用账号',
    async onOk() {
      statusChanging.value = row.id;
      try {
        await updateAccountStatusApi(
          row.id,
          checked ? STATUS_ENABLED : STATUS_DISABLED,
        );
        message.success(checked ? '账号已启用' : '账号已禁用');
        onRefresh();
      } finally {
        statusChanging.value = null;
      }
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <ProjectsModal @success="onRefresh" />
    <RolesModal @success="onRefresh" />
    <Grid table-title="用户列表">
      <template #toolbar-tools>
        <Button type="primary" @click="formModalApi.setData(null).open()">
          <Plus class="size-5" />
          新增
        </Button>
      </template>
      <template #platformRoles="{ row }">
        <Tag v-for="role in row.platformRoles" :key="role.id" color="purple">
          {{ role.name }}
        </Tag>
        <span
          v-if="row.platformRoles.length === 0"
          class="text-muted-foreground"
        >
          —
        </span>
      </template>
      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_ENABLED"
          :disabled="isSelf(row)"
          :loading="statusChanging === row.id"
          checked-children="启用"
          un-checked-children="禁用"
          @change="(checked) => onStatusChange(row, !!checked)"
        />
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
          @click="rolesModalApi.setData(row).open()"
        >
          平台角色
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

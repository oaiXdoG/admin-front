<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DataSourceRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createDataSourceApi,
  getDataSourcesApi,
  removeDataSourceApi,
  testDataSourceApi,
  updateDataSourceApi,
} from '#/api';
import { useProjectStore } from '#/store';

interface FormValues {
  name: string;
  remark?: string;
  secret?: string;
  timeoutSeconds: number;
  url: string;
}

const projectStore = useProjectStore();
const { hasAccessByCodes } = useAccess();

/** null 为新建 */
const editing = ref<DataSourceRecord | null>(null);
const open = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref<null | { message: string; ok: boolean }>(null);

const projectId = computed(() => projectStore.currentProjectId as number);

const [SourceForm, formApi] = useVbenForm({
    schema: [
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '例如：游戏服 1 区' },
      fieldName: 'name',
      label: '名称',
      rules: z.string().trim().min(1, { message: '请输入名称' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 http://10.0.0.5:8080' },
      fieldName: 'url',
      help: '业务服务器提供查询接口的地址，admin 会调用 地址/admin/queries 和 地址/admin/query',
      label: '接口地址',
      rules: z
        .string()
        .trim()
        .regex(/^https?:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/, {
          message: '请输入 http:// 或 https:// 开头的地址',
        }),
    },
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'new-password' },
      dependencies: {
        resolve: () => ({
          componentProps: {
            autocomplete: 'new-password',
            placeholder: editing.value?.secretSet
              ? '已设置，留空不修改'
              : '与业务服务器约定的签名密钥',
          },
        }),
        triggerFields: ['name'],
      },
      fieldName: 'secret',
      help: '用于请求签名（HMAC-SHA256），加密保存，不会显示',
      label: '签名密钥',
    },
    {
      component: 'InputNumber',
      componentProps: { addonAfter: '秒', max: 60, min: 1, precision: 0 },
      defaultValue: 10,
      fieldName: 'timeoutSeconds',
      label: '超时时间',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空' },
      fieldName: 'remark',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'name', minWidth: 160, title: '名称' },
      { align: 'left', field: 'url', minWidth: 240, title: '接口地址' },
      {
        field: 'timeoutMs',
        formatter: ({ cellValue }) => `${cellValue / 1000} 秒`,
        title: '超时',
        width: 90,
      },
      { field: 'templateCount', title: '查询模板', width: 100 },
      { align: 'left', field: 'remark', minWidth: 160, title: '备注' },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 140,
      },
    ],
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const { list } = await getDataSourcesApi(projectId.value);
          return { items: list, total: list.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DataSourceRecord>,
});

async function openEditor(record: DataSourceRecord | null) {
  editing.value = record;
  testResult.value = null;
  open.value = true;
  await formApi.reset();
  if (record) {
    await formApi.setValues({
      name: record.name,
      remark: record.remark,
      secret: '',
      timeoutSeconds: record.timeoutMs / 1000,
      url: record.url,
    });
  }
}

/** 新建时密钥必填，编辑时留空沿用 */
async function values() {
  const { valid } = await formApi.validate();
  if (!valid) return null;
  const form = await formApi.getValues<FormValues>();
  if (!editing.value && !form.secret) {
    message.warning('请输入签名密钥');
    return null;
  }
  return form;
}

async function test() {
  const form = await values();
  if (!form) return;
  testing.value = true;
  testResult.value = null;
  try {
    const result = await testDataSourceApi(projectId.value, {
      secret: form.secret,
      sourceId: editing.value?.id,
      timeoutMs: form.timeoutSeconds * 1000,
      url: form.url,
    });
    testResult.value = {
      message: `连接成功，业务服务器提供 ${result.queryCount} 个查询`,
      ok: true,
    };
  } catch (error) {
    // 业务错误由请求拦截器抛出原始响应，原因在 data.message 里
    const reason = (error as { data?: { message?: string } })?.data?.message;
    testResult.value = { message: reason ?? '连接失败', ok: false };
  } finally {
    testing.value = false;
  }
}

async function save() {
  const form = await values();
  if (!form) return;
  saving.value = true;
  try {
    const data = {
      name: form.name,
      remark: form.remark,
      secret: form.secret,
      timeoutMs: form.timeoutSeconds * 1000,
      url: form.url,
    };
    await (editing.value
      ? updateDataSourceApi(projectId.value, editing.value.id, data)
      : createDataSourceApi(projectId.value, data));
    message.success('数据源已保存');
    open.value = false;
    await gridApi.query();
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function remove(record: DataSourceRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除数据源「${record.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除数据源',
    async onOk() {
      await removeDataSourceApi(projectId.value, record.id);
      message.success('数据源已删除');
      await gridApi.query();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Grid
      v-if="projectStore.currentProjectId !== null"
      :key="projectStore.currentProjectId"
      table-title="数据源"
    >
      <template #toolbar-tools>
        <Button
          v-if="hasAccessByCodes(['data_source:create'])"
          type="primary"
          @click="openEditor(null)"
        >
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:plus" />
          </template>
          新增数据源
        </Button>
      </template>
      <template #action="{ row }">
        <Button
          v-if="hasAccessByCodes(['data_source:update'])"
          size="small"
          type="link"
          @click="openEditor(row)"
        >
          编辑
        </Button>
        <Button
          v-if="hasAccessByCodes(['data_source:remove'])"
          :disabled="row.templateCount > 0"
          danger
          size="small"
          type="link"
          @click="remove(row)"
        >
          删除
        </Button>
      </template>
    </Grid>
    <Modal
      v-model:open="open"
      :title="editing ? '编辑数据源' : '新增数据源'"
      :width="620"
      destroy-on-close
    >
      <div class="mb-4">
        <Alert
          message="数据源是业务服务器按接口规范提供的查询接口（规范见 admin-background docs/data-center.md）。"
          show-icon
          type="info"
        />
      </div>
      <SourceForm />
      <div v-if="testResult" class="mt-2">
        <Tag :color="testResult.ok ? 'success' : 'error'">
          {{ testResult.ok ? '成功' : '失败' }}
        </Tag>
        <span class="break-all text-sm">{{ testResult.message }}</span>
      </div>
      <template #footer>
        <Space>
          <Button :loading="testing" @click="test">测试连接</Button>
          <Button @click="open = false">取消</Button>
          <Button :loading="saving" type="primary" @click="save">保存</Button>
        </Space>
      </template>
    </Modal>
  </Page>
</template>

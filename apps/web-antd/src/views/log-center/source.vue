<script lang="ts" setup>
import type { LogSourceRecord, LogSourceWrite } from '#/api/types';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { Alert, Button, Card, message, Space, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm, z } from '#/adapter/form';
import { getLogSourceApi, saveLogSourceApi, testLogSourceApi } from '#/api';
import { useProjectStore } from '#/store';

const projectStore = useProjectStore();
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);
const canEdit = computed(() => hasAccessByCodes(['log_source:update']));

/** 未配置时为 null */
const saved = ref<LogSourceRecord | null>(null);
const saving = ref(false);
const testing = ref(false);
const testResult = ref<null | { message: string; ok: boolean }>(null);

const [SourceForm, formApi] = useVbenForm({
  commonConfig: { disabled: !canEdit.value },
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '例如 http://111.230.143.165:38123' },
      fieldName: 'url',
      help: 'ClickHouse 的 HTTP 地址；集群填对外的统一入口',
      label: '地址',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入地址' })
        .max(256, { message: '地址最长 256 位' })
        .regex(/^https?:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/, {
          message: '请输入 http:// 或 https:// 开头的地址',
        }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 logs_prod' },
      fieldName: 'database',
      help: '与业务服务器 Vector 写入的库一致',
      label: '库名',
      rules: z
        .string()
        .trim()
        .regex(/^[A-Z_]\w{0,63}$/i, {
          message: '字母、数字、下划线，以字母或下划线开头',
        }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 reader_prod' },
      fieldName: 'readUser',
      help: '只需要 SELECT 权限；查询时会强制只查本项目的日志',
      label: '只读账号',
      rules: z
        .string()
        .trim()
        .regex(/^[\w.-]{1,64}$/, { message: '字母、数字和 _.-，最长 64 位' }),
    },
    {
      component: 'InputPassword',
      dependencies: {
        resolve: () => ({
          componentProps: {
            autocomplete: 'new-password',
            placeholder: saved.value?.readPasswordSet
              ? '已设置，留空不修改'
              : '只读账号的密码',
          },
        }),
        triggerFields: ['readUser'],
      },
      fieldName: 'readPassword',
      help: '加密保存，不会显示',
      label: '只读密码',
    },
  ],
  showDefaultActions: false,
});

/** 还没保存过时密码必填，之后留空沿用 */
async function formValues() {
  const { valid } = await formApi.validate();
  if (!valid) return null;
  const values = await formApi.getValues<LogSourceWrite>();
  if (!values.readPassword && !saved.value?.readPasswordSet) {
    message.warning('请输入只读密码');
    return null;
  }
  return values;
}

async function applySaved(source: LogSourceRecord | null) {
  saved.value = source;
  if (!source) return;
  await formApi.setValues({
    database: source.database,
    readPassword: '',
    readUser: source.readUser,
    url: source.url,
  });
}

async function test() {
  const values = await formValues();
  if (!values) return;
  testing.value = true;
  testResult.value = null;
  try {
    const result = await testLogSourceApi(projectId.value, values);
    testResult.value = {
      message: `连接成功，ClickHouse ${result.version}`,
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
  const values = await formValues();
  if (!values) return;
  saving.value = true;
  try {
    await applySaved(await saveLogSourceApi(projectId.value, values));
    message.success('日志源已保存');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await applySaved((await getLogSourceApi(projectId.value)).source);
});
</script>

<template>
  <Page>
    <Card title="日志源">
      <template #extra>
        <Tag v-if="saved" color="success">
          已配置，{{ dayjs(saved.updatedAt).format('YYYY-MM-DD HH:mm') }} 更新
        </Tag>
        <Tag v-else color="warning">未配置</Tag>
      </template>
      <div class="max-w-[640px]">
        <div class="mb-6">
          <Alert
            message="本项目查询日志用的 ClickHouse，每个项目一个。日志查询会强制带上本项目的 App Key，只能查到本项目的日志。"
            show-icon
            type="info"
          />
        </div>
        <SourceForm />
        <div v-if="canEdit" class="ml-[120px]">
          <Space>
            <Button :loading="testing" @click="test">测试连接</Button>
            <Button :loading="saving" type="primary" @click="save">
              保存
            </Button>
          </Space>
          <div v-if="testResult" class="mt-3">
            <Tag :color="testResult.ok ? 'success' : 'error'">
              {{ testResult.ok ? '成功' : '失败' }}
            </Tag>
            <span class="break-all text-sm">{{ testResult.message }}</span>
          </div>
        </div>
      </div>
    </Card>
  </Page>
</template>

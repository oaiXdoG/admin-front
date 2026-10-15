<script lang="ts" setup>
import type {
  LogStorage,
  LogStorageTestResult,
  LogStorageWrite,
} from '#/api/types';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  InputNumber,
  message,
  Modal,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import {
  getLogStorageApi,
  testLogStorageApi,
  updateLogRetentionApi,
  updateLogStorageApi,
} from '#/api';

const { hasAccessByCodes } = useAccess();
const canEdit = computed(() => hasAccessByCodes(['manage_setting:storage']));

const saved = ref<LogStorage>();
const testResult = ref<LogStorageTestResult>();
const saving = ref(false);
const testing = ref(false);
const retentionDays = ref<number>();
const retentionSaving = ref(false);

const [StorageForm, formApi] = useVbenForm({
  commonConfig: { disabled: !canEdit.value },
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '例如 http://111.230.143.165:38123' },
      fieldName: 'url',
      help: 'ClickHouse 的 HTTP 地址',
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
      componentProps: { placeholder: '例如 logs_test' },
      fieldName: 'database',
      help: '要管理保留期的日志库，例如 logs_test 或 logs_prod',
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
      componentProps: { placeholder: '例如 logs_admin' },
      fieldName: 'adminUser',
      help: '需要修改表结构（TTL）的权限',
      label: '管理账号',
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
            placeholder: saved.value?.adminPasswordSet
              ? '已设置，留空不修改'
              : '请输入密码',
          },
        }),
        triggerFields: ['adminUser'],
      },
      fieldName: 'adminPassword',
      label: '管理密码',
    },
  ],
  showDefaultActions: false,
});

/** 密码只在还没保存过时必填，留空表示沿用已保存的密码 */
async function formValues() {
  const { valid } = await formApi.validate();
  if (!valid) return null;
  const values = await formApi.getValues<LogStorageWrite>();
  if (!values.adminPassword && !saved.value?.adminPasswordSet) {
    message.warning('请输入管理账号密码');
    return null;
  }
  return values;
}

async function applySaved(storage: LogStorage) {
  saved.value = storage;
  await formApi.setValues({
    adminPassword: '',
    adminUser: storage.adminUser,
    database: storage.database,
    url: storage.url,
  });
}

async function test() {
  const values = await formValues();
  if (!values) return;
  testing.value = true;
  try {
    testResult.value = await testLogStorageApi(values);
    retentionDays.value = testResult.value.retentionDays;
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    testing.value = false;
  }
}

async function save() {
  const values = await formValues();
  if (!values) return;
  saving.value = true;
  try {
    await applySaved(await updateLogStorageApi(values));
    message.success('日志存储配置已保存');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function changeRetention() {
  const days = retentionDays.value;
  if (!days) return;
  Modal.confirm({
    cancelText: '取消',
    content: `普通日志超过 ${days} 天后会被自动删除（永久保存的日志不受影响）。缩短保留期会删除已有的旧日志，确定修改？`,
    okText: '修改',
    title: '修改保留期',
    async onOk() {
      retentionSaving.value = true;
      try {
        await updateLogRetentionApi(days);
        if (testResult.value) testResult.value.retentionDays = days;
        message.success('保留期已修改');
      } finally {
        retentionSaving.value = false;
      }
    },
  });
}

onMounted(async () => {
  await applySaved(await getLogStorageApi());
});
</script>

<template>
  <div>
    <div class="mb-6 max-w-[640px]">
      <Alert
        message="这里只用于管理普通日志的保留期（作用于整张日志表，影响共用这个库的所有项目）。各项目查询日志的连接在「日志中心 → 日志源」里配置。"
        show-icon
        type="info"
      />
    </div>
    <div class="max-w-[640px]">
      <StorageForm />
      <div v-if="canEdit" class="ml-[120px]">
        <Space>
          <Button :loading="testing" @click="test">测试连接</Button>
          <Button :loading="saving" type="primary" @click="save">保存</Button>
        </Space>
      </div>
      <div v-if="testResult" class="mt-6">
        <Descriptions :column="1" bordered size="small" title="测试结果">
          <DescriptionsItem label="管理账号">
            <Tag :color="testResult.adminOk ? 'success' : 'error'">
              {{ testResult.adminOk ? '连接成功' : '连接失败' }}
            </Tag>
            <span v-if="testResult.adminOk">ClickHouse {{ testResult.version }}</span>
            <span v-else class="break-all">{{ testResult.adminMessage }}</span>
          </DescriptionsItem>
          <DescriptionsItem label="普通日志保留期">
            <Space v-if="testResult.adminOk">
              <InputNumber
                v-model:value="retentionDays"
                :disabled="!saved?.adminPasswordSet"
                :max="3650"
                :min="1"
                :precision="0"
                addon-after="天"
              />
              <Button
                :disabled="
                  !saved?.adminPasswordSet ||
                  !retentionDays ||
                  retentionDays === testResult.retentionDays
                "
                :loading="retentionSaving"
                @click="changeRetention"
              >
                修改保留期
              </Button>
            </Space>
            <span v-else>—</span>
            <div class="text-muted-foreground mt-1 text-xs">
              修改保留期使用已保存的管理账号；永久保存的日志（支付类）不受影响
            </div>
          </DescriptionsItem>
        </Descriptions>
      </div>
    </div>
  </div>
</template>

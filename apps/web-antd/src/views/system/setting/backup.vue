<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BackupInfo } from '#/api/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';

import {
  Alert,
  Button,
  message,
  Modal,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  downloadBackupApi,
  getBackupApi,
  removeBackupApi,
  runBackupApi,
  updateBackupApi,
} from '#/api';

type BackupFile = BackupInfo['files'][number];

const { hasAccessByCodes } = useAccess();
const canEdit = computed(() => hasAccessByCodes(['manage_setting:backup']));

const info = ref<BackupInfo>();
const saving = ref(false);
const starting = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const [BackupForm, formApi] = useVbenForm({
  commonConfig: { disabled: !canEdit.value, labelWidth: 120 },
  schema: [
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'enabled',
      help: '开启后每天在设定时间自动备份',
      label: '定时备份',
    },
    {
      component: 'TimePicker',
      componentProps: { allowClear: false, format: 'HH:mm' },
      dependencies: {
        resolve: ({ values }) => ({ disabled: !values.enabled }),
        triggerFields: ['enabled'],
      },
      fieldName: 'time',
      help: '服务器时间，建议放在业务低峰期，例如凌晨',
      label: '备份时间',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { addonAfter: '份', max: 90, min: 1, precision: 0 },
      fieldName: 'keep',
      help: '每次备份成功后删除更早的备份，只保留最近这么多份（手动备份也计入）',
      label: '保留份数',
      rules: 'required',
    },
  ],
  showDefaultActions: false,
});

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const [FileGrid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'name', minWidth: 260, title: '文件名' },
      {
        field: 'size',
        formatter: ({ cellValue }) => formatSize(cellValue),
        title: '大小',
        width: 110,
      },
      {
        field: 'createdAt',
        formatter: ({ cellValue }) =>
          dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss'),
        title: '备份时间',
        width: 180,
      },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 140,
      },
    ],
    data: [],
    maxHeight: 360,
    pagerConfig: { enabled: false },
    rowConfig: { keyField: 'name' },
  } as VxeTableGridOptions<BackupFile>,
});

async function apply(data: BackupInfo, resetForm = false) {
  info.value = data;
  gridApi.setGridOptions({ data: data.files });
  if (resetForm) {
    await formApi.setValues({
      enabled: data.enabled,
      keep: data.keep,
      time: dayjs(data.time, 'HH:mm'),
    });
  }
  // 备份在服务器后台执行，执行期间每 3 秒刷新一次
  clearTimeout(timer);
  if (data.running) {
    timer = setTimeout(async () => apply(await getBackupApi()), 3000);
  }
}

async function save() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues<{
    enabled: boolean;
    keep: number;
    time: dayjs.Dayjs;
  }>();
  saving.value = true;
  try {
    await apply(
      await updateBackupApi({
        enabled: values.enabled,
        keep: values.keep,
        time: values.time.format('HH:mm'),
      }),
    );
    message.success('备份设置已保存');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

async function runNow() {
  starting.value = true;
  try {
    await apply(await runBackupApi());
    message.info('已开始备份');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    starting.value = false;
  }
}

async function download(file: BackupFile) {
  const result = await downloadBackupApi(file.name);
  const bytes = Uint8Array.from(atob(result.data), (char) =>
    char.codePointAt(0)!,
  );
  const url = URL.createObjectURL(new Blob([bytes]));
  const link = document.createElement('a');
  link.href = url;
  link.download = result.name;
  link.click();
  URL.revokeObjectURL(url);
}

function remove(file: BackupFile) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除备份「${file.name}」？删除后无法恢复。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除备份',
    async onOk() {
      await removeBackupApi(file.name);
      message.success('备份已删除');
      await apply(await getBackupApi());
    },
  });
}

onMounted(async () => {
  await apply(await getBackupApi(), true);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div>
    <div class="mb-6 max-w-[640px]">
      <Alert
        message="备份 admin-background 自己的 PostgreSQL 数据库（账号、角色、菜单、项目、设置、操作日志等），文件保存在服务器上。恢复方法见 admin-background deploy/README.md。"
        show-icon
        type="info"
      />
    </div>
    <div class="max-w-[640px]">
      <BackupForm />
      <div v-if="canEdit" class="ml-[120px]">
        <Space>
          <Button :loading="saving" type="primary" @click="save">保存</Button>
          <Button :disabled="info?.running" :loading="starting" @click="runNow">
            立即备份
          </Button>
        </Space>
      </div>
      <div v-if="info" class="mt-6 flex flex-col gap-2 text-sm">
        <div>
          <span class="text-muted-foreground">备份目录：</span>{{ info.dir }}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">最近一次：</span>
          <template v-if="info.running">
            <Spin size="small" />
            <span>正在备份…</span>
          </template>
          <span
            v-else-if="
              info.lastSuccess === undefined || info.lastSuccess === null
            "
          >
            还没有备份过
          </span>
          <template v-else>
            <Tag :color="info.lastSuccess ? 'success' : 'error'">
              {{ info.lastSuccess ? '成功' : '失败' }}
            </Tag>
            <span>{{
              dayjs(info.lastTime).format('YYYY-MM-DD HH:mm:ss')
            }}</span>
            <span class="break-all">{{ info.lastMessage }}</span>
          </template>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <FileGrid table-title="备份文件">
        <template #action="{ row }">
          <template v-if="canEdit">
            <Button size="small" type="link" @click="download(row)">
              下载
            </Button>
            <Button danger size="small" type="link" @click="remove(row)">
              删除
            </Button>
          </template>
        </template>
      </FileGrid>
    </div>
  </div>
</template>

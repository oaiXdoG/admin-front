<script lang="ts" setup>
import type { ProcessRecord } from '#/api/types';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Alert, Button, Input, message, Modal, Progress, Upload } from 'ant-design-vue';

import { deployProcessApi, uploadDeployChunkApi } from '#/api';

import { formatBytes } from '../format';

/** 部署：选择 zip 按 6MB 分块上传，完成后生成部署指令（解压覆盖到工作目录并重启进程） */
const props = defineProps<{ process: null | ProcessRecord; projectId: number }>();
const emit = defineEmits<{ close: []; deployed: [] }>();

const CHUNK_SIZE = 6 * 1024 * 1024;
/** 后台限制最多 64 块 */
const MAX_CHUNKS = 64;

const file = ref<File | null>(null);
const remark = ref('');
const uploading = ref(false);
const total = ref(0);
/** 已发送的字节数（按原文件大小计，含当前块已发出的部分），用于显示进度、速度和剩余时间 */
const sent = ref(0);
let startedAt = 0;

const percent = computed(() => (file.value ? Math.floor((sent.value / file.value.size) * 100) : 0));
const speed = computed(() => {
  const seconds = (Date.now() - startedAt) / 1000;
  return seconds > 0 ? sent.value / seconds : 0;
});
const remaining = computed(() => {
  if (!file.value || speed.value <= 0) return '';
  const seconds = Math.ceil((file.value.size - sent.value) / speed.value);
  return seconds >= 60 ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${seconds} 秒`;
});

watch(
  () => props.process?.id,
  () => {
    file.value = null;
    remark.value = '';
    sent.value = 0;
    total.value = 0;
  },
);

function pick(picked: File) {
  if (!picked.name.toLowerCase().endsWith('.zip')) {
    message.warning('请选择 .zip 压缩包');
  } else if (picked.size === 0) {
    message.warning('压缩包是空的');
  } else if (Math.ceil(picked.size / CHUNK_SIZE) > MAX_CHUNKS) {
    message.warning(`压缩包不能超过 ${formatBytes(CHUNK_SIZE * MAX_CHUNKS)}`);
  } else {
    file.value = picked;
  }
  // 不使用 Upload 自带的上传
  return false;
}

/** 读成 data URL 后去掉前缀，得到 base64 */
function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function deploy() {
  const process = props.process;
  const zip = file.value;
  if (!process || !zip) {
    message.warning('请选择 zip 压缩包');
    return;
  }
  uploading.value = true;
  sent.value = 0;
  startedAt = Date.now();
  total.value = Math.ceil(zip.size / CHUNK_SIZE);
  try {
    let uploadId: null | string = null;
    for (let index = 0; index < total.value; index++) {
      const chunk = zip.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      const before = index * CHUNK_SIZE;
      const data = await toBase64(chunk);
      const result = await uploadDeployChunkApi(props.projectId, process.id, uploadId, index, total.value, data, (ratio) => {
        sent.value = before + Math.floor(chunk.size * ratio);
      });
      uploadId = result.uploadId;
      sent.value = before + chunk.size;
    }
    await deployProcessApi(props.projectId, process.id, uploadId as string, zip.name, remark.value.trim());
    message.success('已下发部署指令，结果见执行记录');
    emit('deployed');
  } catch (error) {
    // 接口错误已由请求拦截器提示，这里只处理读取文件失败
    if (error instanceof DOMException) message.error(`读取文件失败：${error.message}`);
  } finally {
    uploading.value = false;
  }
}

function close() {
  if (!uploading.value) emit('close');
}
</script>

<template>
  <Modal
    :closable="!uploading"
    :keyboard="!uploading"
    :mask-closable="false"
    :open="process !== null"
    :title="process ? `部署：${process.name}` : ''"
    :width="600"
    destroy-on-close
    @cancel="close"
  >
    <div class="mb-4">
      <Alert show-icon type="info">
        <template #message>
          <ul class="list-disc pl-4 text-sm">
            <li>压缩包根目录对应工作目录（外面只有一层文件夹会自动去掉）</li>
            <li>按路径增量覆盖：同名文件替换、新文件加入、其余文件保持不变</li>
            <li>解压完成后自动重启进程</li>
            <li>删除文件请用进程详情里的「文件」管理</li>
          </ul>
        </template>
      </Alert>
    </div>
    <div class="flex items-center gap-3">
      <Upload :before-upload="pick" :disabled="uploading" :show-upload-list="false" accept=".zip">
        <Button :disabled="uploading">
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:upload" />
          </template>
          选择 zip
        </Button>
      </Upload>
      <span v-if="file" class="min-w-0 truncate">
        {{ file.name }}
        <span class="text-muted-foreground text-xs">（{{ formatBytes(file.size) }}）</span>
      </span>
      <span v-else class="text-muted-foreground text-sm">未选择文件</span>
    </div>
    <div class="mt-4">
      <Input v-model:value="remark" :disabled="uploading" :maxlength="128" placeholder="备注，可空，例如 修复登录问题" />
    </div>
    <div v-if="total > 0" class="mt-4">
      <Progress :percent="percent" :status="uploading ? 'active' : undefined" />
      <div class="text-muted-foreground text-xs">
        已上传 {{ formatBytes(sent) }} / {{ file ? formatBytes(file.size) : '' }}
        <template v-if="uploading && speed > 0"> · {{ formatBytes(speed) }}/s · 剩余约 {{ remaining }}</template>
      </div>
    </div>
    <template #footer>
      <Button :disabled="uploading" @click="close">取消</Button>
      <Button :disabled="!file" :loading="uploading" type="primary" @click="deploy">部署</Button>
    </template>
  </Modal>
</template>

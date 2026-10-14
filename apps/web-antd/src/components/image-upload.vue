<script lang="ts" setup>
import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Avatar, Button, message, Upload } from 'ant-design-vue';

/**
 * 选择图片后在浏览器里缩放、压缩成 data URL，直接存进数据库。
 * 头像和 Logo 输出 webp，浏览器图标输出 png（部分浏览器不认 webp 图标）。
 */
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    /** data URL 最大字符数，与后端限制一致 */
    maxLength?: number;
    /** 输出图片的最长边 */
    maxSide?: number;
    /** 输出格式 */
    output?: 'image/png' | 'image/webp';
    shape?: 'circle' | 'square';
    /** 预览尺寸 */
    size?: number;
  }>(),
  {
    disabled: false,
    maxLength: 280_000,
    maxSide: 256,
    output: 'image/webp',
    shape: 'circle',
    size: 72,
  },
);

const value = defineModel<string>('value', { default: '' });
const processing = ref(false);

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      resolve(image);
    });
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片无法读取'));
    });
    image.src = url;
  });
}

async function compress(file: File) {
  const image = await readImage(file);
  const scale = Math.min(
    1,
    props.maxSide / Math.max(image.width, image.height),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(props.output, 0.85);
}

async function beforeUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件');
    return false;
  }
  processing.value = true;
  try {
    const dataUrl = await compress(file);
    if (dataUrl.length > props.maxLength) {
      message.error('图片压缩后仍然过大，请换一张更小的图片');
      return false;
    }
    value.value = dataUrl;
  } catch {
    message.error('图片无法读取，请换一张图片');
  } finally {
    processing.value = false;
  }
  // 不走 Upload 自带的上传，数据随表单一起保存
  return false;
}
</script>

<template>
  <div class="flex items-center gap-4">
    <Avatar
      :shape="shape"
      :size="size"
      :src="value || undefined"
      class="bg-muted shrink-0"
    >
      <template #icon>
        <IconifyIcon class="size-1/2" icon="lucide:image" />
      </template>
    </Avatar>
    <div v-if="!disabled" class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Upload
          :before-upload="beforeUpload"
          :show-upload-list="false"
          accept="image/*"
        >
          <Button :loading="processing" size="small">
            {{ value ? '更换图片' : '上传图片' }}
          </Button>
        </Upload>
        <Button v-if="value" size="small" @click="value = ''">移除</Button>
      </div>
      <span class="text-muted-foreground text-xs">
        支持 png、jpg、webp，会自动缩放到 {{ maxSide }}px 以内
      </span>
    </div>
  </div>
</template>

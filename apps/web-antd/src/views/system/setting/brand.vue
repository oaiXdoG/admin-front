<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';

import { Alert, Button, Form, FormItem, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import { getSystemSettingApi, updateSystemSettingApi } from '#/api';
import ImageUpload from '#/components/image-upload.vue';
import { useSystemSettingStore } from '#/store';

const settingStore = useSystemSettingStore();
const { hasAccessByCodes } = useAccess();
const canEdit = hasAccessByCodes(['manage_setting:update']);
const logo = ref('');
const favicon = ref('');
const saving = ref(false);

const [SettingForm, formApi] = useVbenForm({
  commonConfig: { disabled: !canEdit },
  schema: [
    {
      component: 'Input',
      componentProps: { maxlength: 32, placeholder: '例如：运营管理后台' },
      fieldName: 'appName',
      help: '显示在浏览器标题、侧边栏和登录页',
      label: '系统名称',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入系统名称' })
        .max(32, { message: '系统名称最长 32 位' }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: '默认：Project operations console',
      },
      defaultValue: '',
      fieldName: 'loginTitle',
      label: '登录页标题',
      rules: z.string().max(128, { message: '最长 128 位' }).optional(),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '默认：项目运营管理后台' },
      defaultValue: '',
      fieldName: 'loginDescription',
      label: '登录页描述',
      rules: z.string().max(128, { message: '最长 128 位' }).optional(),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: '例如：某某科技有限公司，留空则不显示页脚',
      },
      defaultValue: '',
      fieldName: 'copyright',
      help: '页脚显示为「Copyright © 当年 版权方」',
      label: '版权方',
      rules: z.string().max(128, { message: '最长 128 位' }).optional(),
    },
  ],
  showDefaultActions: false,
});

async function save() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues<{
    appName: string;
    copyright: string;
    loginDescription: string;
    loginTitle: string;
  }>();
  saving.value = true;
  try {
    const saved = await updateSystemSettingApi({
      ...values,
      copyright: values.copyright ?? '',
      favicon: favicon.value,
      loginDescription: values.loginDescription ?? '',
      loginTitle: values.loginTitle ?? '',
      logo: logo.value,
    });
    settingStore.apply(saved);
    message.success('系统设置已保存，所有用户刷新后生效');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const setting = await getSystemSettingApi();
  logo.value = setting.logo;
  favicon.value = setting.favicon;
  formApi.setValues({
    appName: setting.appName,
    copyright: setting.copyright,
    loginDescription: setting.loginDescription,
    loginTitle: setting.loginTitle,
  });
});
</script>

<template>
  <div>
    <div class="mb-6 max-w-[640px]">
      <Alert
        message="这里是所有用户看到的品牌信息。主题、布局等个人偏好在右上角「偏好设置」里各自调整。"
        show-icon
        type="info"
      />
    </div>
    <div class="max-w-[640px]">
      <SettingForm />
      <div class="mt-2">
        <Form :label-col="{ style: { width: '120px' } }">
          <FormItem label="Logo">
            <ImageUpload
              v-model:value="logo"
              :disabled="!canEdit"
              :size="64"
              shape="square"
            />
          </FormItem>
          <FormItem label="浏览器图标">
            <ImageUpload
              v-model:value="favicon"
              :disabled="!canEdit"
              :max-length="100_000"
              :max-side="64"
              :size="40"
              output="image/png"
              shape="square"
            />
          </FormItem>
        </Form>
      </div>
      <div v-if="canEdit" class="ml-[120px]">
        <Button :loading="saving" type="primary" @click="save">保存</Button>
      </div>
    </div>
  </div>
</template>

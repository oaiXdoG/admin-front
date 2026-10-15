<script lang="ts" setup>
import type { Profile } from '#/api/types';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm, z } from '#/adapter/form';
import { changePasswordApi, getProfileApi, updateProfileApi } from '#/api';
import ImageUpload from '#/components/image-upload.vue';
import { useAuthStore } from '#/store';
import { PASSWORD_HELP, passwordRule } from '#/utils/password';

defineOptions({ name: 'Profile' });

const authStore = useAuthStore();
const profile = ref<null | Profile>(null);
const avatar = ref('');
const saving = ref(false);
const changing = ref(false);

const [BasicForm, basicFormApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'account',
      help: '登录名不能修改',
      label: '登录名',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'username',
      label: '显示名',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入显示名' })
        .max(64, { message: '显示名最长 64 位' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空' },
      defaultValue: '',
      fieldName: 'remark',
      label: '备注',
      rules: z.string().max(128, { message: '备注最长 128 位' }).optional(),
    },
  ],
  showDefaultActions: false,
});

const [PasswordForm, passwordFormApi] = useVbenForm({
  schema: [
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'current-password' },
      fieldName: 'oldPassword',
      label: '原密码',
      rules: z.string().min(1, { message: '请输入原密码' }),
    },
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'new-password', maxlength: 128 },
      fieldName: 'newPassword',
      help: PASSWORD_HELP,
      label: '新密码',
      rules: passwordRule,
    },
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'new-password', maxlength: 128 },
      dependencies: {
        resolve: ({ values }) => ({
          rules: z
            .string({ message: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === values.newPassword, {
              message: '两次输入的新密码不一致',
            }),
        }),
        triggerFields: ['newPassword'],
      },
      fieldName: 'confirmPassword',
      label: '确认新密码',
    },
  ],
  showDefaultActions: false,
});

function fill(data: Profile) {
  profile.value = data;
  avatar.value = data.avatar;
  basicFormApi.setValues({
    account: data.account,
    remark: data.remark ?? '',
    username: data.username,
  });
}

async function saveBasic() {
  const { valid } = await basicFormApi.validate();
  if (!valid) return;
  const values = await basicFormApi.getValues<{
    remark: string;
    username: string;
  }>();
  saving.value = true;
  try {
    const updated = await updateProfileApi({ ...values, avatar: avatar.value });
    fill(updated);
    authStore.applyProfile(updated);
    message.success('个人资料已保存');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  const { valid } = await passwordFormApi.validate();
  if (!valid) return;
  const values = await passwordFormApi.getValues<{
    newPassword: string;
    oldPassword: string;
  }>();
  changing.value = true;
  try {
    await changePasswordApi(values.oldPassword, values.newPassword);
    await passwordFormApi.reset();
    message.success('密码已修改，其他设备上的登录已失效');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    changing.value = false;
  }
}

const formatTime = (value?: number) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';

onMounted(async () => fill(await getProfileApi()));
</script>

<template>
  <Page>
    <Card :bordered="false">
      <Tabs>
        <TabPane key="basic" tab="基本资料">
          <div class="max-w-[560px]">
            <div class="mb-6 ml-[120px]">
              <ImageUpload v-model:value="avatar" :size="80" />
            </div>
            <BasicForm />
            <div class="ml-[120px] mt-2">
              <Button :loading="saving" type="primary" @click="saveBasic">
                保存
              </Button>
            </div>
          </div>
        </TabPane>
        <TabPane key="password" tab="修改密码">
          <div class="max-w-[560px]">
            <PasswordForm />
            <div class="ml-[120px] mt-2">
              <Button
                :loading="changing"
                type="primary"
                @click="changePassword"
              >
                修改密码
              </Button>
            </div>
          </div>
        </TabPane>
        <TabPane key="access" tab="我的权限">
          <Descriptions
            v-if="profile"
            :column="1"
            bordered
            class="max-w-[720px]"
          >
            <DescriptionsItem label="登录名">
              {{ profile.account }}
            </DescriptionsItem>
            <DescriptionsItem label="平台角色">
              <Tag
                v-for="role in profile.platformRoles"
                :key="role"
                color="purple"
              >
                {{ role }}
              </Tag>
              <span v-if="profile.platformRoles.length === 0">—</span>
            </DescriptionsItem>
            <DescriptionsItem label="所在项目">
              <div v-if="profile.superAdmin" class="mb-2 text-sm">
                超级管理员可以进入全部项目，并拥有项目里的全部权限。
              </div>
              <div
                v-for="item in profile.projects"
                :key="item.projectId"
                class="mb-1"
              >
                {{ item.projectName }}
                <span class="ml-2">
                  <Tag color="blue">{{ item.roleName }}</Tag>
                </span>
              </div>
              <Empty
                v-if="!profile.superAdmin && profile.projects.length === 0"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                description="还没有加入任何项目"
              />
            </DescriptionsItem>
            <DescriptionsItem label="最后登录">
              {{ formatTime(profile.lastLoginAt) }}
            </DescriptionsItem>
            <DescriptionsItem label="创建时间">
              {{ formatTime(profile.createdAt) }}
            </DescriptionsItem>
          </Descriptions>
        </TabPane>
      </Tabs>
    </Card>
  </Page>
</template>

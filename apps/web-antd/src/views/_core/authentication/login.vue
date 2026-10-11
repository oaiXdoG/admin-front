<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'username',
        maxlength: 64,
        placeholder: '请输入账号',
      },
      fieldName: 'username',
      label: '账号',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入账号' })
        .max(64, { message: '账号最长 64 位' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        maxlength: 128,
        placeholder: '请输入密码',
      },
      fieldName: 'password',
      label: '密码',
      rules: z
        .string()
        .min(1, { message: '请输入密码' })
        .max(128, { message: '密码最长 128 位' }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    sub-title="请输入账号和密码登录"
    title="欢迎回来"
    @submit="authStore.authLogin"
  />
</template>

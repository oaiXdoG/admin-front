import { z } from '#/adapter/form';

/** 与后端 PasswordPolicy 一致：8～128 位，同时包含字母和数字 */
export const PASSWORD_HELP = '至少 8 位，同时包含字母和数字';

export function strongPassword(value: string) {
  return (
    value.length >= 8 &&
    value.length <= 128 &&
    /\p{L}/u.test(value) &&
    /\d/.test(value)
  );
}

export const passwordRule = z
  .string()
  .min(1, { message: '请输入密码' })
  .refine(strongPassword, { message: PASSWORD_HELP });

/** 可留空（留空表示不修改） */
export const optionalPasswordRule = z
  .string()
  .refine((value) => !value || strongPassword(value), {
    message: PASSWORD_HELP,
  })
  .optional();

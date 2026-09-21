<template>
  <form dir="rtl" class="flex flex-col gap-4" @submit.prevent="submit">
    <h1 class="text-center text-xl">{{ initial ? 'ساخت مدیر کل' : register ? 'ثبت مدیر جدید' : 'ورود مدیر' }}</h1>
    <label v-if="register">نام<input v-model="name" required maxlength="100" autocomplete="name" class="mt-1 w-full rounded text-gray-900" /></label>
    <label>ایمیل<input v-model="email" required type="email" autocomplete="email" dir="ltr" class="mt-1 w-full rounded text-gray-900" /></label>
    <label>رمز عبور<input v-model="password" required type="password" :minlength="register ? 8 : undefined" :autocomplete="register ? 'new-password' : 'current-password'" class="mt-1 w-full rounded text-gray-900" /></label>
    <label v-if="register">آدرس تصویر آواتار<input v-model="avatarUrl" required type="url" dir="ltr" class="mt-1 w-full rounded text-gray-900" /></label>
    <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-300">{{ error }}</p>
    <button :disabled="pending" class="rounded bg-red-800 p-2 text-white disabled:opacity-50">{{ pending ? 'در حال ارسال…' : register ? 'ساخت حساب' : 'ورود' }}</button>
    <p v-if="success" role="status" class="text-green-600">مدیر جدید ساخته شد.</p>
    <RouterLink v-if="register" :to="initial ? '/login' : '/account'" class="text-center text-sm underline">بازگشت</RouterLink>
  </form>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useSignInAdminMutation } from "~/services/auth/authApi";
import { adminApi } from "~/services/admin/adminApi";
import { getApiErrorMessage } from "~/services/api";
import { useAuthStore } from "~/stores/auth";
import { router } from '~/router';
const props = defineProps<{ register?: boolean; initial?: boolean }>();
const { mutate: signInAdmin } = useSignInAdminMutation();
const name = ref('');
const email = ref('');
const password = ref('');
const avatarUrl = ref('');
const pending = ref(false);
const error = ref('');
const success = ref(false);
const auth = useAuthStore();
async function submit() {
  if (pending.value) return;
  error.value = '';
  success.value = false;
  if (props.register && new TextEncoder().encode(password.value).length > 72) { error.value = 'رمز عبور باید حداکثر ۷۲ بایت باشد.'; return; }
  pending.value = true;
  try {
    if (props.register) await adminApi.registerAdmin({ name: name.value.trim(), email: email.value.trim(), password: password.value, avatarUrl: avatarUrl.value.trim() });
    else await signInAdmin({ email: email.value.trim(), password: password.value });
    if (props.initial) { await router.push('/login?registered=1'); return; }
    if (props.register) { success.value = true; name.value = ''; email.value = ''; avatarUrl.value = ''; return; }
    await auth.update();
    if (!auth.userData) throw new Error('نشست ورود برقرار نشد. دوباره تلاش کنید.');
    await router.push('/account');
  } catch (e: unknown) { error.value = getApiErrorMessage(e); }
  finally { pending.value = false; password.value = ''; }
}
</script>

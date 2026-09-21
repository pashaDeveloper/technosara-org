<template>
  <main dir="rtl" class="mx-auto max-w-md rounded bg-white p-6 shadow dark:bg-neutral-700 dark:text-white">
    <h1 class="mb-4 text-xl">حساب من</h1>
    <p>{{ auth.userData?.name }}</p>
    <p class="my-3">{{ auth.userData?.email }}</p>
    <p>{{ auth.userData?.adminRole === 'superAdmin' ? 'مدیر کل' : 'مدیر' }}</p>
    <RouterLink v-if="auth.userData?.adminRole === 'superAdmin'" to="/admin-register" class="my-4 block underline">ثبت مدیر جدید</RouterLink>
    <p v-if="error" role="alert" class="mt-3 text-red-500">{{ error }}</p>
    <button class="mt-5 rounded bg-red-800 px-4 py-2 text-white" @click="logout">خروج از حساب</button>
  </main>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "~/stores/auth";
const auth = useAuthStore();
const error = ref('');
async function logout() { try { await auth.logout(); } catch { error.value = 'خروج انجام نشد؛ دوباره تلاش کنید.'; } }
</script>

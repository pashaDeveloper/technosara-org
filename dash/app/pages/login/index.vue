<template>
  <div class="flex flex-col gap-5">
    <!-- Classic Login Form -->
    <form
      class="flex flex-col gap-5"
      @submit.prevent="handleSubmit"
    >
      <BaseInput
        v-model="form.email"
        type="email"
        :placeholder="$text('general.username')"
        autocomplete="username"
        autofocus
        name="email"
      />

      <BaseInput
        v-model="form.password"
        :type="showPassword ? 'text' : 'password'"
        name="password"
        :placeholder="$text('general.password')"
        autocomplete="current-password"
      />

      <button type="button" :aria-pressed="showPassword" class="text-start text-sm" @click="showPassword = !showPassword">
        {{ showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور' }}
      </button>

      <label
        class="flex gap-2 whitespace-nowrap"
        :title="$text('login.rememberMeDesc')"
      >
        <BaseSwitch v-model="remember" />
        <span class="text-sm">{{ $text('login.rememberMe') }}</span>
      </label>

      <button
        class="rounded bg-red-800 py-2 text-sm text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 dark:bg-red-800 dark:text-white dark:hover:bg-red-700 disabled:dark:bg-neutral-800"
        :disabled="isLoading || !form.password || !form.email"
      >
        <IconsLoading v-if="isLoading" class="mx-auto w-5 animate-spin" />
        <span v-else>{{ $text('login.signIn') }}</span>
      </button>
    </form>
    <MutationFeedback
      :state="{ data, isLoading, isSuccess, isError, error }"
      toast-id="signin"
      loading-message="در حال ورود..."
      success-message="ورود با موفقیت انجام شد"
      error-message="ورود ناموفق بود"
      :navigate-to="navigateTo"
      :on-success="handleSuccess"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute } from 'vue-router';
import { useSignInAdminMutation } from "~/services/auth/authApi";
import MutationFeedback from '~/components/Mutation/MutationFeedback.vue';
import { useAuthStore } from '~/stores/auth';
import BaseInput from "~/components/Base/Input.vue";
import BaseSwitch from "~/components/Base/Switch.vue";
import IconsLoading from "~/components/Icons/Loading.vue";
const location = useRoute();
const auth = useAuthStore();
const { mutate: signInAdmin, data, isLoading, isSuccess, error, isError } = useSignInAdminMutation();
const remember = ref(false);
const showPassword = ref(false);
const form = reactive({ email: '', password: '' });
const navigateTo = computed(() => {
  const from = location.query.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    && !from.startsWith('/login') && !from.startsWith('/setup') ? from : '/';
});

async function handleSuccess() {
  // The server stores the token in its HttpOnly cookie; hydrate the Pinia store.
  await auth.update();
  if (!auth.userData) throw new Error('نشست ورود برقرار نشد. دوباره تلاش کنید.');
}

async function handleSubmit() {
  if (!form.email.trim() || !form.password || isLoading.value) return;
  try {
    await signInAdmin({ ...form, email: form.email.trim(), remember: remember.value });
  } catch {
    // MutationFeedback displays the request error.
  } finally {
    form.password = '';
  }
}
</script>

<template>
  <p v-if="state.isLoading" :id="toastId" role="status" aria-live="polite" class="text-sm">
    {{ loadingMessage }}
  </p>
</template>

<script setup lang="ts" generic="T">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '~/stores/toast';
import { getApiErrorMessage, type ApiResponse } from '~/services/api';

const props = withDefaults(defineProps<{
  state: { data?: T; isLoading: boolean; isSuccess: boolean; isError: boolean; error?: unknown };
  toastId?: string;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  navigateTo?: string;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}>(), {
  toastId: 'mutation-feedback',
  loadingMessage: 'در حال انجام عملیات...',
  successMessage: 'عملیات با موفقیت انجام شد',
  errorMessage: 'عملیات انجام نشد',
});
const router = useRouter();
const toast = useToast();

// Watch completion transitions, not callback identities or unrelated renders.
watch(() => [props.state.isLoading, props.state.isSuccess, props.state.isError], async () => {
  const { data, error, isLoading, isSuccess, isError } = props.state;
  if (isLoading) return;
  if (isError) {
    toast.showToast({ type: 'error', message: error ? getApiErrorMessage(error) : props.errorMessage });
    await props.onError?.(error);
    return;
  }
  if (!isSuccess) return;
  const response = data as ApiResponse | undefined;
  if (response?.acknowledgement === false) {
    toast.showToast({ type: 'error', message: response.description || response.message || props.errorMessage });
    await props.onError?.(data);
    return;
  }
  try {
    await props.onSuccess?.(data as T);
    toast.showToast({ type: 'success', message: response?.description || props.successMessage });
    if (props.navigateTo) await router.replace(props.navigateTo);
  } catch (failure) {
    toast.showToast({ type: 'error', message: getApiErrorMessage(failure) });
  }
});
</script>

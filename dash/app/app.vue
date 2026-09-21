<template>
  <ToastProvider>
    <component :is="layout"><RouterView /></component>
    <ToastViewport class="fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-[10px] p-[var(--viewport-padding)] outline-none [--viewport-padding:_25px]">
      <BaseToast ref="toastRef" />
    </ToastViewport>
  </ToastProvider>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { computed, useTemplateRef } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { ToastProvider, ToastViewport } from 'reka-ui';
import BaseToast from './components/Base/Toast.vue';
import DefaultLayout from './layouts/default.vue';
import SetupLayout from './layouts/setup.vue';
import { useToast } from './stores/toast';
const route = useRoute();
const layout = computed(() => route.meta.layout === 'setup' ? SetupLayout : DefaultLayout);
const toastRef = useTemplateRef('toastRef');
useToast().setToast(toastRef);
</script>

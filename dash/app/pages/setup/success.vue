<template>
  <div class="flex flex-col items-center">
    <p>{{ $text('setup.successful') }}</p>
    <RouterLink to="/login" class="mt-4">
      <BasePrimaryButton as="span">{{ $text('login.signIn') }}</BasePrimaryButton>
    </RouterLink>
  </div>
</template>

<script lang="ts" setup>
import { RouterLink } from "vue-router";
import { useSetupStore } from "~/stores/setup";
import BasePrimaryButton from "~/components/Base/PrimaryButton.vue";
const setupStore = useSetupStore();
setupStore.setStep(1);
</script>

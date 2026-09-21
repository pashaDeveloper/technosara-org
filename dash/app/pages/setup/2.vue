<template>
  <div>
    <p class="text-center text-lg">
      {{ $text('setup.createAdminDesc') }}
    </p>
    <div class="mt-8 flex flex-col gap-3">
      <div class="flex flex-col">
        <FormNullTextField
          id="username"
          v-model="username"
          autocomplete="username"
          :label="$text('general.username')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="password"
          v-model="password"
          autocomplete="new-password"
          :label="$text('general.password')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="confirmPassword"
          v-model="confirmPassword"
          autocomplete="new-password"
          :label="$text('general.confirmPassword')"
        />
      </div>
      <div class="mt-4 flex justify-center">
        <BasePrimaryButton :disabled="isLoading" @click="submit">
          {{ $text('setup.createAccount') }}
        </BasePrimaryButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useSetupAdminMutation } from "~/services/admin/adminApi";
import { useSetupStore } from "~/stores/setup";
import { useSubmit } from "~/composables/useSubmit";
import FormNullTextField from "~/components/Form/NullTextField.vue";
import FormPasswordField from "~/components/Form/PasswordField.vue";
import BasePrimaryButton from "~/components/Base/PrimaryButton.vue";
import { router } from '~/router';
const setupStore = useSetupStore();
setupStore.setStep(1);

const username = ref<null | string>(null);
const password = ref<string>('');
const confirmPassword = ref<string>('');

const { mutate: setupAdmin, isLoading } = useSetupAdminMutation();
const _submit = useSubmit(
  setupAdmin,
  {
    revert: async (success) => {
      if (success) {
        await router.push('/login?registered=1');
      }
    },
    noSuccessToast: true,
  }
);

function submit() {
  return _submit({
    username: username.value || '',
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
}
</script>

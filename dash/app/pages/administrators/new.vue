<template>
  <main>
    <Panel
      ><PanelHead
        ><PanelHeadTitle>{{
          $text('me.addAdministrator')
        }}</PanelHeadTitle></PanelHead
      ><PanelBody class="dark:text-neutral-200">
        <RouterLink to="/me" class="inline-block py-2 underline">{{
          $text('me.backToAdministrators')
        }}</RouterLink>
        <FormElement @submit.prevent="createAdministrator">
          <FormGroup>
            <FormHeading>{{ $text('me.addAdministrator') }}</FormHeading>
            <FormTextField
              id="administrator-username"
              v-model="username"
              autocomplete="off"
              :label="$text('general.username')"
            />
            <FormPasswordField
              id="administrator-password"
              v-model="password"
              autocomplete="new-password"
              :label="$text('general.password')"
            />
            <FormPasswordField
              id="administrator-confirm-password"
              v-model="confirmPassword"
              autocomplete="new-password"
              :label="$text('general.confirmPassword')"
            />
            <p class="col-span-2 text-sm text-gray-500 dark:text-gray-400">
              {{ $text('me.administratorPasswordDesc') }}
            </p>
            <FormPrimaryActionField
              type="submit"
              :disabled="saving"
              :label="$text('me.addAdministrator')"
            />
          </FormGroup>
        </FormElement> </PanelBody
    ></Panel>
  </main>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { adminApi } from "~/services/admin/adminApi";
import { useSubmit } from "~/composables/useSubmit";
import { panelText } from "~/utils/panelText";
import Panel from "~/components/Panel/Panel.vue";
import PanelHead from "~/components/Panel/head/Head.vue";
import PanelHeadTitle from "~/components/Panel/head/Title.vue";
import PanelBody from "~/components/Panel/Body.vue";
import FormElement from "~/components/Form/Element.vue";
import FormGroup from "~/components/Form/Group.vue";
import FormHeading from "~/components/Form/Heading.vue";
import FormTextField from "~/components/Form/TextField.vue";
import FormPasswordField from "~/components/Form/PasswordField.vue";
import FormPrimaryActionField from "~/components/Form/PrimaryActionField.vue";
import { router } from '~/router';
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const t = panelText;

const submit = useSubmit(
  adminApi.createAdmin,
  {
    successMsg: t('me.administratorCreated'),
    revert: async (success) => {
      if (success) {
        username.value = '';
        password.value = '';
        confirmPassword.value = '';
        await router.push('/me');
      }
    },
  }
);

async function createAdministrator() {
  if (saving.value) return;
  saving.value = true;
  try {
    await submit({
      username: username.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main dir="rtl"><Panel><PanelHead><PanelHeadTitle>{{ $text('store.title') }}</PanelHeadTitle></PanelHead><PanelBody>
    <p class="mb-6 text-gray-600 dark:text-neutral-300">{{ $text('store.welcome') }}</p>
    <nav class="flex flex-wrap gap-4">
      <RouterLink to="/me" class="rounded border px-4 py-3">{{ $text('pages.me') }}</RouterLink>
      <RouterLink v-if="auth.userData?.adminRole === 'superAdmin'" to="/administrators/new" class="rounded border px-4 py-3">{{ $text('me.addAdministrator') }}</RouterLink>
    </nav>
  </PanelBody></Panel></main>
</template>
<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "~/stores/auth";
import Panel from "~/components/Panel/Panel.vue";
import PanelHead from "~/components/Panel/head/Head.vue";
import PanelHeadTitle from "~/components/Panel/head/Title.vue";
import PanelBody from "~/components/Panel/Body.vue";
const auth = useAuthStore();
</script>

<template>
  <div>
    <header
      class="mx-auto my-4 flex max-w-3xl flex-col justify-center max-md:px-3"
    >
      <div class="mb-5 flex w-full items-center justify-between">
        <HeaderLogo v-if="loggedIn" class="hidden sm:block" />
        <div class="ml-auto flex flex-row gap-3">
          <AdminUiThemeSwitch />
          <AdminUiUserMenu v-if="loggedIn" />
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "~/stores/auth";
import HeaderLogo from "~/components/Header/Logo.vue";
import AdminUiThemeSwitch from "~/components/AdminUi/ThemeSwitch.vue";
import AdminUiUserMenu from "~/components/AdminUi/UserMenu.vue";
const route = useRoute();

const isLoginRoute = computed(
  () => route.path === '/login'
);

const loggedIn = computed(
  () => !isLoginRoute.value && !!useAuthStore().userData
);
</script>

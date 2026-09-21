<template>
  <IconsBrandsGitHub v-if="provider === 'github'" />
  <IconsBrandsGoogle v-else-if="provider === 'google'" />
</template>

<script setup lang="ts">
import type { OAUTH_PROVIDER } from "~/utils/types";
import IconsBrandsGitHub from "~/components/Icons/Brands/GitHub.vue";
import IconsBrandsGoogle from "~/components/Icons/Brands/Google.vue";
defineProps<{
  provider: OAUTH_PROVIDER;
}>();
</script>

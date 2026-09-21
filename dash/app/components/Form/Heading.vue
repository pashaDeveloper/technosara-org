<template>
  <h3 class="col-span-full flex items-center py-6 text-2xl">
    <slot />
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </h3>
</template>

<script lang="ts" setup>
import BaseTooltip from "~/components/Base/Tooltip.vue";
import IconsInfo from "~/components/Icons/Info.vue";
defineProps<{ description?: string }>();
</script>

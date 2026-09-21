<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <span :id="id" class="flex flex-col justify-center">{{ data }}</span>
</template>

<script lang="ts" setup>
import FormLabel from "~/components/Form/Label.vue";
import BaseTooltip from "~/components/Base/Tooltip.vue";
import IconsInfo from "~/components/Icons/Info.vue";
defineProps<{
  id: string;
  label: string;
  description?: string;
  data?: string;
}>();
</script>

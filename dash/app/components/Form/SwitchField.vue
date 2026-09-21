<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div class="my-auto">
    <BaseSwitch :id="id" v-model="data" :disabled="disabled" />
  </div>
</template>

<script lang="ts" setup>
import FormLabel from "~/components/Form/Label.vue";
import BaseTooltip from "~/components/Base/Tooltip.vue";
import IconsInfo from "~/components/Icons/Info.vue";
import BaseSwitch from "~/components/Base/Switch.vue";
defineProps<{
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}>();
const data = defineModel<boolean>();
</script>

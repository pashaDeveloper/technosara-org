<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseTextArea
    :id="id"
    v-model.trim="data"
    :name="id"
    :autocomplete="autocomplete"
    :disabled="disabled"
  />
</template>

<script lang="ts" setup>
import FormLabel from "~/components/Form/Label.vue";
import BaseTooltip from "~/components/Base/Tooltip.vue";
import IconsInfo from "~/components/Icons/Info.vue";
import BaseTextArea from "~/components/Base/TextArea.vue";
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
  disabled?: boolean;
}>();

const data = defineModel<string>();
</script>

<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
  />
</template>

<script lang="ts" setup>
import FormLabel from "~/components/Form/Label.vue";
import BaseTooltip from "~/components/Base/Tooltip.vue";
import IconsInfo from "~/components/Icons/Info.vue";
import BaseInput from "~/components/Base/Input.vue";
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
  placeholder?: string;
}>();

const data = defineModel<string | null>({
  set(value) {
    const temp = value?.trim() ?? null;
    if (temp === '') {
      return null;
    }
    return temp;
  },
});
</script>

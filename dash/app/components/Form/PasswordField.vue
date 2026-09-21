<template>
  <FormLabel :for="id">
    {{ label }}
  </FormLabel>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="password"
    :autocomplete="autocomplete"
  />
</template>

<script lang="ts" setup>
import FormLabel from "~/components/Form/Label.vue";
import BaseInput from "~/components/Base/Input.vue";
defineProps<{ id: string; label: string; autocomplete: string }>();

const data = defineModel<string>();
</script>

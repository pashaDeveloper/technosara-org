<template>
  <AvatarRoot
    class="mr-2 inline-flex select-none items-center justify-center overflow-hidden rounded-full align-middle"
  >
    <AvatarImage
      class="h-full w-full rounded-[inherit] object-cover"
      :src="img ?? ''"
    />
    <AvatarFallback
      class="leading-1 flex h-full w-full items-center justify-center bg-white text-sm font-medium"
      :delay-ms="600"
    >
      <slot />
    </AvatarFallback>
  </AvatarRoot>
</template>

<script lang="ts" setup>
import { AvatarRoot } from 'reka-ui';
import { AvatarImage } from 'reka-ui';
import { AvatarFallback } from 'reka-ui';
defineProps<{ img?: string }>();
</script>

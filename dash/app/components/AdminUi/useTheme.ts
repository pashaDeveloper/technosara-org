import { computed, reactive } from 'vue';
import { useColorMode } from '@vueuse/core';

export function useTheme() {
  const mode = useColorMode({ storageKey: 'theme', emitAuto: true });
  const preference = computed<'system' | 'dark' | 'light'>({
    get: () => mode.value === 'auto' ? 'system' : mode.value,
    set: value => { mode.value = value === 'system' ? 'auto' : value; },
  });
  return reactive({ preference, value: mode.state });
}

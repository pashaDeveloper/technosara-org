<template>
    <VueApexCharts
      width="100%"
      height="100%"
      v-bind="$attrs"
      :options="options"
      :series="series"
    />
</template>

<script setup lang="ts">
import VueApexCharts, { type VueApexChartsComponentProps } from 'vue3-apexcharts';

defineProps<{
  options: VueApexChartsComponentProps['options'];
  series: VueApexChartsComponentProps['series'];
}>();
</script>

<template>
  <button :class="bg" class="cursor-pointer px-3 py-1 text-sm rounded-md mb-4">
    <slot></slot>
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
interface Props {
  type: 'primary' | 'secondary' | 'destructive'
}
const props = withDefaults(defineProps<Props>(), { type: 'primary' })

const bg = computed(() => {
  switch (props.type) {
    case 'primary':
      return 'bg-gray-900 hover:opacity-70 text-white'
    case 'secondary':
      return 'bg-transparent border border-gray-700 text-gray-900'
    case 'destructive':
      return 'bg-orange-700 hover:opacity-70 text-white'
  }
})
</script>

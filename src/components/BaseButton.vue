<template>
  <button :class="cls" class="cursor-pointer px-3 py-1 text-sm rounded-md mb-4">
    <slot></slot>
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
interface Props {
  type: 'primary' | 'secondary' | 'destructive'
  size: 'default' | 'xs'
}
const props = withDefaults(defineProps<Props>(), { type: 'primary', size: 'default' })

const cls = computed(() => {
  return `${size.value} ${bg.value}`
})

const size = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-xs px-1 py-0.5'
    case 'default':
      return 'text-sm px-3 py-1'
  }
})
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

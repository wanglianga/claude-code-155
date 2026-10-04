<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string; size?: 'md' | 'lg' }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
function close() { emit('update:modelValue', false) }
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-mask" @click.self="close">
      <div class="modal fade-up" :class="{ lg: size === 'lg' }">
        <div class="modal-head">
          <div class="modal-title">{{ title }}</div>
          <button class="modal-x" @click="close">×</button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="modal-foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

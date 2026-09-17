<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="dialog-mask"
      @click="emit('update:modelValue', false)"
    >
      <div class="dialog-container" @click.stop>
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<style>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.dialog-container {
  background-color: white;
  border-radius: 14px;
  overflow: auto;
  padding: 10px;
  width: 100%;
  max-width: 480px;
  max-height: min(88vh, 720px);
  box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.35);
}

@media (max-width: 480px) {
  .dialog-mask {
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    align-items: flex-end;
  }

  .dialog-container {
    max-width: 100%;
    max-height: 88vh;
    border-radius: 16px 16px 6px 6px;
  }
}
</style>

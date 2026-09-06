<script setup>
defineProps({
  modelValue: Boolean,
  items: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "click"]);
</script>

<template>
  <div class="menu">
    <Transition name="fade">
      <div
        v-show="modelValue"
        class="menu-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <div v-show="modelValue" class="menu-content">
      <ul>
        <li
          v-for="(item, index) in items"
          :key="index"
          @click="
            emit('update:modelValue', false);
            emit('click', item.text);
          "
        >
          <span v-text="item.text"></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.menu-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.menu-content {
  top: calc(100% + 8px);
  position: absolute;
  background-color: white;
  z-index: 100;
  border-radius: 8px;
  right: 0;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.menu-content li {
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #1E293B;
  display: flex;
  align-items: center;
}

.menu-content li:hover {
  background-color: #F1F5F9;
  color: #0F172A;
}
</style>

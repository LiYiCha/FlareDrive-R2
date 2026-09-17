<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from "vue";

const props = defineProps({
  modelValue: Boolean,
  items: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "click"]);

const rootRef = ref(null);
const contentRef = ref(null);

function position() {
  const anchor = rootRef.value?.parentElement;
  if (!anchor || !contentRef.value) return;
  const rect = anchor.getBoundingClientRect();
  const el = contentRef.value;
  el.style.top = `${rect.bottom + 8}px`;
  const right = Math.max(8, window.innerWidth - rect.right);
  el.style.right = `${right}px`;
}

function reposition() {
  if (props.modelValue) position();
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) nextTick(position);
  }
);

window.addEventListener("resize", reposition);
window.addEventListener("scroll", reposition, true);

onBeforeUnmount(() => {
  window.removeEventListener("resize", reposition);
  window.removeEventListener("scroll", reposition, true);
});
</script>

<template>
  <div ref="rootRef" class="menu">
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-show="modelValue"
          class="menu-modal"
          @click="emit('update:modelValue', false)"
        ></div>
      </Transition>
      <div ref="contentRef" v-show="modelValue" class="menu-content">
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
    </Teleport>
  </div>
</template>

<style scoped>
.menu-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 90;
}

.menu-content {
  position: fixed;
  background-color: white;
  z-index: 91;
  border-radius: 10px;
  min-width: 180px;
  max-width: calc(100vw - 24px);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.18);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.menu-content li {
  padding: 0 16px;
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #1e293b;
}

.menu-content li:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
</style>

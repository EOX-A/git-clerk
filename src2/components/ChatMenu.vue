<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import ChatIcon from "@/components/ChatIcon.vue";

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
  selected: { type: String, default: "" },
  trigger: { type: Object, required: true },
  onSelect: { type: Function, required: true },
  onClose: { type: Function, required: true },
});
const panel = ref(null);
const position = ref({ visibility: "hidden" });
let resizeObserver;

const positionMethod = () => {
  const anchor = props.trigger.getBoundingClientRect();
  const bounds = panel.value.getBoundingClientRect();
  const top =
    anchor.bottom > window.innerHeight * 0.62
      ? anchor.top - bounds.height - 6
      : anchor.bottom + 6;
  position.value = {
    left: `${Math.max(12, Math.min(anchor.left, window.innerWidth - bounds.width - 12))}px`,
    top: `${Math.max(12, Math.min(top, window.innerHeight - bounds.height - 12))}px`,
  };
};

const outsideMethod = (event) => {
  if (
    !panel.value.contains(event.target) &&
    !props.trigger.contains(event.target)
  )
    props.onClose(false);
};
const blurMethod = (event) => {
  if (
    event.relatedTarget &&
    !panel.value.contains(event.relatedTarget) &&
    !props.trigger.contains(event.relatedTarget)
  )
    props.onClose(false);
};
const keyMethod = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    props.onClose();
    return;
  }
  const items = [...panel.value.querySelectorAll('[role="option"]')];
  const current = items.indexOf(document.activeElement);
  let index;
  if (event.key === "ArrowDown") index = (current + 1) % items.length;
  if (event.key === "ArrowUp")
    index = (current - 1 + items.length) % items.length;
  if (event.key === "Home") index = 0;
  if (event.key === "End") index = items.length - 1;
  if (index !== undefined) {
    event.preventDefault();
    items[index]?.focus();
  }
};

onMounted(async () => {
  await nextTick();
  positionMethod();
  (
    panel.value.querySelector('[aria-selected="true"]') ||
    panel.value.querySelector('[role="option"]')
  )?.focus();
  document.addEventListener("pointerdown", outsideMethod);
  window.addEventListener("resize", positionMethod);
  window.addEventListener("scroll", positionMethod, true);
  resizeObserver = new ResizeObserver(positionMethod);
  resizeObserver.observe(props.trigger);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", outsideMethod);
  window.removeEventListener("resize", positionMethod);
  window.removeEventListener("scroll", positionMethod, true);
  resizeObserver?.disconnect();
});
</script>

<template>
  <div
    id="chat-options"
    ref="panel"
    role="listbox"
    :aria-label="title"
    :style="position"
    class="nav-scrollbar fixed z-50 max-h-[min(460px,calc(100dvh-80px))] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-border-soft bg-elev p-1.5 shadow-menu"
    @keydown="keyMethod"
    @focusout="blurMethod"
  >
    <div
      v-if="title !== 'Model'"
      class="px-2.5 py-1.5 text-meta font-semibold text-muted"
    >
      {{ title }}
    </div>
    <template v-for="item in items" :key="item.heading || item.label">
      <div
        v-if="item.heading"
        role="presentation"
        class="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold text-muted"
      >
        {{ item.heading }}
      </div>
      <button
        v-else
        type="button"
        role="option"
        :aria-selected="selected === item.label"
        :class="selected === item.label ? 'bg-tint' : 'hover:bg-hover'"
        class="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left"
        @click="onSelect(item)"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-ui font-medium">{{ item.label }}</span>
          <span class="block text-meta text-muted"
            >{{ item.description
            }}{{
              title === "Automation" && selected === item.label
                ? " · click again to turn off"
                : ""
            }}</span
          >
        </span>
        <ChatIcon
          v-if="selected === item.label"
          name="check"
          class="size-4 text-primary"
        />
      </button>
    </template>
  </div>
</template>

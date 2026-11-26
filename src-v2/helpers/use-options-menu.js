import { nextTick, onMounted, onUnmounted, ref } from "vue";

export default function useOptionsMenu() {
  const open = ref(false);
  const area = ref(null);
  const trigger = ref(null);
  const panel = ref(null);
  const closeMethod = (restore = true) => {
    open.value = false;
    if (restore) trigger.value?.focus();
  };
  const toggleMethod = async () => {
    if (open.value) return closeMethod();
    open.value = true;
    await nextTick();
    panel.value?.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
  };
  const outsideMethod = (event) => {
    if (open.value && !area.value?.contains(event.target)) closeMethod(false);
  };
  const blurMethod = (event) => {
    if (event.relatedTarget && !area.value.contains(event.relatedTarget))
      closeMethod(false);
  };
  const keyMethod = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMethod();
      return;
    }
    const items = [
      ...panel.value.querySelectorAll('[role="menuitem"]:not(:disabled)'),
    ];
    const current = items.indexOf(document.activeElement);
    const next =
      event.key === "ArrowDown"
        ? (current + 1) % items.length
        : event.key === "ArrowUp"
          ? (current - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  };
  onMounted(() => document.addEventListener("pointerdown", outsideMethod));
  onUnmounted(() => document.removeEventListener("pointerdown", outsideMethod));
  return {
    open,
    area,
    trigger,
    panel,
    closeMethod,
    toggleMethod,
    blurMethod,
    keyMethod,
  };
}

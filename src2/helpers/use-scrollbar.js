import { onUnmounted, ref } from "vue";

export default function useScrollbar() {
  const isScrolling = ref(false);
  let scrollTimer;

  const scrollMethod = () => {
    isScrolling.value = true;
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      isScrolling.value = false;
    }, 900);
  };

  onUnmounted(() => window.clearTimeout(scrollTimer));

  return { isScrolling, scrollMethod };
}

import { onUnmounted, ref, watch } from "vue";

// Markdown resolves asynchronously, after the message watcher has already scrolled.
export default function useChatAutoscroll(scroller, pinned) {
  const content = ref(null);
  let observer;
  watch(
    content,
    (element) => {
      observer?.disconnect();
      if (!element) return;
      observer = new ResizeObserver(() => {
        if (pinned.value && scroller.value)
          scroller.value.scrollTop = scroller.value.scrollHeight;
      });
      observer.observe(element);
    },
    { flush: "post" },
  );
  onUnmounted(() => observer?.disconnect());
  return content;
}

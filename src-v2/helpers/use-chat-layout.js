import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  clampDockedWidth,
  clampFloatingBounds,
  initialFloatingBounds,
  resizeFloatingBounds,
} from "./chat-layout.js";

export default function useChatLayout(container, mobileView) {
  const docked = ref(false);
  const narrow = ref(false);
  const dockedWidth = ref(420);
  const containerWidth = ref(window.innerWidth);
  const containerHeight = ref(window.innerHeight);
  const customBounds = ref(null);
  const bounds = computed(() =>
    customBounds.value
      ? clampFloatingBounds(
          customBounds.value,
          containerWidth.value,
          containerHeight.value,
        )
      : initialFloatingBounds(containerWidth.value, containerHeight.value),
  );
  const dragging = ref(false);
  const mode = computed(() =>
    narrow.value ? "mobile" : docked.value ? "docked" : "floating",
  );
  const style = computed(() =>
    mode.value === "floating"
      ? {
          left: `${bounds.value.x}px`,
          top: `${bounds.value.y}px`,
          width: `${bounds.value.w}px`,
          height: `${bounds.value.h}px`,
        }
      : mode.value === "docked"
        ? { width: `${dockedWidth.value}px` }
        : {},
  );
  let stopPointer = () => {};

  const measureMethod = () => {
    if (container.value) {
      containerWidth.value = container.value.clientWidth;
      containerHeight.value = container.value.clientHeight;
    }
    narrow.value = window.innerWidth < 860;
    dockedWidth.value = clampDockedWidth(
      dockedWidth.value,
      containerWidth.value,
    );
    stopPointer();
  };
  const resetMethod = () => {
    stopPointer();
    docked.value = false;
    if (mobileView) mobileView.value = "chat";
    customBounds.value = null;
  };
  const startPointerMethod = (event, move) => {
    if (event.button !== 0 || dragging.value) return;
    event.preventDefault();
    const target = event.currentTarget;
    const id = event.pointerId;
    target.setPointerCapture(id);
    dragging.value = true;
    const moveMethod = (next) => {
      if (next.pointerId === id) move(next);
    };
    const endMethod = (next) => {
      if (next.pointerId === id) stopPointer();
    };
    stopPointer = () => {
      target.removeEventListener("pointermove", moveMethod);
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        target.removeEventListener(name, endMethod);
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
      dragging.value = false;
      stopPointer = () => {};
    };
    target.addEventListener("pointermove", moveMethod);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      target.addEventListener(name, endMethod);
  };
  const startDragMethod = (event) => {
    const start = { ...bounds.value };
    const x = event.clientX,
      y = event.clientY;
    startPointerMethod(event, (next) => {
      customBounds.value = clampFloatingBounds(
        {
          ...start,
          x: start.x + next.clientX - x,
          y: start.y + next.clientY - y,
        },
        containerWidth.value,
        containerHeight.value,
      );
    });
  };
  const startResizeMethod = (direction, event) => {
    const start = { ...bounds.value };
    const x = event.clientX,
      y = event.clientY;
    startPointerMethod(event, (next) => {
      customBounds.value = resizeFloatingBounds(
        start,
        direction,
        next.clientX - x,
        next.clientY - y,
        containerWidth.value,
        containerHeight.value,
      );
    });
  };
  const startDockedResizeMethod = (event) => {
    const x = event.clientX,
      width = dockedWidth.value;
    startPointerMethod(event, (next) => {
      dockedWidth.value = clampDockedWidth(
        width + next.clientX - x,
        containerWidth.value,
      );
    });
  };
  const dockedKeyMethod = (event) => {
    const widths = {
      ArrowLeft: dockedWidth.value - 16,
      ArrowRight: dockedWidth.value + 16,
      Home: 320,
      End: Math.max(320, containerWidth.value - 380),
      Enter: 420,
    };
    if (widths[event.key] === undefined) return;
    event.preventDefault();
    dockedWidth.value = clampDockedWidth(
      widths[event.key],
      containerWidth.value,
    );
  };
  const toggleDockMethod = async (value) => {
    stopPointer();
    if (narrow.value && mobileView) mobileView.value = value ? "chat" : "files";
    else docked.value = value;
    await nextTick();
    container.value?.querySelector("[data-chat-mode-button]")?.focus();
  };
  watch(
    container,
    (element, previous, onCleanup) => {
      if (!element) return;
      measureMethod();
      const observer = new ResizeObserver(measureMethod);
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    },
    { flush: "post" },
  );
  onMounted(() => {
    resetMethod();
    measureMethod();
    window.addEventListener("resize", measureMethod);
  });
  onUnmounted(() => {
    stopPointer();
    window.removeEventListener("resize", measureMethod);
  });
  return {
    mode,
    style,
    bounds,
    narrow,
    dockedWidth,
    containerWidth,
    dragging,
    resetMethod,
    startDragMethod,
    startResizeMethod,
    startDockedResizeMethod,
    dockedKeyMethod,
    toggleDockMethod,
  };
}

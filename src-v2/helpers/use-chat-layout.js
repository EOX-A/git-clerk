import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  clampDockedWidth,
  clampFloatingBounds,
  resizeFloatingBounds,
} from "./chat-layout.js";

export default function useChatLayout(container, mobileView) {
  const docked = ref(false);
  const narrow = ref(false);
  const dockedWidth = ref(420);
  const containerWidth = ref(0);
  const bounds = ref({ x: 0, y: 70, w: 480, h: 600 });
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
  let observer;
  let stopPointer = () => {};

  const measureMethod = () => {
    containerWidth.value = container.value?.clientWidth || window.innerWidth;
    narrow.value = window.innerWidth < 860;
    dockedWidth.value = clampDockedWidth(
      dockedWidth.value,
      containerWidth.value,
    );
    bounds.value = clampFloatingBounds(
      bounds.value,
      window.innerWidth,
      window.innerHeight,
    );
    stopPointer();
  };
  const resetMethod = () => {
    stopPointer();
    docked.value = false;
    if (mobileView) mobileView.value = "chat";
    const w = Math.min(480, window.innerWidth - 32);
    const h = Math.min(640, window.innerHeight - 94);
    bounds.value = clampFloatingBounds(
      { x: window.innerWidth - w - 24, y: window.innerHeight - h - 24, w, h },
      window.innerWidth,
      window.innerHeight,
    );
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
      bounds.value = clampFloatingBounds(
        {
          ...start,
          x: start.x + next.clientX - x,
          y: start.y + next.clientY - y,
        },
        window.innerWidth,
        window.innerHeight,
      );
    });
  };
  const startResizeMethod = (direction, event) => {
    const start = { ...bounds.value };
    const x = event.clientX,
      y = event.clientY;
    startPointerMethod(event, (next) => {
      bounds.value = resizeFloatingBounds(
        start,
        direction,
        next.clientX - x,
        next.clientY - y,
        window.innerWidth,
        window.innerHeight,
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
    docked.value = value;
    await nextTick();
    container.value?.querySelector("[data-chat-mode-button]")?.focus();
  };
  onMounted(() => {
    resetMethod();
    measureMethod();
    observer = new ResizeObserver(measureMethod);
    observer.observe(container.value);
    window.addEventListener("resize", measureMethod);
  });
  onUnmounted(() => {
    stopPointer();
    observer?.disconnect();
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

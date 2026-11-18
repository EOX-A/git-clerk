<template>
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    class="chat-activity size-5 shrink-0 text-primary"
    fill="currentColor"
  >
    <!-- Staggered bars form a quiet wave without moving the surrounding text. -->
    <rect
      v-for="bar in 3"
      :key="bar"
      :x="4 + (bar - 1) * 6"
      y="4"
      width="4"
      height="16"
      rx="2"
      class="chat-activity-bar"
      :style="{ animationDelay: `${(bar - 1) * -0.16}s` }"
    />
  </svg>
</template>

<style scoped>
.chat-activity-bar {
  transform-origin: 12px 12px;
  transform: scaleY(0.5);
  animation: chat-activity-wave 1.2s ease-in-out infinite;
}
@keyframes chat-activity-wave {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .chat-activity-bar {
    animation: none;
  }
}
</style>

<script setup>
defineProps({ rows: { type: Number, default: 6 } });
</script>

<template>
  <div aria-hidden="true" class="space-y-px">
    <div v-for="row in rows" :key="row" class="flex gap-2.5 px-2.5 py-2">
      <span class="session-placeholder mt-0.5 size-4 shrink-0 rounded"></span>
      <div class="min-w-0 flex-1">
        <span
          :class="row % 3 === 0 ? 'w-2/3' : row % 2 === 0 ? 'w-full' : 'w-4/5'"
          class="session-placeholder mt-1 block h-3.5 rounded"
        ></span>
        <span class="session-placeholder mt-2 block h-2.5 w-3/5 rounded"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-placeholder {
  position: relative;
  overflow: hidden;
  background: var(--border-soft);
}

.session-placeholder::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--elev) 65%, transparent),
    transparent
  );
  transform: translateX(-100%);
  animation: session-shimmer 1.4s ease-in-out infinite;
}

@keyframes session-shimmer {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .session-placeholder::after {
    animation: none;
    display: none;
  }
}
</style>

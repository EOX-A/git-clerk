<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="size-[18px] shrink-0"
  >
    <path v-if="name === 'plus'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'bolt'" d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />
    <g v-else-if="name === 'model'">
      <path
        d="M12 3.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"
      />
      <path d="M19 17v4M17 19h4" />
    </g>
    <path v-else-if="name === 'check'" d="m5 12.5 4.5 4.5L19 7.5" />
    <path v-else-if="name === 'x'" d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    <g v-else-if="name === 'file'">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </g>
    <path
      v-else-if="name === 'send'"
      d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
      stroke-width="2"
    />
    <path v-else-if="name === 'chev-down'" d="m6 9 6 6 6-6" />
    <path
      v-else-if="name === 'repo'"
      d="M5 19.5v-14A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5zm0 0A2.5 2.5 0 0 0 7.5 22H19v-5"
    />
  </svg>
</template>

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
    <g v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </g>
    <path v-else-if="name === 'x'" d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    <g v-else-if="name === 'file'">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </g>
    <g v-else-if="name === 'file-plus'">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11.5v6M9 14.5h6" />
    </g>
    <g v-else-if="name === 'file-diff'">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 10.5v4M10 12.5h4M10 17h4" />
    </g>
    <path
      v-else-if="name === 'send'"
      d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
      stroke-width="2"
    />
    <path v-else-if="name === 'chev-down'" d="m6 9 6 6 6-6" />
    <path v-else-if="name === 'chev-right'" d="m9 6 6 6-6 6" />
    <path
      v-else-if="name === 'repo'"
      d="M5 19.5v-14A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5zm0 0A2.5 2.5 0 0 0 7.5 22H19v-5"
    />
    <path
      v-else-if="name === 'collapse'"
      d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"
    />
    <g v-else-if="name === 'pip'">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <rect
        x="12"
        y="11"
        width="6"
        height="5"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    </g>
    <path v-else-if="name === 'diff'" d="M12 4v8M8 8h8M8 18h8" />
    <g v-else-if="name === 'grip'">
      <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="name === 'mic'">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </g>
    <rect
      v-else-if="name === 'stop'"
      x="7"
      y="7"
      width="10"
      height="10"
      rx="2"
      fill="currentColor"
      stroke="none"
    />
    <g v-else-if="name === 'files'">
      <path d="M9 7V5a2 2 0 0 1 2-2h5l4 4v9a2 2 0 0 1-2 2h-2" />
      <path
        d="M4 9a2 2 0 0 1 2-2h4.5L15 11.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
      />
    </g>
  </svg>
</template>

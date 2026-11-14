<script setup>
defineProps({ name: { type: String, default: "file" } });
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
    class="size-4 shrink-0"
  >
    <path v-if="name === 'close'" d="m6 6 12 12M18 6 6 18" />
    <path v-else-if="name === 'chevron'" d="m9 5 7 7-7 7" />
    <path
      v-else-if="name === 'folder'"
      d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
    />
    <g v-else-if="name === 'branch'">
      <circle cx="6" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M6 8v8M18 8a11 11 0 0 1-9 11" />
    </g>
    <g v-else>
      <path
        d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8zM14 2v6h6"
      />
      <path
        v-if="name === 'file-plus' || name === 'file-diff'"
        d="M9 12h6m-3-3v6"
      />
      <path
        v-if="name === 'file-minus' || name === 'file-diff'"
        :d="name === 'file-diff' ? 'M9 18h6' : 'M9 14h6'"
      />
    </g>
  </svg>
</template>

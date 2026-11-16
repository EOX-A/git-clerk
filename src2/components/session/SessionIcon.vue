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
    <g
      v-if="
        name === 'pr-open' ||
        name === 'pr-draft' ||
        name === 'pr-closed' ||
        name === 'merge'
      "
    >
      <circle cx="6" cy="5.5" r="2.5" />
      <circle cx="6" cy="18.5" r="2.5" />
      <path d="M6 8v8" />
      <template v-if="name === 'merge'">
        <circle cx="18" cy="13" r="2.5" />
        <path d="M6 8c0 3.5 3 5 9.5 5" />
      </template>
      <template v-else>
        <circle cx="18" cy="18.5" r="2.5" />
        <template v-if="name === 'pr-open'">
          <path d="M18 16V9.5A3.5 3.5 0 0 0 14.5 6H11M13.5 3.5 11 6l2.5 2.5" />
        </template>
        <template v-else-if="name === 'pr-draft'">
          <circle cx="18" cy="5.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="11" r="1" fill="currentColor" stroke="none" />
        </template>
        <path v-else d="M18 11v5m-2.5-12.5 5 5m0-5-5 5" />
      </template>
    </g>
    <path
      v-else-if="name === 'repo'"
      d="M5 19.5v-14A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5zm0 0A2.5 2.5 0 0 0 7.5 22H19v-5"
    />
    <g v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
    <g v-else-if="name === 'copy'">
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </g>
    <g v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </g>
    <g v-else-if="name === 'alert'">
      <path d="m12 3 10 18H2zM12 9v4" />
      <circle cx="12" cy="17" r=".75" fill="currentColor" />
    </g>
    <g v-else-if="name === 'dots'">
      <circle
        v-for="y in [5, 12, 19]"
        :key="y"
        cx="12"
        :cy="y"
        r="1.5"
        fill="currentColor"
        stroke="none"
      />
    </g>
    <g v-else-if="name === 'dots-h'">
      <circle
        v-for="x in [5, 12, 19]"
        :key="x"
        :cx="x"
        cy="12"
        r="1.5"
        fill="currentColor"
        stroke="none"
      />
    </g>
    <path v-else-if="name === 'menu'" d="M4 7h16M4 12h16M4 17h16" />
    <path v-else-if="name === 'edit'" d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5" />
    <g v-else-if="name === 'external'">
      <path
        d="M14 3h7v7M21 3 10 14M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"
      />
    </g>
    <path
      v-else-if="name === 'trash'"
      d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"
    />
  </svg>
</template>

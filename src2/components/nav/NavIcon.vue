<script setup>
defineProps({
  name: { type: String, required: true },
});
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
    <g v-if="name === 'panel'">
      <rect x="3" y="4" width="18" height="16" rx="2.5"></rect>
      <path d="M9 4v16"></path>
    </g>
    <g v-else-if="name === 'new'">
      <path
        d="M11 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V13"
      ></path>
      <path d="M18.4 3.6a2 2 0 0 1 2.9 2.9L12.5 15.3 9 16l.7-3.5z"></path>
    </g>
    <g v-else-if="name === 'branch'">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <circle cx="6" cy="18.5" r="2.5"></circle>
      <circle cx="18" cy="7" r="2.5"></circle>
      <path d="M6 8v8"></path>
      <path d="M18 9.5a6 6 0 0 1-6 6H6.5"></path>
    </g>
    <g v-else-if="name === 'sliders'">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9"></path>
      <circle cx="15" cy="7" r="2"></circle>
      <circle cx="9" cy="17" r="2"></circle>
    </g>
    <g v-else-if="name === 'chev-down'"><path d="m6 9 6 6 6-6"></path></g>
    <g v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4"></circle>
      <path
        d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"
      ></path>
    </g>
    <g v-else-if="name === 'moon'">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"></path>
    </g>
    <g v-else-if="name === 'menu'"><path d="M4 7h16M4 12h16M4 17h16"></path></g>
    <g v-else-if="name === 'x'">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path>
    </g>
    <g v-else-if="name === 'pr-draft'">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <circle cx="6" cy="18.5" r="2.5"></circle>
      <circle cx="18" cy="18.5" r="2.5"></circle>
      <path d="M6 8v8"></path>
      <circle
        cx="18"
        cy="5.5"
        r="1"
        style="fill: currentColor; stroke: none"
      ></circle>
      <circle
        cx="18"
        cy="11"
        r="1"
        style="fill: currentColor; stroke: none"
      ></circle>
    </g>
    <g v-else-if="name === 'pr-open'">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <circle cx="6" cy="18.5" r="2.5"></circle>
      <circle cx="18" cy="18.5" r="2.5"></circle>
      <path d="M6 8v8"></path>
      <path d="M18 16V9.5A3.5 3.5 0 0 0 14.5 6H11"></path>
      <path d="M13.5 3.5 11 6l2.5 2.5"></path>
    </g>
    <g v-else-if="name === 'merge'">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <circle cx="6" cy="18.5" r="2.5"></circle>
      <circle cx="18" cy="13" r="2.5"></circle>
      <path d="M6 8v8"></path>
      <path d="M6 8c0 3.5 3 5 9.5 5"></path>
    </g>
    <g v-else-if="name === 'pr-closed'">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <circle cx="6" cy="18.5" r="2.5"></circle>
      <circle cx="18" cy="18.5" r="2.5"></circle>
      <path d="M6 8v8"></path>
      <path d="M18 11v5"></path>
      <path d="m15.5 3.5 5 5M20.5 3.5l-5 5"></path>
    </g>
    <g v-else-if="name === 'check'"><path d="m5 12.5 4.5 4.5L19 7.5"></path></g>
    <g v-else-if="name === 'org'">
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"></path>
      <path d="M15 9h3a2 2 0 0 1 2 2v10"></path>
      <path d="M3 21h18M8 7.5h3M8 11.5h3M8 15.5h3"></path>
    </g>
    <g v-else-if="name === 'repo'">
      <path
        d="M5 19.5v-14A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5zm0 0A2.5 2.5 0 0 0 7.5 22H19v-5"
      ></path>
    </g>
    <g v-else-if="name === 'chev-right'"><path d="m9 6 6 6-6 6"></path></g>
  </svg>
</template>

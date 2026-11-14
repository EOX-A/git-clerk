<script setup>
import ChatComposer from "@/components/ChatComposer.vue";
</script>

<template>
  <section
    aria-labelledby="new-session-heading"
    class="flex min-h-full flex-col px-4 py-8 sm:px-6"
  >
    <div class="m-auto flex w-full max-w-[680px] flex-col gap-3">
      <h1
        id="new-session-heading"
        class="mb-4 text-center text-heading font-semibold text-balance"
      >
        What would you like to change?
      </h1>
      <ChatComposer />
    </div>
  </section>
</template>

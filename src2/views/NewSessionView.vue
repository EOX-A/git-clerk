<script setup>
import { ref } from "vue";
import { CreateSessionDialog } from "@/components/session";
import { ChatComposer } from "@/components/chat";
const createSessionOpen = ref(false);
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
      <p class="text-center text-ui text-muted">
        Want to manually create session without AI?
        <button
          type="button"
          class="rounded-sm font-medium text-primary underline-offset-4 hover:underline"
          @click="createSessionOpen = true"
        >
          Create Session
        </button>
      </p>
    </div>
    <CreateSessionDialog
      v-if="createSessionOpen"
      :on-close="() => (createSessionOpen = false)"
    />
  </section>
</template>

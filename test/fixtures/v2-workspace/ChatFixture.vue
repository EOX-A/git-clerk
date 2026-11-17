<script setup>
import App from "../../../src2/App.vue";
import installCreationFixture from "./create-session.js";
import { useRouter } from "vue-router";
const controls = installCreationFixture({ chat: true });
const router = useRouter();
const refresh = () => window.dispatchEvent(new Event("focus"));
</script>
<template>
  <div
    style="
      position: fixed;
      bottom: 4px;
      left: 4px;
      z-index: 100;
      background: white;
      border: 1px solid #ccd4dc;
      padding: 4px;
      display: flex;
      gap: 8px;
      font-size: 12px;
    "
    class="fixed bottom-1 left-1 z-[60] flex gap-2 rounded border bg-elev p-1 text-xs"
  >
    <button @click="refresh">Refresh metadata</button>
    <button
      @click="
        controls.toggleClosed();
        refresh();
      "
    >
      Toggle closed
    </button>
    <button
      @click="
        router.push(
          router.currentRoute.value.params.sessionNumber === '7' ? '/8' : '/7',
        )
      "
    >
      Other session
    </button>
  </div>
  <App />
</template>

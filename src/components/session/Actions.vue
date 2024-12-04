<script setup>
import { defineProps } from "vue";
import {
  GithubSession,
  ReviewSession,
  DeleteSession,
} from "@/components/session";

const props = defineProps({
  session: Object,
  callBack: Function,
});
</script>

<template>
  <GithubSession :url="session.html_url" />
  <ReviewSession :session="session" :callBack="callBack" />
  <DeleteSession :session="session" :callBack="callBack" />
</template>

<script setup>
import { defineProps } from "vue";
import {
  GithubSession,
  ReviewSession,
  DeleteSession,
} from "@/components/session";

const props = defineProps({
  session: Object,
  snackbar: Object,
  callBack: Function,
});
</script>

<template>
  <GithubSession :url="session.html_url" />
  <ReviewSession :session="session" :snackbar="snackbar" :callBack="callBack" />
  <DeleteSession :session="session" :snackbar="snackbar" :callBack="callBack" />
</template>

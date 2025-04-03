<script setup>
import {
  DeleteSession,
  RenameSession,
  GithubSession,
} from "@/components/session/index.js";
import { defineProps } from "vue";

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  updateDetails: Function,
});
</script>

<template>
  <GithubSession :url="props.session.html_url" tab size="x-large" />
  <DeleteSession
    tab
    size="x-large"
    :session="props.session"
    :callBack="props.updateDetails"
  />
  <RenameSession
    tab
    size="x-large"
    :session="props.session"
    :callBack="props.updateDetails"
  />
</template>

<script setup>
import {
  DeleteSession,
  ReviewSession,
  GithubSession,
  RenameSession,
} from "@/components/session/index.js";
import { defineProps, inject } from "vue";
import OctIcon from "@/components/global/OctIcon.vue";

const snackbar = inject("set-snackbar");

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  updateDetails: Function,
});
</script>

<template>
  <div
    v-if="session"
    class="bg-surface-light px-0 px-sm-5 py-4 d-flex align-center ga-1 action-tab position-relative"
    :class="{ 'flex-row-reverse': $vuetify?.display?.smAndDown }"
  >
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
    <v-divider
      v-if="props.session.state !== 'closed'"
      inset
      vertical
      class="d-none d-sm-flex"
    ></v-divider>
    <v-btn
      v-if="!props.session.draft && props.session.state !== 'closed'"
      target="_blank"
      color="primary"
      prepend-icon="mdi-dots-horizontal-circle-outline"
      size="x-large"
      variant="flat"
      text="Pending Review"
      class="ml-5 d-none d-sm-flex"
      disabled
    ></v-btn>
    <ReviewSession
      v-else-if="
        props.session.draft &&
        props.session.check &&
        props.session.state !== 'closed'
      "
      tab
      text="Submit for Review"
      size="x-large"
      color="blue-grey-lighten-4"
      variant="flat"
      :session="props.session"
      :callBack="props.updateDetails"
      class="ml-5"
    />
    <v-spacer></v-spacer>
    <v-chip
      class="mx-5 pl-5 session-icon ga-2"
      size="large"
      label
      :color="session.status.color"
      variant="tonal"
    >
      <OctIcon
        :name="session.status.icon"
        :class="`v-icon--start text-${session.status.color}`"
      />
      <span
        :class="`text-${session.status.color} text-capitalize font-weight-bold`"
        >{{ session.status.state }}</span
      >
    </v-chip>
  </div>
</template>

<style>
.action-tab .v-btn__content {
  font-size: 16px;
}
.action-tab .v-btn--disabled.v-btn--variant-flat .v-btn__overlay {
  opacity: 0;
}
.action-tab .v-btn__prepend {
  font-size: 20px;
  margin-inline-end: 6px;
}
.session-icon {
  height: 40px;
  line-height: 0px;
}
</style>

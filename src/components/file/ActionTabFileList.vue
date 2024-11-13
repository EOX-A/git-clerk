<script setup>
import { DeleteSession, ReviewSession } from "@/components/session/index.js";
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
    class="bg-secondary px-5 py-4 d-flex align-center ga-1 action-tab"
  >
    <v-btn
      :href="props.session.html_url"
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-github"
      size="x-large"
      variant="text"
      text="Github"
      class="text-capitalize font-weight-medium"
    ></v-btn>
    <DeleteSession
      text="Delete Session"
      size="x-large"
      :session="props.session"
      :snackbar="snackbar"
      :callBack="props.updateDetails"
    />
    <v-btn
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-monitor-eye"
      size="x-large"
      variant="text"
      text="Preview"
      class="text-capitalize font-weight-medium"
      disabled
    ></v-btn>
    <v-divider
      v-if="props.session.state !== 'closed'"
      inset
      vertical
    ></v-divider>
    <v-btn
      v-if="!props.session.draft && props.session.state !== 'closed'"
      target="_blank"
      color="primary"
      prepend-icon="mdi-dots-horizontal-circle-outline"
      size="x-large"
      variant="flat"
      text="Pending Review"
      class="text-capitalize font-weight-medium ml-5"
      disabled
    ></v-btn>
    <ReviewSession
      v-else-if="
        props.session.draft &&
        props.session.check &&
        props.session.state !== 'closed'
      "
      text="Submit for Review"
      size="x-large"
      color="blue-grey-lighten-4"
      variant="flat"
      :session="props.session"
      :snackbar="snackbar"
      :callBack="props.updateDetails"
      class="ml-5"
    />
    <v-spacer></v-spacer>
    <div
      :class="`px-4 mx-5  session-icon d-flex align-center justify-center bg-${session.status.color} rounded-pill ga-2`"
    >
      <OctIcon :name="session.status.icon" />
      <span class="text-capitalize font-weight-bold">{{
        session.status.state
      }}</span>
    </div>
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

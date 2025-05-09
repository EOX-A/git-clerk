<script setup>
import {
  ReviewSession,
  DeployedPreview,
  ActionSessions,
} from "@/components/session/index.js";
import { defineProps } from "vue";
import OctIcon from "@/components/global/OctIcon.vue";
import ActionTab from "@/components/global/ActionTab.vue";
const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  updateDetails: Function,
});
</script>

<template>
  <ActionTab v-if="session">
    <v-menu :close-on-content-click="false">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          prepend-icon="mdi-dots-vertical"
          append-icon="mdi-chevron-down"
          variant="text"
          size="x-large"
          text="Session"
          color="blue-grey-darken-4"
          id="session-action-menu"
        ></v-btn>
      </template>
      <v-list class="pa-0">
        <ActionSessions
          :session="props.session"
          :callBack="props.updateDetails"
        />
      </v-list>
    </v-menu>
    <v-divider inset vertical></v-divider>
    <v-btn
      v-if="!props.session.draft && props.session.state !== 'closed'"
      target="_blank"
      color="primary"
      :icon="
        $vuetify.display.mdAndUp ? false : 'mdi-dots-horizontal-circle-outline'
      "
      prepend-icon="mdi-dots-horizontal-circle-outline"
      size="x-large"
      variant="flat"
      text="Pending Review"
      class="ml-5 d-none d-sm-flex"
      disabled
    ></v-btn>
    <ReviewSession
      v-else-if="props.session.draft && props.session.check"
      tab
      text="Submit for Review"
      size="x-large"
      color="blue-grey-lighten-4"
      variant="flat"
      :session="props.session"
      :callBack="props.updateDetails"
      class="ml-5"
    />
    <DeployedPreview
      v-if="props.session.deployedPreviewLink"
      :session="props.session"
      :state="props.session.state"
      tab
      size="x-large"
    />
    <v-spacer></v-spacer>
    <v-chip
      class="mx-5 pl-5 session-icon ga-2 d-sm-flex d-none"
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
  </ActionTab>
</template>

<style>
.session-icon {
  height: 40px;
  line-height: 0px;
}
</style>

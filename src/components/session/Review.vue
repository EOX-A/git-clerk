<script setup>
import { defineProps, inject, ref } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";
import { useLoader } from "@/helpers/index.js";
import { reviewBySessionNumber } from "@/api/index.js";

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  size: {
    type: String,
    default: "large",
  },
  color: {
    type: String,
    default: "blue-grey-darken-4",
  },
  class: {
    type: String,
    default: "",
  },
  text: {
    type: String,
    default: "",
  },
  variant: {
    type: String,
    default: "text",
  },
  callBack: Function,
});
const snackbar = inject("set-snackbar");
const reviewSession = ref(false);

const error =
  props.text && props.session.draft && props.session.check?.success === false;

const reviewSessionHandle = async () => {
  if (reviewSession.value) {
    const loader = useLoader().show();
    snackbar.value = await reviewBySessionNumber(
      reviewSession.value.number,
      reviewSession.value.node_id,
    );
    reviewSession.value = false;
    loader.hide();
    await props.callBack();
  }
};
</script>

<template>
  <Tooltip
    :text="
      error
        ? `${props.session.check.tooltip}: Cannot request for review`
        : `Request Review`
    "
  >
    <v-btn
      :color="props.color"
      :icon="props.text ? false : 'mdi-file-document-edit'"
      prepend-icon="mdi-file-document-edit"
      :size="props.size"
      :text="props.text"
      :variant="props.variant"
      :disabled="
        !props.session.draft ||
        props.session.state === 'closed' ||
        !props.session.check ||
        !props.session.check.success
      "
      @click="reviewSession = props.session"
      :class="`text-capitalize font-weight-medium ${props.class}`"
    >
      <template v-if="error" v-slot:append>
        <v-icon
          :color="props.session.check.color"
          :icon="props.session.check.icon.replace('-outline', '')"
        ></v-icon>
      </template>
    </v-btn>
  </Tooltip>

  <v-dialog v-model="reviewSession" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-alert"
      title="Request Review Session"
    >
      <template v-slot:text>
        Are you sure you want to request this session for review:
        <strong>{{ reviewSession.title }}</strong>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn @click="reviewSession = false"> Cancel </v-btn>
        <v-btn color="success" variant="flat" @click="reviewSessionHandle">
          Request
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<style>
.action-tab .v-btn--disabled.v-btn--variant-flat .v-btn__prepend,
.action-tab .v-btn--disabled.v-btn--variant-flat .v-btn__content {
  opacity: 0.5 !important;
}
</style>

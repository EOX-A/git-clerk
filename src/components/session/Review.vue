<script setup>
import { defineProps, inject, ref } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";
import { useLoader } from "@/helpers/index.js";
import { reviewBySessionNumber } from "@/api/index.js";
import { watch } from "vue";

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
    default: "Submit for Review",
  },
  variant: {
    type: String,
    default: "text",
  },
  callBack: Function,
  tab: {
    type: Boolean,
    default: false,
  },
  tooltip: {
    type: String,
    default: "Request Review",
  },
});
const snackbar = inject("set-snackbar");
const reviewSession = ref(false);
const disabled = ref(checkDisableStatus(props));

const error =
  props.text && props.session.draft && props.session.check?.success === false;

const reviewSessionHandle = async () => {
  if (reviewSession.value) {
    const loader = useLoader().show();
    snackbar.value = await reviewBySessionNumber(
      reviewSession.value.number,
      reviewSession.value.node_id || reviewSession.value.id,
    );
    reviewSession.value = false;
    loader.hide();
    await props.callBack();
  }
};

/**
 *
 * @param newProps
 */
function checkDisableStatus(newProps) {
  if (!newProps.session || newProps.session.changed_files === 0) return true;
  return (
    !newProps.session.draft ||
    newProps.session.state === "closed" ||
    !newProps.session.check ||
    !newProps.session.check.success
  );
}

watch([props], ([newProps]) => {
  disabled.value = checkDisableStatus(newProps);
});
</script>

<template>
  <Tooltip
    v-if="props.tab"
    :text="
      error
        ? `${props.session.check.tooltip}: Cannot request for review`
        : props.tooltip
    "
  >
    <v-btn
      :color="props.color"
      :icon="$vuetify.display.mdAndUp ? false : 'mdi-file-document-edit'"
      prepend-icon="mdi-file-document-edit"
      :size="props.size"
      :text="props.text"
      :variant="props.variant"
      :disabled="disabled"
      :class="`text-capitalize font-weight-medium ${props.class}`"
      @click="reviewSession = props.session"
    >
      <template v-if="error" #append>
        <v-icon
          :color="props.session.check.color"
          :icon="props.session.check.icon.replace('-outline', '')"
        ></v-icon>
      </template>
    </v-btn>
  </Tooltip>

  <!-- Tab = false -->
  <!-- Mobile -->
  <v-list-item
    v-if="!props.tab"
    prepend-icon="mdi-file-document-edit"
    :title="props.text"
    :disabled="disabled"
    class="d-flex d-sm-none"
    @click="reviewSession = props.session"
  ></v-list-item>
  <!-- Non-mobile -->
  <Tooltip :text="props.tooltip">
    <v-btn
      v-if="!props.tab"
      color="blue-grey-darken-4"
      icon="mdi-file-document-edit"
      :size="props.size"
      variant="text"
      :disabled="disabled"
      class="d-none d-sm-flex"
      @click="reviewSession = props.session"
    ></v-btn>
  </Tooltip>

  <v-dialog v-model="reviewSession" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-alert"
      title="Request Review Session"
    >
      <template #text>
        <p class="mt-8">
          Are you sure you want to request this session for review:
          <strong>{{ reviewSession.title }}</strong>
        </p>
      </template>
      <template #actions>
        <v-spacer></v-spacer>
        <v-btn size="large" @click="reviewSession = false"> Cancel </v-btn>
        <v-btn
          size="large"
          color="success"
          variant="flat"
          @click="reviewSessionHandle"
        >
          Request
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

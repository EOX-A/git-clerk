<script setup>
import { defineProps, ref, watch } from "vue";

const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  session: {
    type: Object,
    default: {},
  },
  state: {
    type: String,
    default: "open",
  },
  tab: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "large",
  },
  text: {
    type: String,
    default: "Deployed Preview",
  },
  tooltip: {
    type: String,
    default: "View deployed preview",
  },
});

const disabled = ref(checkDisableStatus(props));

function checkDisableStatus(newProps) {
  return Boolean(
    newProps.session.changed_files === 0 ||
      newProps.session.commits < 2 ||
      !newProps.session.deployedPreviewLink ||
      newProps.state === "closed",
  );
}

watch([props], ([newProps]) => {
  disabled.value = checkDisableStatus(newProps);
});
</script>

<template>
  <!-- Mobile -->
  <div :id="id">
    <v-btn
      v-if="tab"
      :href="session.deployedPreviewLink"
      target="_blank"
      color="blue-grey-darken-4"
      icon="mdi-arrow-top-right"
      :size="size"
      variant="outlined"
      class="d-flex d-md-none border-black border-md border-opacity-100"
      :disabled="disabled"
    ></v-btn>
    <!-- Non-mobile -->
    <v-btn
      v-if="tab"
      :href="session.deployedPreviewLink"
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-arrow-top-right"
      :size="size"
      :text="text"
      variant="outlined"
      class="text-capitalize font-weight-medium d-none d-md-flex border-black border-md border-opacity-100"
      :disabled="disabled"
    ></v-btn>
  </div>
</template>

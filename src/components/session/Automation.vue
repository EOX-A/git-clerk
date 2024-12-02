<script setup>
import { handleAutomationMethod } from "@/methods/session-view";
import { inject } from "vue";
const snackbar = inject("set-snackbar");

const props = defineProps({
  selectedAutomation: Object,
  automationDialog: Boolean,
  handleAutomationClose: Function,
  updateDetails: Function,
  session: Object,
});

const handleAutomationSubmit = async () => {
  const eoxJSONFormEle = document.getElementById("automation-form");
  const validate = eoxJSONFormEle.editor.validate();
  const value = eoxJSONFormEle.editor.getValue();
  await handleAutomationMethod(props, value, validate, snackbar);
};
</script>

<template>
  <!-- Automation Dialog -->

  <v-card v-if="props.selectedAutomation">
    <v-card-title class="text-h5 pa-4">
      {{ props.selectedAutomation.title }}
    </v-card-title>

    <v-card-text class="pa-4">
      <eox-jsonform
        id="automation-form"
        :schema="props.selectedAutomation.inputSchema"
      />
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-spacer></v-spacer>
      <v-btn
        color="grey-darken-1"
        variant="text"
        @click="props.handleAutomationClose"
      >
        Cancel
      </v-btn>
      <v-btn color="primary" variant="elevated" @click="handleAutomationSubmit">
        Submit
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

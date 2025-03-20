<script setup>
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";
import { initEOXJSONFormMethod } from "@/methods/file-edit-view";
import { handleAutomationMethod } from "@/methods/session-view";
import { inject, ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
const snackbar = inject("set-snackbar");
const route = useRoute();
const router = useRouter();

const props = defineProps({
  selectedAutomation: Object,
  automationDialog: Boolean,
  handleAutomationClose: Function,
  updateDetails: Function,
  session: Object,
});

const jsonFormInstance = ref(null);
const initValue = ref({});

const handleAutomationSubmit = async () => {
  const validate = jsonFormInstance.value.editor.validate();
  const value = jsonFormInstance.value.editor.getValue();
  await handleAutomationMethod(props, value, validate, router, snackbar);
};

onMounted(() => {
  if (route.query.automation && props.selectedAutomation.hidden) {
    initValue.value = Object.fromEntries(
      Object.entries(route.query).filter(([key]) => key !== "automation"),
    );
    setTimeout(() => {
      handleAutomationSubmit();
    }, 2000);
  }
  initEOXJSONFormMethod(jsonFormInstance);
});
</script>

<template>
  <v-card
    v-if="props.selectedAutomation"
    prepend-icon="mdi-auto-fix"
    :title="props.selectedAutomation.title"
  >
    <template v-slot:text>
      <eox-jsonform
        id="automation-form"
        :value="initValue"
        :schema="props.selectedAutomation.inputSchema"
        :customEditorInterfaces="Object.values(CUSTOM_EDITOR_INTERFACES)"
      />
    </template>

    <template v-slot:actions>
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
    </template>
  </v-card>
</template>

<style>
.v-card-item {
  background-color: rgb(var(--v-theme-surface-light), 1);
}
</style>

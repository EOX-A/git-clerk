<script setup>
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";
import { initEOXJSONFormMethod } from "@/methods/file-edit-view";
import { handleAutomationMethod } from "@/methods/session-view";
import { inject, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import useAutomationStore from "@/stores/automation";
import { storeToRefs } from "pinia";

const snackbar = inject("set-snackbar");
const router = useRouter();

const automationStore = useAutomationStore();
const { selectedAutomation, automation, externalAutomationData } =
  storeToRefs(automationStore);
const { handleAutomationClose, resetExternalAutomation } = automationStore;

const props = defineProps({
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
  if (automation.value && selectedAutomation.value.hidden) {
    initValue.value = Object.fromEntries(
      Object.entries(externalAutomationData.value).filter(
        ([key]) => key !== "automation",
      ),
    );
    setTimeout(() => {
      handleAutomationSubmit();
      resetExternalAutomation();
    }, 2000);
  }
  initEOXJSONFormMethod(jsonFormInstance);
});
</script>

<template>
  <v-card
    v-if="selectedAutomation"
    prepend-icon="mdi-auto-fix"
    :title="selectedAutomation.title"
  >
    <template v-slot:text>
      <eox-jsonform
        id="automation-form"
        :value="initValue"
        :schema="selectedAutomation.inputSchema"
        :customEditorInterfaces="Object.values(CUSTOM_EDITOR_INTERFACES)"
      />
    </template>

    <template v-slot:actions>
      <v-spacer></v-spacer>
      <v-btn
        color="grey-darken-1"
        variant="text"
        @click="handleAutomationClose"
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

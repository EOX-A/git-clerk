<script setup>
import { initEOXJSONFormMethod } from "@/methods/file-edit-view";
import { handleAutomationMethod } from "@/methods/session-view";
import { inject, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
const snackbar = inject("set-snackbar");
const router = useRouter();

const props = defineProps({
  selectedAutomation: Object,
  automationDialog: Boolean,
  handleAutomationClose: Function,
  updateDetails: Function,
  session: Object,
});

const jsonFormInstance = ref(null);

const handleAutomationSubmit = async () => {
  const validate = jsonFormInstance.value.editor.validate();
  const value = jsonFormInstance.value.editor.getValue();
  await handleAutomationMethod(props, value, validate, router, snackbar);
};

onMounted(() => {
  initEOXJSONFormMethod(
    jsonFormInstance,
    { value: true },
    { value: false },
    true,
  );
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
        :schema="props.selectedAutomation.inputSchema"
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
  background-color: #eef0f1;
}
</style>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  validationErrors: {
    type: Array,
    required: true,
  },
  closeValidationErrors: {
    type: Function,
    required: true,
  },
  saveFile: {
    type: Function,
    required: true,
  },
});

const validateBind = ref(true);
</script>

<template>
  <v-dialog
    v-model="validateBind"
    width="auto"
    @update:model-value="!$event && closeValidationErrors()"
  >
    <v-card class="rounded-lg">
      <template v-slot:text>
        <h2 class="text-center pl-3 pr-3">
          File contains incomplete or invalid fields.
        </h2>

        <v-alert
          class="my-6"
          text="There are issues in this file. You can fix the fields or continue saving with errors."
          title="Validation Issues Detected"
          type="warning"
          variant="tonal"
          icon="mdi-alert"
          rounded="lg"
        ></v-alert>
        <div class="d-flex ga-4">
          <div class="flex-grow-1">
            <v-btn
              variant="tonal"
              block
              color="primary"
              prepend-icon="mdi-arrow-left"
              @click="closeValidationErrors"
            >
              Back to Editing
            </v-btn>
          </div>
          <div class="flex-grow-1">
            <v-btn
              block
              color="primary"
              variant="flat"
              prepend-icon="mdi-alert"
              @click="saveFile"
            >
              Save Anyway
            </v-btn>
          </div>
        </div>
      </template>
    </v-card>
  </v-dialog>
</template>

<style>
.v-card {
  max-width: 480px !important;
}
.v-card-text {
  padding: 1.5rem !important;
}
</style>

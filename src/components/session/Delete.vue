<script setup>
import { defineProps, inject, ref } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";
import { useLoader } from "@/helpers/index.js";
import { deleteBySessionNumber } from "@/api/index.js";

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  size: {
    type: String,
    default: "large",
  },
  text: {
    type: String,
    default: "Delete Session",
  },
  tab: {
    type: Boolean,
    default: false,
  },
  callBack: Function,
});
const snackbar = inject("set-snackbar");
const deleteSession = ref(false);

const deleteSessionHandle = async () => {
  if (deleteSession.value) {
    const loader = useLoader().show();
    snackbar.value = await deleteBySessionNumber(deleteSession.value.number);
    deleteSession.value = false;
    loader.hide();
    await callBack();
  }
};

const disabled = props.session.state === "closed";
</script>

<template>
  <!-- Tab = true -->
  <!-- Mobile -->
  <v-btn
    v-if="tab"
    color="blue-grey-darken-4"
    icon="mdi-delete-outline"
    :size="size"
    variant="text"
    :disabled="disabled"
    @click="deleteSession = session"
    class="d-flex d-sm-none"
  ></v-btn>
  <!-- Non-mobile -->
  <v-btn
    v-if="tab"
    color="blue-grey-darken-4"
    prepend-icon="mdi-delete-outline"
    :size="size"
    :text="text"
    variant="text"
    :disabled="disabled"
    @click="deleteSession = session"
    class="text-capitalize font-weight-medium d-none d-sm-flex"
  ></v-btn>

  <!-- Tab = false -->
  <!-- Mobile -->
  <v-list-item
    v-if="!tab"
    @click="deleteSession = session"
    prepend-icon="mdi-delete-outline"
    :title="props.text"
    :disabled="disabled"
    class="d-flex d-sm-none"
  ></v-list-item>
  <!-- Non-mobile -->
  <Tooltip :text="props.text">
    <v-btn
      v-if="!tab"
      color="blue-grey-darken-4"
      icon="mdi-delete-outline"
      :size="size"
      variant="text"
      :disabled="disabled"
      @click="deleteSession = session"
      class="d-none d-sm-flex"
    ></v-btn>
  </Tooltip>

  <v-dialog v-model="deleteSession" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Delete Session">
      <template v-slot:text>
        Are you sure you want to delete session:
        <strong>{{ deleteSession.title }}</strong>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn @click="deleteSession = false"> Cancel </v-btn>
        <v-btn color="red" variant="flat" @click="deleteSessionHandle">
          Delete
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

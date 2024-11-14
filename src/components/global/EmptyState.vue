<script setup>
import { defineProps } from "vue";

const props = defineProps({
  headline: {
    type: String,
  },
  description: {
    type: String,
  },
  icon: {
    type: String,
  },
  btnText: {
    type: String,
  },
  img: {
    type: String,
  },
  initFunc: Function,
});
</script>

<template>
  <v-empty-state
    :action-text="props.btnText"
    :action-icon="props.icon"
    :image="props.img"
    :text="props.description"
    :title="props.headline"
    @click:action="props.initFunc"
    class="my-16 py-16 empty-state"
  >
    <template v-slot:actions>
      <v-btn
        class="text-capitalize"
        color="primary"
        :text="props.btnText"
        :prepend-icon="props.icon"
        @click="props.initFunc"
      />
    </template>
  </v-empty-state>
</template>

<style>
.empty-state .v-empty-state__media {
  padding: 20px 0px;
}
</style>

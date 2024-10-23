<script setup>
import { defineProps } from "vue";

const props = defineProps({
  items: {
    type: Number,
    default: 10,
  },
  avatar: {
    type: Boolean,
    default: true,
  },
  button: {
    type: Number,
    default: 4,
  },
  subTitle: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <v-list-item
    v-for="n in props.items"
    :key="n"
    :title="n"
    class="sessions-view py-4 border-b-thin"
  >
    <template v-slot:title>
      <div class="d-flex align-start px-5">
        <v-skeleton-loader
          v-if="props.avatar"
          type="avatar"
        ></v-skeleton-loader>
        <div class="ml-4">
          <v-skeleton-loader width="300px" type="heading"></v-skeleton-loader>
          <div
            v-if="props.subTitle"
            class="v-list-item-subtitle d-flex align-center pt-2"
          >
            <v-skeleton-loader width="200px" type="text"></v-skeleton-loader>
          </div>
        </div>
      </div>
    </template>
    <template v-slot:append>
      <v-skeleton-loader
        v-if="props.button"
        v-for="a in props.button"
        :key="a"
        width="24"
        type="heading"
        class="mx-3"
      ></v-skeleton-loader>
    </template>
  </v-list-item>
</template>

<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
import { onMounted, ref } from "vue";
import { getSessionsList } from "@/api/index.js";
import { querySessionsList } from "@/methods/sessions-view";

const sessions = ref([]);

onMounted(async () => {
  const sessionsList = await getSessionsList();
  sessions.value = querySessionsList(sessionsList);
});
</script>

<template>
  <v-list class="py-0">
    <!-- Session's list -->
    <v-list-item
      v-if="sessions.length"
      v-for="session in sessions"
      :key="session.title"
      :title="session.title"
      class="sessions-view py-4 border-b-thin"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-icon :color="session.status.color" class="pr-icon opacity-100">
            <OctIcon :name="session.status.icon" />
          </v-icon>
          <div class="ml-4">
            <router-link :to="session.number" class="main-title text-black">{{
              session.title
            }}</router-link>
            <div class="v-list-item-subtitle d-flex align-center pt-2">
              <span>Changes made on: </span>
              <div class="d-flex align-center ml-2">
                <v-icon>mdi-calendar-blank-outline</v-icon>
                <span class="text-black px-1">{{ session.date }}</span>
              </div>
              <div class="d-flex align-center ml-2">
                <v-icon>mdi-clock-time-five-outline</v-icon>
                <span class="text-black px-1">{{ session.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-slot:append>
        <v-btn
          color="blue-grey-darken-4"
          icon="mdi-github"
          size="large"
          variant="text"
        ></v-btn>
        <v-btn
          color="blue-grey-darken-4"
          icon="mdi-delete-outline"
          size="large"
          variant="text"
        ></v-btn>
        <v-btn
          color="blue-grey-darken-4"
          icon="mdi-monitor-eye"
          size="large"
          variant="text"
        ></v-btn>
        <v-btn
          color="blue-grey-darken-4"
          icon="mdi-file-document-edit"
          size="large"
          variant="text"
        ></v-btn>
      </template>
    </v-list-item>

    <!-- Placeholder for session's list -->
    <v-list-item
      v-else
      v-for="n in 10"
      :key="n"
      :title="n"
      class="sessions-view py-4 border-b-thin"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-skeleton-loader type="avatar"></v-skeleton-loader>
          <div class="ml-4">
            <v-skeleton-loader width="300px" type="heading"></v-skeleton-loader>
            <div class="v-list-item-subtitle d-flex align-center pt-2">
              <v-skeleton-loader width="200px" type="text"></v-skeleton-loader>
            </div>
          </div>
        </div>
      </template>
      <template v-slot:append>
        <v-skeleton-loader
          v-for="a in 4"
          :key="a"
          width="24"
          type="heading"
          class="mx-3"
        ></v-skeleton-loader>
      </template>
    </v-list-item>
  </v-list>
</template>

<style>
.sessions-view a.main-title {
  font-weight: 400;
  text-decoration: none;
}
.sessions-view a.main-title:hover {
  font-weight: 500;
  text-decoration: underline;
}
.sessions-view .v-list-item-subtitle {
  opacity: 1;
  color: #8a969e;
}
.sessions-view .v-icon.pr-icon svg {
  width: 20px;
  height: 20px;
}
</style>

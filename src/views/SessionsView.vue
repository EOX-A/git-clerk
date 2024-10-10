<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
const sessions = [
  {
    title: "Adding SO-FRESH product",
    color: "grey",
    status: "git-pull-request-draft",
    date: "01/06/24",
    time: "14:30",
  },
  {
    title: "Products for Hydrocoastal-ED",
    color: "green",
    status: "git-pull-request",
    date: "01/06/24",
    time: "14:30",
  },
  {
    title: "Adding Hydrocoastal variable",
    color: "violet",
    status: "git-merge",
    date: "01/06/24",
    time: "14:30",
  },
  {
    title: "Ocean Surface Backscatter products & variable",
    color: "red",
    status: "git-pull-request-closed",
    date: "01/06/24",
    time: "14:30",
  },
  {
    title: "Wet Tropospheric Correction",
    color: "green",
    status: "git-pull-request",
    date: "01/06/24",
    time: "14:30",
  },
];
</script>

<template>
  <v-list class="py-0">
    <v-list-item
      v-for="session in sessions"
      :key="session.title"
      :title="session.title"
      class="sessions-view py-4 border-b-thin"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-icon :color="session.color" class="pr-icon opacity-100">
            <OctIcon :name="session.status" />
          </v-icon>
          <div class="ml-4">
            <a href="/dummy-id" class="main-title text-black">{{
              session.title
            }}</a>
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

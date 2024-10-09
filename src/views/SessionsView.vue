<script setup>
const files = [
  {
    color: "blue",
    icon: "mdi-clipboard-text",
    subtitle: "Jan 20, 2014",
    title: "Adding SO-FRESH product",
  },
  {
    color: "amber",
    icon: "mdi-gesture-tap-button",
    subtitle: "Jan 10, 2014",
    title: "Kitchen remodel",
  },
];
</script>

<template>
  <v-list>
    <v-list-item
      v-for="file in files"
      :key="file.title"
      :subtitle="file.subtitle"
      :title="file.title"
    >
      <template v-slot:prepend>
        <v-avatar :color="file.color">
          <v-icon color="white">{{ file.icon }}</v-icon>
        </v-avatar>
      </template>

      <template v-slot:append>
        <v-btn
          color="grey-lighten-1"
          icon="mdi-information"
          variant="text"
        ></v-btn>
      </template>
    </v-list-item>
  </v-list>
</template>

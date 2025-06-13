<script setup>
import { BASE_PATH } from "@/enums";
import useOctokitStore from "@/stores/octokit";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const { githubUserData } = useOctokitStore();

const firstName = (githubUserData.name || githubUserData.login).split(" ")[0];
const selectedType = ref(null);
const route = useRoute();
const router = useRouter();

const props = defineProps({
  createNewSessionClick: {
    type: Function,
    default: () => {},
  },
});

const welcomeCards = ref([
  {
    title: "Add New Content",
    description: "Submit new content to the existing file system.",
    icon: "mdi-plus",
    buttonText: "Add New Content",
    buttonIcon: "mdi-plus",
    img: `${BASE_PATH}img/session.svg`,
    type: "add",
  },
  {
    title: "Proposed Changes",
    description: "Explore files and offer your suggestions for changes.",
    icon: "mdi-pencil-outline",
    buttonText: "Proposed Changes",
    buttonIcon: "mdi-pencil-outline",
    img: `${BASE_PATH}img/proposed-changes.svg`,
    type: "propose",
  },
]);

const selectedCard = (type) => {
  const url = new URL(window.location.href);
  if (type === "propose") {
    url.searchParams.set("file-browser", "open");
  } else {
    url.searchParams.delete("file-browser");
  }
  window.history.replaceState({}, "", url);
  selectedType.value = type;
  props.createNewSessionClick();
};
</script>

<template>
  <div class="empty-state-container bg-white h-100 text-center">
    <div class="pb-16">
      <h2>Hello, {{ firstName }}!</h2>
      <h1>What would you like to do today?</h1>
    </div>
    <div
      class="d-flex ga-16 justify-center align-center flex-column-reverse flex-sm-row"
    >
      <template v-for="card in welcomeCards" :key="card.type">
        <v-card
          class="py-8 welcome-card"
          max-width="320"
          variant="flat"
          color="#F7F8F8"
        >
          <v-card-text>
            <div
              class="d-flex ga-6 justify-center align-center text-center flex-column"
            >
              <img :src="card.img" height="150" alt="session" />
              <p class="text-body-1 px-8">
                {{ card.description }}
              </p>
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus"
                @click="selectedCard(card.type)"
              >
                {{ card.buttonText }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </template>
    </div>
  </div>
</template>

<style scoped>
.empty-state-container {
  padding: 8rem 0rem;
}
.welcome-card {
  box-shadow: 0px 16px 32px -4px #0000001f;
}

@media (max-width: 600px) {
  .empty-state-container {
    padding: 4rem 0rem;
  }
}
</style>

import { defineStore } from "pinia";
import { ref } from "vue";
import {
  connectGitHub,
  getSessionsList,
  getSessionDetails,
} from "@/api/index.js";
import useOctokitStore from "@/stores/octokit.js";
import sessionError from "@/helpers/session-error.js";

const useSessionsStore = defineStore("sessions-v2", () => {
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref("");
  const pageInfo = ref(null);
  let connecting = null;

  async function ensureConnected() {
    if (useOctokitStore().context) return;
    // The sidebar and a directly opened session can initialize at the same time.
    if (!connecting)
      connecting = connectGitHub().finally(() => {
        connecting = null;
      });
    await connecting;
  }

  async function loadSessions(reset = false) {
    if (loading.value) return;
    loading.value = true;
    error.value = "";
    try {
      await ensureConnected();
      const result = await getSessionsList(
        reset ? null : pageInfo.value?.endCursor,
      );
      const existing = reset ? [] : sessions.value;
      sessions.value = [
        ...new Map(
          [...existing, ...result.data].map((session) => [session.id, session]),
        ).values(),
      ];
      pageInfo.value = result.pageInfo;
    } catch (cause) {
      error.value = sessionError(cause);
    } finally {
      loading.value = false;
    }
  }

  async function getSession(number) {
    const session = sessions.value.find((item) => item.number === number);
    if (session) return session;
    await ensureConnected();
    return getSessionDetails(number);
  }

  return { sessions, loading, error, pageInfo, loadSessions, getSession };
});

export default useSessionsStore;

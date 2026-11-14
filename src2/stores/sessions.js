import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  connectGitHub,
  getSessionsList,
  getSessionDetails,
} from "@/api/index.js";
import useOctokitStore from "@/stores/octokit.js";
import sessionError from "@/helpers/session-error.js";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import {
  filterSessions,
  groupSessions,
  sessionFilterSummary,
} from "@/helpers/session-filters.js";

const useSessionsStore = defineStore("sessions-v2", () => {
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref("");
  const pageInfo = ref(null);
  const statuses = ref(Object.keys(SESSION_STATUS));
  const sort = ref("recent");
  const group = ref("none");
  const collapsedGroups = ref(new Set());
  const filterSummary = computed(() =>
    sessionFilterSummary(statuses.value, sort.value, group.value),
  );
  const filtersActive = computed(() => Boolean(filterSummary.value));
  const visibleSessions = computed(() =>
    filterSessions(sessions.value, statuses.value, sort.value),
  );
  const sessionGroups = computed(() =>
    groupSessions(visibleSessions.value, group.value),
  );
  const statusCounts = computed(() =>
    Object.fromEntries(
      Object.keys(SESSION_STATUS).map((status) => [
        status,
        sessions.value.filter((session) => session.status === status).length,
      ]),
    ),
  );
  const allLoaded = computed(() => pageInfo.value?.hasNextPage === false);
  let connecting = null;
  let loadAllRequested = false;
  let requestID = 0;
  let listController = null;

  async function ensureConnected() {
    if (useOctokitStore().context) return;
    // The sidebar and a directly opened session can initialize at the same time.
    if (!connecting)
      connecting = connectGitHub().finally(() => {
        connecting = null;
      });
    await connecting;
  }

  async function loadSessions(reset = false, all = filtersActive.value) {
    if (reset) {
      listController?.abort();
      loadAllRequested = all;
      sessions.value = [];
      pageInfo.value = null;
    } else {
      // Opening the popover can extend the current request to all pages.
      loadAllRequested ||= all;
      if (loading.value) return;
      if (allLoaded.value) {
        loadAllRequested = false;
        return;
      }
    }
    const currentRequest = ++requestID;
    const controller = new AbortController();
    listController = controller;
    loading.value = true;
    error.value = "";
    try {
      await ensureConnected();
      if (currentRequest !== requestID) return;
      do {
        const result = await getSessionsList(
          pageInfo.value?.endCursor ?? null,
          controller.signal,
        );
        // Aborted or delayed responses must not replace the latest selection.
        if (currentRequest !== requestID) return;
        sessions.value = [
          ...new Map(
            [...sessions.value, ...result.data].map((session) => [
              session.id,
              session,
            ]),
          ).values(),
        ];
        pageInfo.value = result.pageInfo;
      } while (loadAllRequested && pageInfo.value.hasNextPage);
      loadAllRequested = false;
    } catch (cause) {
      if (currentRequest === requestID) error.value = sessionError(cause);
    } finally {
      if (currentRequest === requestID) {
        loading.value = false;
        listController = null;
      }
    }
  }

  function toggleStatus(status) {
    statuses.value = statuses.value.includes(status)
      ? statuses.value.filter((value) => value !== status)
      : [...statuses.value, status];
    return loadSessions(true, true);
  }

  function setSort(value) {
    if (sort.value === value) return;
    sort.value = value;
    return loadSessions(true, true);
  }

  function setGroup(value) {
    group.value = value;
    loadSessions(false, true);
  }

  function clearFilters() {
    const refresh =
      statuses.value.length !== Object.keys(SESSION_STATUS).length ||
      sort.value !== "recent";
    statuses.value = Object.keys(SESSION_STATUS);
    sort.value = "recent";
    group.value = "none";
    collapsedGroups.value = new Set();
    if (refresh) return loadSessions(true, true);
  }

  function toggleGroup(id) {
    const closed = new Set(collapsedGroups.value);
    if (closed.has(id)) closed.delete(id);
    else closed.add(id);
    collapsedGroups.value = closed;
  }

  async function getSession(number) {
    const session = sessions.value.find((item) => item.number === number);
    if (session) return session;
    await ensureConnected();
    return getSessionDetails(number);
  }

  return {
    sessions,
    loading,
    error,
    pageInfo,
    loadSessions,
    getSession,
    statuses,
    sort,
    group,
    collapsedGroups,
    filterSummary,
    filtersActive,
    visibleSessions,
    sessionGroups,
    statusCounts,
    allLoaded,
    toggleStatus,
    setSort,
    setGroup,
    clearFilters,
    toggleGroup,
  };
});

export default useSessionsStore;

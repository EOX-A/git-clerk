import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  connectGitBroker,
  createSessionByName,
  getSessionsList,
  getSessionDetails,
} from "@/api/index.js";
import useGitStore from "@/stores/git.js";
import sessionError from "@/helpers/session-error.js";
import { SESSION_STATUS, sessionTag } from "@/helpers/session-status.js";
import {
  filterSessions,
  groupSessions,
  isMySession,
  sessionFilterSummary,
} from "@/helpers/session-filters.js";

const useSessionsStore = defineStore("sessions-v2", () => {
  const gitStore = useGitStore();
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref("");
  const pageInfo = ref(null);
  const onlyMine = ref(true);
  const statuses = ref(Object.keys(SESSION_STATUS));
  const sort = ref("recent");
  const group = ref("none");
  const collapsedGroups = ref(new Set());
  const filterSummary = computed(() =>
    sessionFilterSummary(
      statuses.value,
      sort.value,
      group.value,
      onlyMine.value,
    ),
  );
  const filtersActive = computed(() => Boolean(filterSummary.value));
  const visibleSessions = computed(() =>
    filterSessions(sessions.value, statuses.value, sort.value, {
      onlyMine: onlyMine.value,
      user: gitStore.user,
    }),
  );
  const sessionGroups = computed(() =>
    groupSessions(visibleSessions.value, group.value),
  );
  const statusCounts = computed(() => {
    const scoped = onlyMine.value
      ? sessions.value.filter((session) =>
          isMySession(session, gitStore.user),
        )
      : sessions.value;
    return Object.fromEntries(
      Object.keys(SESSION_STATUS).map((status) => [
        status,
        scoped.filter((session) => sessionTag(session) === status).length,
      ]),
    );
  });
  const allLoaded = computed(() => pageInfo.value?.hasNextPage === false);
  let connecting = null;
  let loadAllRequested = false;
  let requestID = 0;
  let listController = null;

  async function ensureConnected() {
    if (useGitStore().context) return;
    // The sidebar and a directly opened session can initialize at the same time.
    if (!connecting)
      connecting = connectGitBroker().finally(() => {
        connecting = null;
      });
    await connecting;
  }

  async function loadSessions(
    reset = false,
    all = filtersActive.value,
    refresh = false,
  ) {
    if (reset) {
      listController?.abort();
      loadAllRequested = all;
      sessions.value = [];
      pageInfo.value = null;
    } else {
      // Opening the popover can extend the current request or refresh all pages.
      loadAllRequested ||= all;
      if (loading.value) return;
      if (allLoaded.value && !refresh) {
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
      if (refresh) {
        let cursor = null;
        let nextPageInfo = null;
        const fresh = [];
        do {
          const result = await getSessionsList(cursor, controller.signal);
          if (currentRequest !== requestID) return;
          fresh.push(...result.data);
          nextPageInfo = result.pageInfo;
          cursor = result.pageInfo.endCursor;
        } while (nextPageInfo.hasNextPage);
        sessions.value = [
          ...new Map(fresh.map((session) => [session.id, session])).values(),
        ];
        pageInfo.value = nextPageInfo;
      } else {
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
      }
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

  function toggleOnlyMine() {
    onlyMine.value = !onlyMine.value;
    return loadSessions(true, true);
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
      onlyMine.value ||
      statuses.value.length !== Object.keys(SESSION_STATUS).length ||
      sort.value !== "recent";
    onlyMine.value = false;
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

  async function createSession(name, attempt, onProgress, initialFiles) {
    await ensureConnected();
    const session = await createSessionByName(
      name,
      attempt,
      onProgress,
      initialFiles,
    );
    return rememberSession(session);
  }

  function rememberSession(session) {
    // Cancel older pages so they cannot erase the new session or stale the counts.
    requestID++;
    listController?.abort();
    listController = null;
    loading.value = false;
    loadAllRequested = false;
    if (pageInfo.value?.hasNextPage !== false) {
      pageInfo.value = null;
    }
    error.value = "";
    sessions.value = [
      session,
      ...sessions.value.filter((item) => item.number !== session.number),
    ];
    return session;
  }

  async function getSession(number, signal) {
    await ensureConnected();
    signal?.throwIfAborted();
    // Sidebar rows are summaries; the header always needs fresh PR details.
    const session = await getSessionDetails(number, signal);
    const exists = sessions.value.some((item) => item.number === number);
    sessions.value = exists
      ? sessions.value.map((item) => (item.number === number ? session : item))
      : [session, ...sessions.value];
    return session;
  }

  return {
    sessions,
    loading,
    error,
    pageInfo,
    loadSessions,
    getSession,
    ensureConnected,
    createSession,
    rememberSession,
    onlyMine,
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
    toggleOnlyMine,
    toggleStatus,
    setSort,
    setGroup,
    clearFilters,
    toggleGroup,
  };
});

export default useSessionsStore;

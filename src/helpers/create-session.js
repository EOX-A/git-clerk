import { createSessionByName } from "@/api/index.js";
import { useLoader } from "@/helpers/index.js";
import { h } from "vue";

/**
 *
 * @param sessionNumber
 * @param router
 * @param route
 * @param clearInput
 * @param filePath
 * @param noRedirectCallback
 */
export function postSessionCreation(
  sessionNumber,
  router,
  route,
  clearInput,
  filePath,
  noRedirectCallback,
) {
  const params = Object.fromEntries(
    Object.entries(route.query).filter(
      ([key]) => key !== "session" && key !== "file-browser",
    ),
  );
  const queryString = new URLSearchParams(params).toString();
  const filePathToOpen = filePath ? filePath() : null;
  const url = queryString
    ? `/${sessionNumber}?${queryString}`
    : `/${sessionNumber}${filePathToOpen ? `/${filePathToOpen}` : ""}`;

  if (!noRedirectCallback) {
    setTimeout(() => {
      router.push(url);
      clearInput(true);
    }, 750);
  } else {
    noRedirectCallback(sessionNumber);
  }
}

/**
 *
 * @param props
 * @param router
 * @param route
 * @param clearInput
 * @param filePath
 * @param noRedirectCallback
 */
export default async function createSession(
  props,
  router,
  route,
  clearInput,
  filePath,
  noRedirectCallback,
) {
  if (!props.newSessionName.value) {
    props.snackbar.value = {
      text: "Session name is empty. Please provide a session name.",
      status: "error",
    };
    return;
  }
  props.loader.value = useLoader().show(
    {},
    {
      after: h(
        "h5",
        { class: "loader-text", id: "loader-text" },
        "Checking fork branch present in your profile...",
      ),
    },
  );
  props.snackbar.value = await createSessionByName(props.newSessionName.value);
  props.loader.value.hide();

  if (props.snackbar.value.number) {
    postSessionCreation(
      props.snackbar.value.number,
      router,
      route,
      clearInput,
      filePath,
      noRedirectCallback,
    );
  }
}

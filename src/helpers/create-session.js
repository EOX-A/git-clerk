import { createSessionByName } from "@/api/index.js";
import { useLoader } from "@/helpers/index.js";
import { h } from "vue";

export default async function createSession(
  props,
  router,
  route,
  clearInput,
  filePath,
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
    const params = Object.fromEntries(
      Object.entries(route.query).filter(([key]) => key !== "session"),
    );
    const queryString = new URLSearchParams(params).toString();
    const filePathToOpen = filePath ? filePath() : null;
    const sessionNumber = props.snackbar.value.number;
    const url = Boolean(queryString)
      ? `/${sessionNumber}?${queryString}`
      : `/${sessionNumber}${filePathToOpen ? `/${filePathToOpen}` : ""}`;
    setTimeout(() => {
      router.push(url);
      clearInput();
    }, 750);
  }
}

import { RequestError } from "octokit";
import { querySession } from "@/helpers";

export default function querySessionsListMethod(sessionsList, props) {
  if (sessionsList instanceof RequestError) {
    props.snackbar.value = {
      text: sessionsList.message,
      status: "error",
    };
    props.sessions.value = [];
    props.totalPage.value = 0;
  } else {
    let sessions = [];
    sessionsList.data.forEach((session) =>
      sessions.push(querySession(session)),
    );

    props.sessions.value = sessions;
    props.totalPage.value = sessionsList.total;
  }
}

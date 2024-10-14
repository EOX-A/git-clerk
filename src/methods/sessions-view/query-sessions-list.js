import { RequestError } from "octokit";
import { querySession } from "@/helpers";

export default function querySessionsList(sessionsList) {
  if (sessionsList instanceof RequestError) console.error(sessionsList);
  else {
    let sessions = [];
    sessionsList.forEach((session) => sessions.push(querySession(session)));

    return sessions;
  }
}

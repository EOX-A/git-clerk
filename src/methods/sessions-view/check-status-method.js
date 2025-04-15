import {
  getCheckStatus,
  getSessionReviewStatus,
  getSessionDetails,
} from "@/api/index.js";
import { CHECK_STATUS } from "@/enums.js";

export default async function checkStatusMethod(
  sessions,
  currPage,
  updatedPage,
  currSessionState,
  sessionSelectedState,
) {
  for (const [index, session] of sessions.value.entries()) {
    if (
      currPage === updatedPage.value &&
      currSessionState === sessionSelectedState
    ) {
      const sessionDetails = await getSessionDetails(session.number);
      const check = await getCheckStatus(sessionDetails.head.sha);
      const requestedChanges = await getSessionReviewStatus(session.number);

      if (
        currPage === updatedPage.value &&
        sessions.value &&
        currSessionState === sessionSelectedState
      ) {
        sessions.value[index] = {
          ...session,
          requested_changes: requestedChanges,
          check: CHECK_STATUS[check],
          changed_files: sessionDetails.changed_files,
        };
      }
    }
  }
}

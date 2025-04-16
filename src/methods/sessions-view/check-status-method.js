import {
  getCheckStatus,
  getSessionReviewStatus,
  getSessionDetails,
} from "@/api/index.js";
import { CHECK_STATUS } from "@/enums.js";
import isEqual from "lodash.isequal";

export default async function checkStatusMethod(
  sessions,
  currPageInfo,
  updatedPageInfo,
  currSessionState,
  sessionSelectedState,
  currPath,
  route
) {
  for (const [index, session] of sessions.value.entries()) {
    if (
      isEqual(currPageInfo, updatedPageInfo.value) &&
      currSessionState === sessionSelectedState.value &&
      currPath === route.path
    ) {
      const sessionDetails = await getSessionDetails(session.number);
      const check = await getCheckStatus(sessionDetails.head.sha);
      const requestedChanges = await getSessionReviewStatus(session.number);

      if (
        isEqual(currPageInfo, updatedPageInfo.value) &&
        sessions.value &&
        currSessionState === sessionSelectedState.value &&
        currPath === route.path
      ) {
        sessions.value[index] = {
          ...session,
          requested_changes: requestedChanges,
          check: CHECK_STATUS[check],
          changed_files: sessionDetails.changed_files,
        };
      } else break;
    } else break;
  }
}

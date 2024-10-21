import { getCheckStatus, getSessionReviewStatus } from "@/api/index.js";

export default async function checkStatusMethod(
  sessions,
  currPage,
  updatedPage,
) {
  for (const [index, session] of sessions.value.entries()) {
    if (currPage === updatedPage.value) {
      const check = await getCheckStatus(session.number);
      const requestedChanges = await getSessionReviewStatus(session.number);

      if (currPage === updatedPage.value) {
        sessions.value[index] = {
          ...session,
          requested_changes: requestedChanges,
          check,
        };
      }
    }
  }
}

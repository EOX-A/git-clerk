import { getCheckStatus, getSessionReviewStatus } from "@/api/index.js";

const status = {
  success: {
    tooltip: "Validation Successful",
    icon: "mdi-check-bold",
    color: "green",
  },
  pending: {
    tooltip: "Validation Pending",
    icon: "mdi-alert-outline",
    color: "orange",
  },
  failure: {
    tooltip: "Validation Failed",
    icon: "mdi-close-octagon-outline",
    color: "red",
  },
  error: {
    tooltip: "Validation Failed",
    icon: "mdi-close-octagon-outline",
    color: "red",
  },
};

export default async function checkStatusMethod(
  sessions,
  currPage,
  updatedPage,
) {
  for (const [index, session] of sessions.value.entries()) {
    if (currPage === updatedPage.value) {
      const check = await getCheckStatus(session.number);
      const requestedChanges = await getSessionReviewStatus(session.number);

      if (currPage === updatedPage.value && sessions.value) {
        sessions.value[index] = {
          ...session,
          requested_changes: requestedChanges,
          check: {
            ...status[check],
            success: Boolean(check === "success"),
          },
        };
      }
    }
  }
}

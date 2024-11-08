import { getCheckStatus, getSessionReviewStatus } from "@/api/index.js";
import { CHECK_STATUS } from "@/enums.js";

export default async function checkStatusMethod(session) {
  const check = await getCheckStatus(session.value.number);
  const requestedChanges = await getSessionReviewStatus(session.value.number);

  session.value = {
    ...session.value,
    requested_changes: requestedChanges,
    check: CHECK_STATUS[check],
  };
}

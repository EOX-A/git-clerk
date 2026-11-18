export function sessionChecks(session) {
  if (session.reviewDecision === "CHANGES_REQUESTED")
    return { label: "Changes requested", icon: "alert", color: "text-closed" };
  if (["PENDING", "EXPECTED"].includes(session.checks))
    return { label: "Checks running", icon: "clock", color: "text-warn" };
  if (["FAILURE", "ERROR"].includes(session.checks))
    return { label: "Checks failed", icon: "alert", color: "text-closed" };
  if (session.checks === "SUCCESS")
    return { label: "Checks passed", icon: "check-circle", color: "text-open" };
  return null;
}

export function canSubmitSession(session) {
  return (
    session.canManage &&
    session.status === "draft" &&
    session.changedFiles > 0 &&
    (!session.checks || session.checks === "SUCCESS") &&
    session.reviewDecision !== "CHANGES_REQUESTED"
  );
}

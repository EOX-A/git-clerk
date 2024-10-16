import { getCheckStatusFromRefHead } from "@/api/index.js";

export default async function checkValidationStatusMethod(sessions) {
  for (const [index, session] of sessions.value.entries()) {
    const check = await getCheckStatusFromRefHead(session.head.sha);
    sessions.value[index] = {
      ...session,
      check,
    };
  }
}

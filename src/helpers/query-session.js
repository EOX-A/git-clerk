import dayjs from "dayjs";
import { getPrStatus } from "@/helpers";

export default function querySession(session) {
  return {
    title: session.title,
    date: dayjs(session.updated_at).format("DD/MM/YYYY"),
    time: dayjs(session.updated_at).format("hh:mm A"),
    status: getPrStatus(session),
    authorLogin: session.author?.login || session.user?.login || null,
    forkOwner:
      session.headRepositoryOwner?.login ||
      session.head?.repo?.owner?.login ||
      null,
    ...session,
  };
}

import dayjs from "dayjs";
import { getPrStatus } from "@/helpers";

export default function querySession(session) {
  return {
    title: session.title,
    date: dayjs(session.updated_at).format("DD/MM/YYYY"),
    time: dayjs(session.updated_at).format("hh:mm A"),
    status: getPrStatus(session),
    ...session,
  };
}

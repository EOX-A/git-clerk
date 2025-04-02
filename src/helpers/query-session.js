import dayjs from "dayjs";
import { DEPLOYED_PREVIEW_LINK } from "@/enums";
import { getPrStatus } from "@/helpers";

export default function querySession(session) {
  return {
    title: session.title,
    date: dayjs(session.updated_at).format("DD/MM/YYYY"),
    time: dayjs(session.updated_at).format("hh:mm A"),
    status: getPrStatus(session),
    deployedPreviewLink: DEPLOYED_PREVIEW_LINK(session),
    ...session,
  };
}

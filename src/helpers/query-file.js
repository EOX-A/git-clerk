import { getFileChangesStatus } from "@/helpers";

export default function queryFile(file) {
  return {
    title: file.filename,
    // date: dayjs(session.updated_at).format("DD/MM/YYYY"),
    // time: dayjs(session.updated_at).format("hh:mm A"),
    state: getFileChangesStatus(file.status),
    ...file,
  };
}

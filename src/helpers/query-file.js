import { createColorBlocks, getFileChangesStatus } from "@/helpers";

/**
 *
 * @param file
 */
export default function queryFile(file) {
  return {
    title: file.filename,
    state: getFileChangesStatus(file.status),
    diffColor: createColorBlocks(file.additions, file.deletions, file.changes),
    ...file,
  };
}

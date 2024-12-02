import { decodeString, parseIfNeeded, stringifyIfNeeded } from "@/helpers";
import { createAndUpdateFile, getFileDetails } from "@/api";

export const AUTOMATION = globalThis.automation || [];
const LOADER_MSG = {
  add: "Creating File",
  edit: "Transforming File",
};

export async function runAutomation(props, value) {
  const loaderEle = document.getElementById("loader-text");
  for (const step of props.selectedAutomation.steps) {
    let path = typeof step.path === "function" ? step.path(value) : step.path;
    if (path.startsWith("/")) path = path.substring(1);
    const session = props.session;
    if (loaderEle) loaderEle.textContent = LOADER_MSG[step.type];

    if (step.content) {
      const content = stringifyIfNeeded(step.content(value));

      await createAndUpdateFile(session, path, path, content);
    } else if (step.transform) {
      const fileDetails = await getFileDetails(session, path);
      const existingContent = parseIfNeeded(decodeString(fileDetails.content));
      const transformedContent = step.transform(existingContent, value);

      await createAndUpdateFile(
        session,
        path,
        path,
        stringifyIfNeeded(transformedContent),
        fileDetails.sha,
      );
    }
  }
}

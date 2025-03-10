import {
  decodeString,
  encodeString,
  parseIfNeeded,
  stringifyIfNeeded,
} from "@/helpers";
import { createAndUpdateFile, getFileDetails } from "@/api";

export const AUTOMATION = globalThis.automation || [];
const getLoaderMsg = (type, path, currentMsg) => {
  const messages = {
    add: "Creating File",
    edit: "Transforming File",
    navigate: `Navigating to /${path}`,
  };
  return messages[type] || currentMsg;
};

export async function runAutomation(props, value, router) {
  const loaderEle = document.getElementById("loader-text");
  for (const step of props.selectedAutomation.steps) {
    let path = typeof step.path === "function" ? step.path(value) : step.path;
    if (path.startsWith("/")) path = path.substring(1);
    const session = props.session;
    if (loaderEle)
      loaderEle.textContent = getLoaderMsg(
        step.type,
        path,
        loaderEle.textContent,
      );

    if (step.content) {
      const initialContent =
        step.content.constructor.name === "AsyncFunction"
          ? await step.content(value)
          : step.content(value);

      const content = {
        data: stringifyIfNeeded(initialContent),
        type: "string",
      };

      await createAndUpdateFile(session, path, path, content);
    } else if (step.transform) {
      const fileDetails = await getFileDetails(session, path);
      const existingContent = parseIfNeeded(decodeString(fileDetails.content));

      const transformedContent =
        step.transform.constructor.name === "AsyncFunction"
          ? await step.transform(existingContent, value)
          : step.transform(existingContent, value);

      const content = {
        data: stringifyIfNeeded(transformedContent),
        type: "string",
      };

      await createAndUpdateFile(session, path, path, content, fileDetails.sha);
    } else if (step.type === "navigate") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await router.push(`/${session.number}/${encodeString(path)}`);
    }
  }
}

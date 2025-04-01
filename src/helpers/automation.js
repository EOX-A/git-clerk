import {
  decodeString,
  encodeString,
  parseIfNeeded,
  stringifyIfNeeded,
} from "@/helpers";
import { createAndUpdateFile, getFileDetails } from "@/api";

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

    if (step.content || step.transform) {
      let initialContent;
      let sha;

      if (step.content) {
        initialContent =
          step.content.constructor.name === "AsyncFunction"
            ? await step.content(value)
            : step.content(value);
      } else {
        const fileDetails = await getFileDetails(session, path);
        const existingContent = parseIfNeeded(
          decodeString(fileDetails.content),
        );
        sha = fileDetails.sha;

        initialContent =
          step.transform.constructor.name === "AsyncFunction"
            ? await step.transform(existingContent, value)
            : step.transform(existingContent, value);
      }

      if (initialContent instanceof Error) {
        throw initialContent;
      }

      const content = {
        data: stringifyIfNeeded(initialContent),
        type: "string",
      };

      await createAndUpdateFile(session, path, path, content, sha);
    } else if (step.type === "navigate") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await router.push(`/${session.number}/${encodeString(path)}`);
    }
  }
}

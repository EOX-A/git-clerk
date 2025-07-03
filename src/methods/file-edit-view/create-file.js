import { useLoader } from "@/helpers/index.js";
import {
  createAndUpdateFile,
  getSessionDetails,
  getFileDetails,
  fetchSchemaFromURL,
} from "@/api/index.js";
import {
  encodeString,
  decodeString,
  getSchemaDetails,
  stringifyIfNeeded,
  fetchJsonFormContent,
} from "@/helpers/index.js";

export default async function createFileMethod(
  updatedFilePath,
  fileName,
  session,
  existingSessionNumber = null,
  router,
  snackbar,
  success,
  existingFileName = null,
  existingSHA = null,
) {
  if (!fileName) {
    snackbar.value = {
      text: "Please add a filename",
      status: "error",
    };
    return;
  }

  const loader = useLoader().show();
  let fileContent = "";

  const create = async () => {
    const fullFilePath = (updatedFilePath + (fileName || "")).replace("/", "");

    const content = {
      data: fileContent,
      type: "string",
    };

    const sha = existingSHA || session?.head?.sha || null;
    const sessionNumber = existingSessionNumber || session.number;

    const sessionDetails = await getSessionDetails(sessionNumber);

    snackbar.value = await createAndUpdateFile(
      sessionDetails,
      fullFilePath,
      fileName,
      content,
      sha,
    );
    if (snackbar.value.status === "success") {
      await router.push(`/${sessionNumber}/${encodeString(fullFilePath)}`);
      success();
    }
    loader.hide();
  };

  if (existingFileName) {
    const fileDetails = await getFileDetails(session, existingFileName, false);
    if (fileDetails.encoding !== "none") {
      fileContent = decodeString(fileDetails.content);
      create();
    } else {
      snackbar.value = {
        text: "File is large and cannot be duplicated by Git Clerk",
        status: "error",
      };
      loader.hide();
      return;
    }
  } else {
    const fullPath = updatedFilePath + fileName;
    const schemaDetails = getSchemaDetails(fullPath);
    if (schemaDetails) {
      const schema =
        schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));

      if (schema.status === "error") {
        snackbar.value = schema;
        loader.hide();
        return;
      } else {
        fetchJsonFormContent(schema, (content) => {
          fileContent = stringifyIfNeeded(schemaDetails.content || content);
          create();
        });
      }
    } else {
      create();
    }
  }
}

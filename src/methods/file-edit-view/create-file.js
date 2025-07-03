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
  // Validate filename exists
  if (!fileName) {
    snackbar.value = {
      text: "Please add a filename",
      status: "error",
    };
    return;
  }

  const loader = useLoader().show();
  let fileContent = "";

  // Helper function to create the file
  const create = async () => {
    const fullFilePath = (updatedFilePath + (fileName || "")).replace("/", "");

    const content = {
      data: fileContent,
      type: "string",
    };

    const sha = existingSHA || session?.head?.sha || null;
    const sessionNumber = existingSessionNumber || session.number;

    const sessionDetails = await getSessionDetails(sessionNumber);

    // Create the file
    snackbar.value = await createAndUpdateFile(
      sessionDetails,
      fullFilePath,
      fileName,
      content,
      sha,
    );

    // If file creation is successful, navigate to the file and call success callback
    if (snackbar.value.status === "success") {
      await router.push(`/${sessionNumber}/${encodeString(fullFilePath)}`);
      success();
    }
    loader.hide();
  };

  // Handle file duplication
  if (existingFileName) {
    const fileDetails = await getFileDetails(session, existingFileName, false);

    // If file is not empty, decode the content and create the file
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
  }
  // Handle new file creation
  else {
    const fullPath = updatedFilePath + fileName;
    const schemaDetails = getSchemaDetails(fullPath);
    if (schemaDetails) {
      // Get schema and create file with schema-based content
      const schema =
        schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));

      if (schema.status === "error") {
        snackbar.value = schema;
        loader.hide();
        return;
      } else {
        // Fetch the content from the schema and create the file
        fetchJsonFormContent(schema, (content) => {
          fileContent = stringifyIfNeeded(schemaDetails.content || content);
          create();
        });
      }
    } else {
      // Create empty file if no schema exists
      create();
    }
  }
}

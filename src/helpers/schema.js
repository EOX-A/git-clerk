import { SCHEMA_MAP } from "@/enums";

/**
 *
 * @param inputPath
 */
export function getSchemaDetails(inputPath) {
  for (const schema of SCHEMA_MAP) {
    // Replace every <...> placeholder (with any content inside) by a path segment matcher
    const pathPattern = schema.path.replace(/<[^>]+>/g, "[^/]+");
    const regex = new RegExp(`^${pathPattern}$`);

    if (regex.test(inputPath)) {
      return schema;
    }
  }
  return null;
}

/**
 *
 * @param fileEnding
 */
export function getFileSchema(fileEnding = "textarea") {
  return {
    generic: true,
    schema: {
      title: "git-clerk",
      type: "object",
      properties: {
        file: {
          title: "File contents",
          type: "string",
          format: fileEnding,
          options: {
            resolver: "ace",
            titleHidden: true,
          },
        },
      },
    },
  };
}

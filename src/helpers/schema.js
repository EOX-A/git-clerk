export const SCHEMA_MAP = globalThis.schemaMap || [];

export function getSchemaDetails(inputPath) {
  for (const schema of SCHEMA_MAP) {
    const pathPattern = schema.path.replace(/<id>/g, "[^/]+");
    const regex = new RegExp(`^${pathPattern}$`);

    if (regex.test(inputPath)) {
      return schema;
    }
  }
  return null;
}

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

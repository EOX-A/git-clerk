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

export function getFileSchema(fileContent) {
  return {
    title: "git-clerk",
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "textarea",
        default: fileContent,
      },
    },
  };
}

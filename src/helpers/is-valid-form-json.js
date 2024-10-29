export default function isValidFormJSON(fileContent) {
  try {
    const parsed = JSON.parse(fileContent);

    if (typeof parsed !== "object" || parsed === null) {
      return false;
    }

    const hasSchemaFields = [
      "type",
      "properties",
      "items",
      "required",
      "title",
      "description",
    ];
    return hasSchemaFields.some((key) => key in parsed);
  } catch (e) {
    return false;
  }
}

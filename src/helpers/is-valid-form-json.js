export default function isValidFormJSON(fileContent) {
  try {
    const parsed = JSON.parse(fileContent);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !parsed?.allOf?.[0]?.properties
    )
      return false;
    else return true;
  } catch (e) {
    return false;
  }
}

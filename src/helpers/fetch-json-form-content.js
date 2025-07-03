// Helper function to fetch the content from the schema and call the callback function
export default async function fetchJsonFormContent(schema, callBack) {
  const jsonForm = document.createElement("eox-jsonform");
  jsonForm.style.display = "none";
  jsonForm.schema = schema;
  document.body.appendChild(jsonForm);

  // Set an interval to check if the editor is loaded and call the callback function with the content
  const intervalId = setInterval(() => {
    if (jsonForm.editor) {
      callBack(jsonForm.editor.getValue());
      clearInterval(intervalId);
      jsonForm.remove();
    }
  }, 500);
}

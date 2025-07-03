export default async function fetchJsonFormContent(schema, callBack) {
  const jsonForm = document.createElement("eox-jsonform");
  jsonForm.style.display = "none";
  jsonForm.schema = schema;
  document.body.appendChild(jsonForm);

  const intervalId = setInterval(() => {
    if (jsonForm.editor) {
      callBack(jsonForm.editor.getValue());
      clearInterval(intervalId);
      jsonForm.remove();
    }
  }, 500);
}

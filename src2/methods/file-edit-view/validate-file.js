// Use the same JSON Editor validation as the visible form, including while Source is active.
export default async function validateFileMethod(value, meta, interfaces) {
  if (!meta?.schema) return [];
  await import("@eox/jsonform");
  return new Promise((resolve) => {
    const form = document.createElement("eox-jsonform");
    form.style.display = "none";
    form.schema = meta.schema;
    form.value = value;
    form.options = meta.jsonform?.options || {};
    form.customEditorInterfaces = interfaces;
    const finish = (errors) => {
      window.clearTimeout(timer);
      form.editor?.destroy();
      form.remove();
      resolve(errors);
    };
    const timer = window.setTimeout(
      () =>
        finish([
          {
            message:
              "Validation could not finish. Retry or check the configured schema.",
          },
        ]),
      15000,
    );
    form.addEventListener(
      "ready",
      () => queueMicrotask(() => finish(form.editor.validate(value))),
      {
        once: true,
      },
    );
    document.body.append(form);
  });
}

export default function debouncePostMessageMethod(
  message,
  origin,
  init = false,
) {
  const previewFrame = document.getElementById("previewFrame");
  if (previewFrame && previewFrame.contentWindow) {
    if (init)
      previewFrame.onload = () =>
        previewFrame.contentWindow.postMessage(message, origin);
    previewFrame.contentWindow.postMessage(message, origin);
  }
}

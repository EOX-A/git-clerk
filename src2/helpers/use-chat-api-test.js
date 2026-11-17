import { onScopeDispose, ref } from "vue";

export default function useChatApiTest(request) {
  const busy = ref(false);
  let controller;

  const cancelMethod = () => {
    controller?.abort();
    controller = null;
    busy.value = false;
  };
  const requestMethod = async (text, current) => {
    try {
      const response = await request(text, current.signal);
      if (controller === current && !current.signal.aborted) {
        console.log("[Git Clerk chat test] Response:", response);
      }
    } catch (error) {
      if (controller === current && !current.signal.aborted) {
        console.error("[Git Clerk chat test] Request failed:", error.message);
      }
    } finally {
      // A cancelled request must not clear a newer request's busy state.
      if (controller === current) {
        controller = null;
        busy.value = false;
      }
    }
  };
  const sendMethod = ({ text }) => {
    const prompt = text.trim();
    if (!prompt || busy.value) return false;
    controller = new AbortController();
    busy.value = true;
    void requestMethod(prompt, controller);
    return true;
  };

  onScopeDispose(cancelMethod);
  return { busy, sendMethod, cancelMethod };
}

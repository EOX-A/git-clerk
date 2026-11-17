import { computed, ref, watch } from "vue";
import { getDummyMessages } from "./chat-dummy.js";
import useChatApiTest from "./use-chat-api-test.js";

export default function useSessionChat(session, request) {
  const messages = ref([]);
  const readOnly = computed(() =>
    ["closed", "merged"].includes(session.value?.status),
  );
  const {
    busy,
    sendMethod: sendTestMethod,
    cancelMethod,
  } = useChatApiTest(request);
  let nextID = 0;
  watch(
    () => session.value?.number,
    () => {
      cancelMethod();
      messages.value = getDummyMessages();
    },
    { immediate: true },
  );
  watch(readOnly, (value) => {
    if (value) cancelMethod();
  });
  const sendMethod = ({ text, attachments = [], model, automation }) => {
    if (readOnly.value || !sendTestMethod({ text })) return false;
    messages.value.push({
      id: `user-${++nextID}`,
      role: "user",
      text: text.trim(),
      // Attachments and model selections remain local during this text-only test.
      attachments: attachments.map(({ name, size, type }) => ({
        name,
        size,
        type,
      })),
      model,
      automation,
    });
    return true;
  };
  return { messages, busy, sendMethod };
}

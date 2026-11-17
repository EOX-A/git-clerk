import { computed, onScopeDispose, ref, watch } from "vue";
import { getDummyMessages } from "./chat-dummy.js";

export default function useSessionChat(session) {
  const messages = ref([]);
  const busy = ref(false);
  const readOnly = computed(() =>
    ["closed", "merged"].includes(session.value?.status),
  );
  let timer;
  let nextID = 0;
  const cancelMethod = () => {
    clearTimeout(timer);
    messages.value = messages.value.filter(
      (message) => message.role !== "status",
    );
    busy.value = false;
  };
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
    if (!text.trim() || busy.value || readOnly.value) return false;
    messages.value.push(
      {
        id: `user-${++nextID}`,
        role: "user",
        text: text.trim(),
        // Retain metadata for the UI, never read/upload attachment contents.
        attachments: attachments.map(({ name, size, type }) => ({
          name,
          size,
          type,
        })),
        model,
        automation,
      },
      {
        id: `pending-${nextID}`,
        role: "status",
        text: "Preparing a demo reply…",
      },
    );
    busy.value = true;
    timer = setTimeout(() => {
      messages.value = messages.value.filter(
        (message) => message.role !== "status",
      );
      messages.value.push({
        id: `assistant-${nextID}`,
        role: "assistant",
        text: "This is a sample reply. Your message was added to this demo conversation; no files or branches were changed.",
      });
      busy.value = false;
    }, 500);
    return true;
  };
  onScopeDispose(cancelMethod);
  return { messages, busy, sendMethod };
}

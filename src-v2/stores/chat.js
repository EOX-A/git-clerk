import { defineStore } from "pinia";
import { ref, shallowReactive } from "vue";
import { useRouter } from "vue-router";
import useSessionsStore from "./sessions.js";
import useGitStore from "./git.js";
import {
  createChatDraftSession,
  generateSessionTitle,
  publishChatDraft,
  readSessionDraft,
  streamChat,
  uploadSessionMedia,
} from "@/api/index.js";
import { prepareChatDraft } from "@/helpers/prepare-chat-draft.js";
import { createChatConversation } from "@/helpers/chat-conversation.js";
import { chatScopeKey, getChatConfig } from "@/helpers/chat-config.js";
import { chatPrTitle } from "@/helpers/chat-output.js";

export default defineStore("chat-v2", () => {
  const conversations = shallowReactive({});
  const router = useRouter();
  const newSessionRevision = ref(0);
  const sessions = useSessionsStore();
  const scopeMethod = () => {
    const { config } = useGitStore();
    const identity = [
      config.user.username,
      config.baseUrl,
      config.provider,
      config.repo,
    ].join(":");
    return `${chatScopeKey()}:${identity}`;
  };
  const getConversation = (number = "new") => {
    const scope = scopeMethod();
    const key = `${scope}:${number}`;
    if (!conversations[key]) {
      const chatConfig = getChatConfig();
      const conversation = createChatConversation({
        connect: sessions.ensureConnected,
        generate: streamChat,
        loadDraft: readSessionDraft,
        prepare: prepareChatDraft,
        publish: publishChatDraft,
        uploadMedia: uploadSessionMedia,
        generateTitle: generateSessionTitle,
        createDraft: (identity, attempt, onProgress) => {
          const username = useGitStore().context?.user?.username || "";
          return createChatDraftSession(
            {
              title: chatPrTitle(
                chatConfig.publishing.prTitle,
                identity,
                username,
              ),
              branchTitle: identity.title,
              body: chatConfig.publishing.prBody,
            },
            attempt,
            onProgress,
          );
        },
        onSaved: (session) => {
          sessions.rememberSession(session);
          conversations[`${scope}:${session.number}`] = conversation;
          if (conversations[`${scope}:new`] === conversation)
            delete conversations[`${scope}:new`];
        },
      });
      conversations[key] = conversation;
    }
    return conversations[key];
  };
  const startNewSession = async () => {
    const destination = { name: "new-session" };
    const samePage =
      router.currentRoute.value.fullPath ===
      router.resolve(destination).fullPath;
    // Run the normal navigation guards even when the temporary workspace is already at "/".
    const failure = await router.push({
      ...destination,
      force: true,
      replace: samePage,
    });
    if (failure) return false;

    const key = `${scopeMethod()}:new`;
    const temporary = conversations[key];
    if (temporary && !temporary.cancelMethod()) return false;
    delete conversations[key];
    newSessionRevision.value++;
    return true;
  };
  return { getConversation, scopeMethod, startNewSession, newSessionRevision };
});

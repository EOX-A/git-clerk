import { defineStore } from "pinia";
import { shallowReactive } from "vue";
import useSessionsStore from "./sessions.js";
import useOctokitStore from "./octokit.js";
import { publishChatDraft, streamChat, readSessionDraft } from "@/api/index.js";
import { prepareChatDraft } from "@/helpers/prepare-chat-draft.js";
import { createChatConversation } from "@/helpers/chat-conversation.js";
import { chatScopeKey } from "@/helpers/chat-config.js";

export default defineStore("chat-v2", () => {
  const conversations = shallowReactive({});
  const sessions = useSessionsStore();
  const scopeMethod = () => {
    const context = useOctokitStore().context;
    const identity = context
      ? `${context.githubUserData.login}:${context.githubConfig.username}/${context.githubConfig.repo}`
      : "connecting";
    return `${chatScopeKey()}:${identity}`;
  };
  const getConversation = (number = "new") => {
    const scope = scopeMethod();
    const key = `${scope}:${number}`;
    if (!conversations[key]) {
      const conversation = createChatConversation({
        connect: sessions.ensureConnected,
        generate: streamChat,
        loadDraft: readSessionDraft,
        prepare: prepareChatDraft,
        publish: publishChatDraft,
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
  return { getConversation, scopeMethod };
});

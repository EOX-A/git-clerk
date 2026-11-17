import { defineStore } from "pinia";
import { shallowReactive } from "vue";
import useSessionsStore from "./sessions.js";
import useOctokitStore from "./octokit.js";
import {
  publishOscDraft,
  streamOscChat,
  readOscSessionDraft,
} from "@/api/index.js";
import { prepareOscDraft } from "@/helpers/prepare-osc-draft.js";
import { createOscConversation } from "@/helpers/osc-conversation.js";

export default defineStore("chat-v2", () => {
  const conversations = shallowReactive({});
  const sessions = useSessionsStore();
  const scopeMethod = () => {
    const context = useOctokitStore().context;
    return context
      ? `${context.githubUserData.login}:${context.githubConfig.username}/${context.githubConfig.repo}`
      : "connecting";
  };
  const getConversation = (number = "new") => {
    const scope = scopeMethod();
    const key = `${scope}:${number}`;
    if (!conversations[key]) {
      const conversation = createOscConversation({
        connect: sessions.ensureConnected,
        generate: streamOscChat,
        loadDraft: readOscSessionDraft,
        prepare: prepareOscDraft,
        publish: publishOscDraft,
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

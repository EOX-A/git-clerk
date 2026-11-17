<script setup>
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import ChatIcon from "./ChatIcon.vue";
import ChatMenu from "./ChatMenu.vue";
import { getChatConfig } from "@/helpers/chat-config.js";
const chatConfig = getChatConfig();
const models = chatConfig.preset.models;

const props = defineProps({
  placeholder: {
    type: String,
    default: () => getChatConfig().preset.ui.placeholder,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  busy: Boolean,
  active: { type: Boolean, default: true },
  onSend: {
    type: Function,
    default: null,
  },
});

const message = ref("");
const textarea = ref(null);
const fileInput = ref(null);
const attachments = shallowRef([]);
const model = ref(models[0]?.label || "Auto");
const menu = ref("");
const menuTrigger = shallowRef(null);
const canSend = computed(
  () => Boolean(props.onSend) && !props.busy && message.value.trim().length > 0,
);

const resizeInputMethod = () => {
  if (!textarea.value) return;
  textarea.value.style.height = "auto";
  textarea.value.style.height = `${Math.min(260, Math.max(60, textarea.value.scrollHeight))}px`;
};
const attachFilesMethod = (event) => {
  // Files stay in memory; selecting them does not upload or read their contents.
  attachments.value = [...attachments.value, ...event.target.files];
  event.target.value = "";
};
const removeAttachmentMethod = (index) => {
  attachments.value = attachments.value.filter((_, i) => i !== index);
};
const closeMenuMethod = (restoreFocus = true) => {
  menu.value = "";
  if (restoreFocus) menuTrigger.value?.focus();
};
const openMenuMethod = (name, event) => {
  if (menu.value === name) return closeMenuMethod();
  menuTrigger.value = event.currentTarget;
  menu.value = name;
};
const selectOptionMethod = (item) => {
  closeMenuMethod();
  model.value = item.label;
};

const sendMethod = () => {
  if (!canSend.value) return;
  const payload = {
    text: message.value.trim(),
    attachments: [...attachments.value],
    model:
      models.find((item) => item.label === model.value)?.value || undefined,
  };
  if (props.onSend(payload) === false) return;
  message.value = "";
  attachments.value = [];
  nextTick(() => {
    resizeInputMethod();
    textarea.value?.focus();
  });
};

const inputKeyMethod = (event) => {
  if (event.isComposing || event.shiftKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    if (canSend.value) {
      sendMethod();
    }
  }
};
watch(
  () => props.active,
  async (active) => {
    closeMenuMethod(false);
    if (active) {
      await nextTick();
      resizeInputMethod();
    }
  },
);
defineExpose({
  setMessage: (text) => {
    if (props.busy) return;
    message.value = text;
    nextTick(() => {
      resizeInputMethod();
      textarea.value?.focus();
    });
  },
});
</script>

<template>
  <form
    :aria-label="onSend ? 'Session message' : 'New session message'"
    class="relative flex flex-col gap-1.5 rounded-composer border border-border bg-elev pt-3 pr-3 pb-2.5 pl-[18px] shadow-composer focus-within:border-primary"
    @submit.prevent="sendMethod"
  >
    <div v-if="attachments.length" class="flex flex-wrap gap-1.5 pt-0.5 pb-1">
      <span
        v-for="(file, index) in attachments"
        :key="index"
        class="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-lg bg-hover pr-[3px] pl-[9px] text-[12.5px]"
      >
        <ChatIcon name="file" class="size-3.5 text-muted" />
        <span :title="file.name" class="min-w-0 truncate">{{ file.name }}</span>
        <button
          type="button"
          :aria-label="`Remove ${file.name}`"
          title="Remove"
          class="flex size-[22px] shrink-0 items-center justify-center rounded-md text-muted hover:bg-border-soft hover:text-text"
          @click="removeAttachmentMethod(index)"
        >
          <ChatIcon name="x" class="size-3" />
        </button>
      </span>
    </div>
    <div class="grid min-w-0">
      <textarea
        ref="textarea"
        v-model="message"
        aria-label="Describe a change"
        :placeholder="placeholder"
        rows="2"
        class="relative col-start-1 row-start-1 min-h-[60px] w-full max-w-full resize-none border-0 bg-transparent py-1 text-sm leading-[22px] break-words text-text caret-text outline-none selection:bg-tint selection:text-text placeholder:text-muted focus-visible:outline-none"
        style="height: 60px; max-height: 260px"
        @input="resizeInputMethod"
        @keydown="inputKeyMethod"
      ></textarea>
    </div>
    <div class="-ml-2 flex flex-wrap items-center gap-1">
      <button
        type="button"
        aria-label="Attach files"
        v-if="chatConfig.features.attachments"
        title="Attach files"
        class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
        @click="fileInput.click()"
      >
        <ChatIcon name="plus" />
      </button>
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        tabindex="-1"
        aria-hidden="true"
        @change="attachFilesMethod"
      />
      <button
        type="button"
        :aria-label="`Model: ${model}`"
        v-if="chatConfig.features.modelSelector"
        aria-haspopup="listbox"
        :aria-expanded="menu === 'model'"
        :aria-controls="menu === 'model' ? 'chat-options' : undefined"
        class="inline-flex h-8 max-w-full items-center gap-1.5 rounded-2xl px-2.5 text-[12.5px] font-medium text-muted hover:bg-hover hover:text-text"
        @click="openMenuMethod('model', $event)"
        @keydown.down.prevent="openMenuMethod('model', $event)"
        @keydown.up.prevent="openMenuMethod('model', $event)"
      >
        <ChatIcon name="model" class="size-[15px]" /><span
          :class="compact ? 'sr-only' : 'truncate'"
          >{{ model }}</span
        ><ChatIcon name="chev-down" class="size-[13px]" />
      </button>
      <button
        type="submit"
        :disabled="!canSend"
        :aria-label="
          !onSend ? 'Send (coming soon)' : canSend ? 'Send (Enter)' : 'Send'
        "
        :title="
          !onSend
            ? 'Sending messages is coming soon'
            : busy
              ? 'Wait for the reply'
              : canSend
                ? 'Send (Enter)'
                : 'Type a message to send'
        "
        :class="
          canSend
            ? 'cursor-pointer bg-primary text-on-primary hover:brightness-110'
            : 'cursor-default bg-hover text-muted'
        "
        class="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
      >
        <ChatIcon name="send" />
      </button>
    </div>
    <ChatMenu
      v-if="menu"
      :key="menu"
      title="Model"
      :items="models"
      :selected="model"
      :trigger="menuTrigger"
      :on-select="selectOptionMethod"
      :on-close="closeMenuMethod"
    />
  </form>
</template>

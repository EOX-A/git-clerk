<script setup>
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import ChatIcon from "./ChatIcon.vue";
import ChatMenu from "./ChatMenu.vue";
import { CHAT_AUTOMATIONS, CHAT_MODELS } from "@/helpers/chat-options.js";

const props = defineProps({
  placeholder: {
    type: String,
    default: "Describe a change to your repository…",
  },
  compact: {
    type: Boolean,
    default: false,
  },
  busy: Boolean,
  showAutomation: Boolean,
  active: { type: Boolean, default: true },
  onSend: {
    type: Function,
    default: null,
  },
});

const message = ref("");
const textarea = ref(null);
const highlights = ref(null);
const fileInput = ref(null);
const attachments = shallowRef([]);
const automation = ref("");
const model = ref("Auto");
const hintHidden = ref(false);
const menu = ref("");
const menuTrigger = shallowRef(null);
const hasBlanks = computed(() => /\[ [^\[\]\n]+ \]/.test(message.value));
const segments = computed(() => message.value.split(/(\[ [^\[\]\n]+ \])/g));
const canSend = computed(
  () =>
    Boolean(props.onSend) &&
    !props.busy &&
    message.value.trim().length > 0 &&
    !hasBlanks.value,
);

const resizeInputMethod = () => {
  if (!textarea.value) return;
  textarea.value.style.height = "auto";
  textarea.value.style.height = `${Math.min(260, Math.max(60, textarea.value.scrollHeight))}px`;
};
const scrollInputMethod = () => {
  highlights.value.scrollTop = textarea.value.scrollTop;
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
const selectBlankMethod = (from = 0) => {
  const blanks = [...message.value.matchAll(/\[ [^\[\]\n]+ \]/g)];
  const blank = blanks.find((item) => item.index >= from) || blanks[0];
  if (!blank) return false;
  textarea.value.focus();
  textarea.value.setSelectionRange(blank.index, blank.index + blank[0].length);
  return true;
};
const selectOptionMethod = async (item) => {
  const type = menu.value;
  closeMenuMethod();
  if (type === "model") {
    model.value = item.label;
    return;
  }
  const selected = automation.value === item.label ? "" : item.label;
  const template = selected ? item.template : "";
  const untouched =
    !message.value.trim() ||
    CHAT_AUTOMATIONS.some((option) => option.template === message.value);
  message.value = untouched
    ? template
    : template
      ? `${message.value.trimEnd()}\n${template}`
      : message.value;
  automation.value = selected;
  hintHidden.value = false;
  await nextTick();
  resizeInputMethod();
  if (template) selectBlankMethod(message.value.length - template.length);
};

const sendMethod = () => {
  if (!canSend.value) return;
  const payload = {
    text: message.value.trim(),
    attachments: [...attachments.value],
    model: model.value,
    automation: automation.value,
  };
  if (props.onSend(payload) === false) return;
  message.value = "";
  attachments.value = [];
  automation.value = "";
  hintHidden.value = false;
  nextTick(() => {
    resizeInputMethod();
    textarea.value?.focus();
  });
};

const inputKeyMethod = (event) => {
  if (event.isComposing || event.shiftKey) return;
  if ((event.key === "Tab" || event.key === "Enter") && hasBlanks.value) {
    if (selectBlankMethod(textarea.value.selectionEnd)) event.preventDefault();
  } else if (event.key === "Enter") {
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
</script>

<template>
  <form
    :aria-label="onSend ? 'Session message' : 'New session message'"
    class="relative flex flex-col gap-1.5 rounded-composer border border-border bg-elev pt-3 pr-3 pb-2.5 pl-[18px] shadow-composer focus-within:border-primary"
    @submit.prevent="sendMethod"
  >
    <div
      v-if="showAutomation && automation && !hintHidden"
      role="status"
      class="-mt-3 -mr-3 mb-1 -ml-[18px] flex items-center gap-1.5 rounded-t-[19px] bg-tint px-[18px] py-1 text-meta font-medium text-primary"
    >
      <ChatIcon name="bolt" class="size-3" />
      <span class="min-w-0 flex-1">{{
        hasBlanks
          ? "Fill in the blue blanks before sending · Tab jumps to the next one"
          : onSend
            ? "All filled in · press Enter to send"
            : "All filled in"
      }}</span>
      <button
        type="button"
        aria-label="Hide tip"
        title="Hide tip"
        class="-my-0.5 -mr-2.5 flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-hover"
        @click="hintHidden = true"
      >
        <ChatIcon name="x" class="size-[15px]" />
      </button>
    </div>
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
      <div
        ref="highlights"
        aria-hidden="true"
        class="pointer-events-none col-start-1 row-start-1 max-h-[260px] overflow-hidden py-1 text-sm leading-[22px] whitespace-pre-wrap break-words text-text"
      >
        <template v-for="(segment, index) in segments" :key="index"
          ><span
            :class="
              segment.startsWith('[ ') && segment.endsWith(' ]')
                ? 'rounded bg-blank text-primary'
                : ''
            "
            >{{ segment }}</span
          ></template
        >{{ "\n" }}
      </div>
      <textarea
        ref="textarea"
        v-model="message"
        aria-label="Describe a change"
        :placeholder="placeholder"
        rows="2"
        class="relative col-start-1 row-start-1 min-h-[60px] w-full max-w-full resize-none border-0 bg-transparent py-1 text-sm leading-[22px] break-words text-transparent caret-text outline-none selection:bg-tint selection:text-text placeholder:text-muted focus-visible:outline-none"
        style="height: 60px; max-height: 260px"
        @input="resizeInputMethod"
        @scroll="scrollInputMethod"
        @keydown="inputKeyMethod"
      ></textarea>
    </div>
    <div class="-ml-2 flex flex-wrap items-center gap-1">
      <button
        type="button"
        aria-label="Attach files"
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
        v-if="showAutomation"
        type="button"
        :aria-label="`Automation: ${automation || 'none'}`"
        aria-haspopup="listbox"
        :aria-expanded="menu === 'automation'"
        :aria-controls="menu === 'automation' ? 'chat-options' : undefined"
        :class="automation ? 'bg-tint text-primary' : 'text-muted'"
        class="inline-flex h-8 max-w-full items-center gap-1.5 rounded-2xl px-2.5 text-[12.5px] font-medium hover:bg-hover"
        @click="openMenuMethod('automation', $event)"
        @keydown.down.prevent="openMenuMethod('automation', $event)"
        @keydown.up.prevent="openMenuMethod('automation', $event)"
      >
        <ChatIcon name="bolt" class="size-[15px]" /><span
          :class="compact ? 'sr-only' : 'truncate'"
          >{{ automation || "Automation" }}</span
        ><ChatIcon name="chev-down" class="size-[13px]" />
      </button>
      <button
        type="button"
        :aria-label="`Model: ${model}`"
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
      v-if="menu && (menu !== 'automation' || showAutomation)"
      :key="menu"
      :title="menu === 'automation' ? 'Automation' : 'Model'"
      :items="menu === 'automation' ? CHAT_AUTOMATIONS : CHAT_MODELS"
      :selected="menu === 'automation' ? automation : model"
      :trigger="menuTrigger"
      :on-select="selectOptionMethod"
      :on-close="closeMenuMethod"
    />
  </form>
</template>

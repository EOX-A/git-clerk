<script setup>
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from "vue";
import ChatIcon from "./ChatIcon.vue";
import ChatMenu from "./ChatMenu.vue";
import { getChatConfig } from "@/helpers/chat-config.js";
import { isImageFile } from "@/api/media-upload.js";
const chatConfig = getChatConfig();
const models = chatConfig.preset.models;

const props = defineProps({
  placeholder: {
    type: String,
    default: () => getChatConfig().preset.ui.placeholder,
  },
  starter: Boolean,
  compact: {
    type: Boolean,
    default: false,
  },
  busy: Boolean,
  blockedReason: { type: String, default: "" },
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
const attachmentPreviews = new WeakMap();
const draggingOver = ref(false);
let dragDepth = 0;
const model = ref(models[0]?.label || "Auto");
const menu = ref("");
const menuTrigger = shallowRef(null);
const canAttach = computed(
  () =>
    Boolean(chatConfig.features.attachments) &&
    !props.busy &&
    !props.blockedReason,
);
const canSend = computed(
  () =>
    Boolean(props.onSend) &&
    !props.busy &&
    !props.blockedReason &&
    message.value.trim().length > 0,
);

const previewForFile = (file) => {
  if (!isImageFile(file)) return null;
  if (attachmentPreviews.has(file)) return attachmentPreviews.get(file);
  if (typeof URL?.createObjectURL === "function") {
    const url = URL.createObjectURL(file);
    attachmentPreviews.set(file, url);
    return url;
  }
  return null;
};

const revokePreviewForFile = (file) => {
  const url = attachmentPreviews.get(file);
  if (url && typeof URL?.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
  attachmentPreviews.delete(file);
};

const addFilesMethod = (files) => {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return;
  attachments.value = [...attachments.value, ...list];
};

const resizeInputMethod = () => {
  if (!textarea.value) return;
  textarea.value.style.height = "auto";
  textarea.value.style.height = `${Math.min(260, Math.max(60, textarea.value.scrollHeight))}px`;
};
const attachFilesMethod = (event) => {
  addFilesMethod(event.target.files);
  event.target.value = "";
};
const removeAttachmentMethod = (index) => {
  const removed = attachments.value[index];
  if (removed) revokePreviewForFile(removed);
  attachments.value = attachments.value.filter((_, i) => i !== index);
};
const dragEnterMethod = (event) => {
  if (!canAttach.value) return;
  if (!event.dataTransfer?.types?.includes("Files")) return;
  dragDepth++;
  draggingOver.value = true;
};
const dragOverMethod = (event) => {
  if (!canAttach.value) return;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
};
const dragLeaveMethod = () => {
  if (!canAttach.value) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) draggingOver.value = false;
};
const dropMethod = (event) => {
  dragDepth = 0;
  draggingOver.value = false;
  if (!canAttach.value) return;
  addFilesMethod(event.dataTransfer?.files);
};
const pasteMethod = (event) => {
  if (!canAttach.value) return;
  const items = Array.from(event.clipboardData?.items || []);
  const itemFiles = items
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const files = itemFiles.length
    ? itemFiles
    : Array.from(event.clipboardData?.files || []);
  if (!files.length) return;
  event.preventDefault();
  addFilesMethod(files);
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
  for (const file of attachments.value) revokePreviewForFile(file);
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
onUnmounted(() => {
  for (const file of attachments.value) revokePreviewForFile(file);
});
defineExpose({
  setMessage: (text) => {
    if (props.busy || props.blockedReason) return;
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
    :class="
      draggingOver
        ? 'border-primary bg-tint/20 ring-2 ring-primary/25'
        : 'border-border bg-elev'
    "
    class="relative flex flex-col gap-1.5 rounded-composer border pt-3 pr-3 pb-2.5 pl-[18px] shadow-composer transition-colors focus-within:border-primary"
    @submit.prevent="sendMethod"
    @dragenter.prevent="dragEnterMethod"
    @dragover.prevent="dragOverMethod"
    @dragleave.prevent="dragLeaveMethod"
    @drop.prevent="dropMethod"
  >
    <div v-if="attachments.length" class="flex flex-wrap gap-1.5 pt-0.5 pb-1">
      <span
        v-for="(item, index) in attachments"
        :key="index"
        class="inline-flex h-7 max-w-[260px] items-center gap-1.5 rounded-lg bg-hover pr-[3px] pl-[7px] text-[12.5px]"
      >
        <img
          v-if="previewForFile(item)"
          :src="previewForFile(item)"
          :alt="item.name"
          class="size-5 shrink-0 rounded object-cover"
        />
        <ChatIcon v-else name="file" class="size-3.5 shrink-0 text-muted" />
        <span :title="item.name" class="min-w-0 truncate">{{
          item.name
        }}</span>
        <button
          type="button"
          :aria-label="`Remove ${item.name}`"
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
        @paste="pasteMethod"
      ></textarea>
    </div>
    <div class="-ml-2 flex flex-wrap items-center gap-1">
      <button
        type="button"
        :aria-label="starter ? 'Add Items' : 'Attach files'"
        v-if="chatConfig.features.attachments"
        title="Attach files"
        :class="starter ? 'gap-1.5 px-2' : 'w-8'"
        class="flex h-8 shrink-0 items-center justify-center rounded-full text-ui text-muted hover:bg-hover hover:text-text"
        @click="fileInput.click()"
      >
        <ChatIcon name="plus" /><span v-if="starter">Add Items</span>
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
          blockedReason ||
          (!onSend
            ? 'Sending messages is coming soon'
            : busy
              ? 'Wait for the reply'
              : canSend
                ? 'Send (Enter)'
                : 'Type a message to send')
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

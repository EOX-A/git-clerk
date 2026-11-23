// Pace received Markdown independently of publishing and route changes.
export function createChatTextReveal(message) {
  const wordEnd = /\S*\s*/y;
  let target = message.text;
  let advance = 1;
  let timer;

  function finish() {
    clearTimeout(timer);
    timer = undefined;
    message.text = target;
    message.revealing = false;
  }

  function revealNext() {
    if (globalThis.document?.hidden) return finish();
    wordEnd.lastIndex = Math.min(message.text.length + advance, target.length);
    wordEnd.exec(target);
    message.text = target.slice(0, wordEnd.lastIndex);
    message.revealing = message.text.length < target.length;
    timer = message.revealing ? setTimeout(revealNext, 32) : undefined;
  }

  function update(text) {
    if (text === target) return;
    target = text;
    if (
      !target.startsWith(message.text) ||
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return finish();

    // Use larger word groups for long replies to keep the reveal brief.
    advance = Math.max(
      1,
      Math.ceil((target.length - message.text.length) / 80),
    );
    if (timer === undefined) revealNext();
  }

  return { update, finish };
}

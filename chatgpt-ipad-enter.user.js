// ==UserScript==
// @name         ChatGPT iPad: Enter sends, Command+Enter adds a line
// @namespace    local.chatgpt.ipad.keyboard
// @version      1.1.0
// @author       Yasser Noori
// @description  Magic Keyboard shortcuts for the ChatGPT message composer in Safari.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const editorFor = (target) => target instanceof Element
    ? target.closest('#prompt-textarea, #mobile-composer-prompt') : null;
  let newlineUntil = 0;
  let handledUntil = 0;
  let insertingLine = false;

  function sendMessage(editor) {
    const selector = 'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]';
    const scope = editor.closest('form') || editor.closest('main') || document;
    const send = scope.querySelector(selector) || document.querySelector(selector);
    if (send && !send.disabled && send.getAttribute('aria-disabled') !== 'true') send.click();
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const editor = editorFor(event.target);
    if (!editor) return;
    if (event.ctrlKey || event.altKey) return;
    // Leave Shift+Enter available as the website's usual newline shortcut.
    if (event.shiftKey && !event.metaKey) {
      newlineUntil = Date.now() + 500;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    handledUntil = Date.now() + 500;
    if (event.repeat) return;

    if (event.metaKey) {
      newlineUntil = Date.now() + 500;
      insertingLine = true;
      try {
      if (editor instanceof HTMLTextAreaElement) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.setRangeText('\n', start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (editor.isContentEditable) {
        // Safari's editing command preserves the contenteditable editor's
        // selection and notifies its normal input handlers.
        document.execCommand('insertLineBreak', false);
      }
      } finally {
        insertingLine = false;
      }
      return;
    }

    newlineUntil = 0;
    sendMessage(editor);
  }, true);

  // Some iPad input paths deliver a newline through beforeinput instead.
  window.addEventListener('beforeinput', (event) => {
    if (insertingLine || event.isComposing || !event.cancelable) return;
    if (!['insertParagraph', 'insertLineBreak'].includes(event.inputType)) return;
    const editor = editorFor(event.target);
    if (!editor || Date.now() < newlineUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (Date.now() >= handledUntil) sendMessage(editor);
  }, true);
})();

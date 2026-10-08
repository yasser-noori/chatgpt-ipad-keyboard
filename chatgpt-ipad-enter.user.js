// ==UserScript==
// @name         ChatGPT iPad: Enter sends, Command+Enter adds a line
// @namespace    local.chatgpt.ipad.keyboard
// @version      1.0.0
// @author       Yasser Noori
// @description  Magic Keyboard shortcuts for the ChatGPT message composer in Safari.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const editor = target.closest('#prompt-textarea');
    if (!editor) return;
    if (event.ctrlKey || event.altKey) return;
    // Leave Shift+Enter available as the website's usual newline shortcut.
    if (event.shiftKey && !event.metaKey) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;

    if (event.metaKey) {
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
      return;
    }

    const scope = editor.closest('form') || editor.closest('main') || document;
    const send = scope.querySelector('button[data-testid="send-button"]')
      || scope.querySelector('button[aria-label="Send prompt"]')
      || scope.querySelector('button[aria-label="Send message"]');
    if (send && !send.disabled && send.getAttribute('aria-disabled') !== 'true') {
      send.click();
    }
  }, true);
})();

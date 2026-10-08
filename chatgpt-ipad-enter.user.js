// ==UserScript==
// @name         ChatGPT iPad: Enter sends, Command+Enter adds a line
// @namespace    local.chatgpt.ipad.keyboard
// @version      1.3.0
// @author       Yasser Noori
// @description  Magic Keyboard shortcuts for the ChatGPT message composer in Safari.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  let badge;
  function status(message) {
    if (!document.body) return;
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'enter-shortcut-status';
      badge.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:2147483647;background:#163724;color:white;padding:6px 10px;border-radius:6px;font:12px system-ui;pointer-events:none;';
      document.body.appendChild(badge);
    }
    badge.textContent = 'Enter shortcuts v1.3: ' + message;
  }
  if (document.body) status('loaded');
  else document.addEventListener('DOMContentLoaded', () => status('loaded'), { once: true });

  const sendSelector = 'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]';
  function editorFor(target) {
    if (!(target instanceof Element)) return null;
    const known = target.closest('#prompt-textarea, #mobile-composer-prompt');
    if (known) return known;
    const editable = target.closest('textarea, [contenteditable="true"], [role="textbox"]');
    if (!editable) return null;
    // Composer IDs vary between ChatGPT layouts. Identify an editable box
    // by its enclosing send controls, while leaving search fields alone.
    for (let container = editable.parentElement; container && container !== document.body; container = container.parentElement) {
      if (container.querySelector(sendSelector)) return editable;
      if (container.tagName === 'MAIN') break;
    }
    return null;
  }
  let newlineUntil = 0;
  let handledUntil = 0;
  let insertingLine = false;

  function sendMessage(editor) {
    const selector = sendSelector;
    const scope = editor.closest('form') || editor.closest('main') || document;
    const send = [...scope.querySelectorAll(selector), ...document.querySelectorAll(selector)]
      .find(button => button.getClientRects().length && !button.disabled && button.getAttribute('aria-disabled') !== 'true');
    if (send) {
      status('Enter detected; clicked Send');
      send.click();
    } else status('Enter detected; no enabled Send button');
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const editor = editorFor(event.target);
    if (!editor) {
      status('Enter detected outside recognized composer');
      return;
    }
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
      status('Command+Enter detected');
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

// ==UserScript==
// @name         ChatGPT: Enter sends, Command+Enter adds a line
// @namespace    local.chatgpt.ipad.keyboard
// @version      2.1.0
// @author       Yasser Noori
// @description  Enter clicks Send; Command+Enter inserts a newline in Safari.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  let boundSend, signature;
  let insertingLine = false, newlineUntil = 0, handledUntil = 0;
  try { signature = JSON.parse(localStorage.getItem('chatgpt-enter-send-control')); } catch (_) {}

  function roots() {
    const result = [document];
    for (let i = 0; i < result.length; i++) {
      for (const element of result[i].querySelectorAll('*')) {
        if (element.shadowRoot) result.push(element.shadowRoot);
      }
    }
    return result;
  }
  function visible(button) {
    if (!button || !button.isConnected || !button.getClientRects().length) return false;
    const style = getComputedStyle(button);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }
  function ready(button) {
    return visible(button) && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
  }

  function sendButton() {
    if (ready(boundSend)) return boundSend;
    const selectors = [
      'button[data-testid="send-button"]', 'button[data-testid="composer-send-button"]',
      'button#composer-submit-button', 'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]', 'button[aria-label="Send"]', 'button[title="Send message"]'
    ];
    if (signature) {
      for (const root of roots()) {
        for (const button of root.querySelectorAll('button, [role="button"]')) {
          if (signature.attributes.every(([name, value]) => button.getAttribute(name) === value) && ready(button)) return button;
        }
      }
    }
    for (const root of roots()) {
      for (const selector of selectors) {
        const button = [...root.querySelectorAll(selector)].find(ready);
        if (button) return button;
      }
    }
    return null;
  }

  function elements(event) {
    let active = document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
    const selection = document.getSelection();
    const anchor = selection && selection.anchorNode;
    return [...(event.composedPath ? event.composedPath() : [event.target]), active,
      anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement)]
      .filter(node => node && node.nodeType === 1);
  }
  function unrelatedControl(event) {
    const target = elements(event)[0];
    if (!target) return false;
    return !!target.closest('a, button, select, [role="dialog"], [role="menu"], [data-message-author-role], input:not([type="hidden"])');
  }
  function editorFor(event) {
    for (const element of elements(event)) {
      if (element.tagName === 'TEXTAREA') return element;
      if (element.isContentEditable) {
        let editor = element;
        while (editor.parentElement && editor.parentElement.isContentEditable) editor = editor.parentElement;
        return editor;
      }
    }
    return null;
  }
  function block(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  window.addEventListener('click', event => {
    // Optional rebinding without any persistent on-page controls:
    // hold Option+Shift and click Send once. This selection click does not send.
    if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) return;
    const button = elements(event).map(element => element.closest('button, [role="button"]')).find(Boolean);
    if (!button) return;
    block(event);
    boundSend = button;
    const attributes = ['id', 'data-testid', 'aria-label', 'title'].map(name => [name, button.getAttribute(name)]).filter(([, value]) => value);
    signature = attributes.length ? { attributes } : null;
    try {
      if (signature) localStorage.setItem('chatgpt-enter-send-control', JSON.stringify(signature));
      else localStorage.removeItem('chatgpt-enter-send-control');
    } catch (_) {}
  }, true);

  function newline(editor) {
    insertingLine = true;
    try {
      if (editor.tagName === 'TEXTAREA') {
        editor.setRangeText('\n', editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        return true;
      }
      return document.execCommand('insertLineBreak', false);
    } finally { insertingLine = false; }
  }

  window.addEventListener('keydown', event => {
    if (!(event.key === 'Enter' || event.code === 'NumpadEnter' || event.keyCode === 13)) return;
    if (event.isComposing || event.ctrlKey || event.altKey || unrelatedControl(event)) return;
    if (event.shiftKey && !event.metaKey) {
      newlineUntil = Date.now() + 500;
      return;
    }
    if (event.metaKey) {
      const editor = editorFor(event);
      if (!editor) return;
      block(event);
      newlineUntil = Date.now() + 500;
      handledUntil = Date.now() + 500;
      if (!event.repeat) newline(editor);
      return;
    }
    // Enter no longer depends on recognizing the composer.
    const send = sendButton();
    if (!send) return;
    block(event);
    newlineUntil = 0;
    handledUntil = Date.now() + 500;
    if (event.repeat) return;
    send.click();
  }, true);

  window.addEventListener('beforeinput', event => {
    if (insertingLine || event.isComposing || !event.cancelable || unrelatedControl(event)) return;
    if (!['insertParagraph', 'insertLineBreak'].includes(event.inputType) || Date.now() < newlineUntil) return;
    if (Date.now() < handledUntil) { block(event); return; }
    const send = sendButton();
    if (!send) return;
    block(event);
    handledUntil = Date.now() + 500;
    send.click();
  }, true);
})();

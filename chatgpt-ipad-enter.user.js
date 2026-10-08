// ==UserScript==
// @name         ChatGPT: Enter sends, Command+Enter adds a line
// @namespace    local.chatgpt.ipad.keyboard
// @version      2.0.0
// @author       Yasser Noori
// @description  Enter clicks Send; Command+Enter inserts a newline in Safari.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  let badge, label, pickButton, boundSend, binding = false, signature;
  let insertingLine = false, newlineUntil = 0, handledUntil = 0;
  try { signature = JSON.parse(localStorage.getItem('chatgpt-enter-send-control')); } catch (_) {}

  function status(message) {
    if (!document.body) return;
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'enter-shortcut-status';
      badge.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:2147483647;background:#163724;color:white;padding:6px 10px;border-radius:6px;font:12px system-ui;';
      label = document.createElement('span');
      pickButton = document.createElement('button');
      pickButton.textContent = 'Choose Send';
      pickButton.style.cssText = 'margin-left:8px;padding:3px 6px;cursor:pointer;color:black;background:white;border:0;border-radius:4px;';
      pickButton.addEventListener('click', () => {
        binding = true;
        status('Click your message’s Send arrow once to select it');
      });
      badge.append(label, pickButton);
      document.body.appendChild(badge);
    }
    label.textContent = 'Enter shortcuts v2.0: ' + message;
  }
  if (document.body) status('loaded');
  else document.addEventListener('DOMContentLoaded', () => status('loaded'), { once: true });

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
    if (!binding || elements(event).some(element => element === badge || element === pickButton)) return;
    block(event);
    const button = elements(event).map(element => element.closest('button, [role="button"]')).find(Boolean);
    if (!button) {
      status('That was not a button; click the Send arrow');
      return;
    }
    boundSend = button;
    const attributes = ['id', 'data-testid', 'aria-label', 'title'].map(name => [name, button.getAttribute(name)]).filter(([, value]) => value);
    signature = attributes.length ? { attributes } : null;
    try {
      if (signature) localStorage.setItem('chatgpt-enter-send-control', JSON.stringify(signature));
      else localStorage.removeItem('chatgpt-enter-send-control');
    } catch (_) {}
    binding = false;
    status('Send selected; focus your message and press Enter');
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
      if (!editor) { status('Command+Enter: focused editable not found'); return; }
      block(event);
      newlineUntil = Date.now() + 500;
      handledUntil = Date.now() + 500;
      if (!event.repeat) status(newline(editor) ? 'Command+Enter: added line' : 'Command+Enter: newline command failed');
      return;
    }
    // Enter no longer depends on recognizing the composer.
    const send = sendButton();
    if (!send) { status('Enter: no active Send button; use Choose Send'); return; }
    block(event);
    newlineUntil = 0;
    handledUntil = Date.now() + 500;
    if (event.repeat) return;
    status('Enter: clicked Send');
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
    status('Return input: clicked Send');
    send.click();
  }, true);
})();


# ChatGPT iPad keyboard shortcuts

By Yasser Noori (@yasser-noori).

A Safari userscript for ChatGPT with a Mac keyboard or an iPad Magic Keyboard:

- Enter sends the message.
- Command + Enter inserts a new line.
- Shift + Enter keeps the usual newline behavior.

## Installation

Import `chatgpt-ipad-enter.user.js` into your Safari userscript extension,
enable it for `chatgpt.com`, and reload ChatGPT.

Replace older copies rather than running multiple versions together.
Version 2.0 shows a small green status panel at the bottom left.

If automatic Send-button detection fails:

1. Type a draft so the Send arrow appears.
2. Click **Choose Send** in the green panel.
3. Click ChatGPT's Send arrow once. This click selects the button without
   submitting the draft.
4. Click back into your draft and press Enter.

The chosen button's identifying attributes are saved in your browser. If a
layout change replaces an unlabeled button, use **Choose Send** again.

The script only runs on `chatgpt.com` and `chat.openai.com`. It does not
make network requests or store your messages.

## Compatibility

Version 2.0 does not require a specific message-box ID for Enter to send.
Command+Enter uses the focused textarea or contenteditable field.

Verified in a local browser test with an unknown composer ID, a manually
selected Send button, a shadow-root textarea, a plaintext-only editable field,
and a search field that retains its usual behavior. Actual Safari on Mac and
iPad still needs user verification.

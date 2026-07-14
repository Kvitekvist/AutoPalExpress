# TICKET-0134

**Status**

Closed

**Type**

Bug / Enhancement

**Priority**

High

**Created**

2026-07-14

---

## Description

Two related follow-ups on the Deploy New Server dialog:

1. Clicking the Browse folder icon for the install location appeared to do nothing. Root cause: TICKET-0131 replaced the in-process `tkinter` folder picker with a PowerShell subprocess showing `System.Windows.Forms.FolderBrowserDialog`, but a `TopMost`/`Activate()`-only owner form isn't enough to make Windows actually grant it keyboard/foreground focus - Windows deliberately restricts which processes may steal foreground state from whatever the user is currently interacting with. The dialog was genuinely opening, just silently behind the browser window, looking exactly like "nothing happened."
2. The "Install Location" label should read "Server Deployment Location" instead.

---

## Reason

Direct user report and request, made mid-conversation while TICKET-0133 was in progress.

---

## Implementation Plan

* [x] `app/services/native_dialog.py`: added the standard `AttachThreadInput` workaround (a small embedded C# `ApexForceForeground` helper, `Add-Type -TypeDefinition`) - briefly shares input state with whatever currently has focus so `SetForegroundWindow` is actually honored for the dialog's owner form, called right after the owner form is shown and before `ShowDialog`.
* [x] `web/src/components/settings/DeployServerWizard.tsx`: relabeled "Install Location" to "Server Deployment Location".

---

## Files Modified

* `app/services/native_dialog.py`
* `web/src/components/settings/DeployServerWizard.tsx`

---

## Testing

* `python -m py_compile app/services/native_dialog.py` - passes.
* `npx tsc --noEmit` - passes.
* Real, live before/after comparison (not just code review): confirmed with `GetForegroundWindow()` that *before* this fix, the dialog opened without becoming the foreground window (VS Code stayed focused); *after* adding `AttachThreadInput`, `GetForegroundWindow()` correctly returned "Browse For Folder" - the exact regression reproduced and then confirmed fixed via the real running dialog, not assumed.

---

## Result

The folder picker now reliably comes to the foreground when Browse is clicked, and the deploy dialog's location field is labeled "Server Deployment Location".

---

## Closed

2026-07-14

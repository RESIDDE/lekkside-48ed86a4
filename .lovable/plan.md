

## Plan: Add "Receive to Email" Retry Button

This feature will add a manual retry button on the registration success screen, allowing users to resend the confirmation ticket to their email if the initial send failed.

### What This Solves
Currently, if the automatic email fails during registration, users have no way to receive their ticket via email. This button provides a fallback mechanism.

### User Experience
1. After registration, the ticket is displayed on screen
2. If an email was provided, users see:
   - The current text: "A copy of this ticket has been sent to your email"
   - A new **"Resend to Email"** button
3. Clicking the button:
   - Shows a loading spinner
   - Calls the `send-confirmation-ticket` function again
   - Updates the debug panel with the new result
   - Shows success/error toast notification

### Technical Changes

#### File: `src/pages/PublicForm.tsx`

**1. Add State for Resend**
```text
- isResendingEmail: boolean (tracks loading state)
- resendAttempts: number (optional - track retry count)
```

**2. Add Resend Handler Function**
```text
const handleResendEmail = async () => {
  - Set loading state
  - Call supabase.functions.invoke('send-confirmation-ticket')
    with the same payload used during registration
  - Update emailDebugInfo with the new response
  - Show toast notification based on result
  - Clear loading state
}
```

**3. Update Success Screen UI**
Replace the static text "A copy of this ticket has been sent to..." with:
```text
- If email was provided:
  - Show current status message
  - Show "Resend to Email" button with Mail icon
  - Button shows loading spinner when sending
  - Optionally show retry count if multiple attempts
```

### Visual Design
```text
+----------------------------------+
|       [Registration Ticket]      |
+----------------------------------+
|                                  |
|  📧 Ticket sent to your email    |
|                                  |
|  [📨 Resend to Email]  <-- NEW   |
|                                  |
|  [▼ Email Debug Info - Sent]     |
|                                  |
+----------------------------------+
```

### Files to Modify
1. **`src/pages/PublicForm.tsx`**
   - Add `isResendingEmail` state
   - Add `handleResendEmail` function
   - Update success screen to include the resend button
   - Wire up button click to handler

### Edge Cases Handled
- Button disabled while sending
- Loading spinner feedback
- Success/error toast notifications
- Debug panel updates with each send attempt
- Works even if initial send failed


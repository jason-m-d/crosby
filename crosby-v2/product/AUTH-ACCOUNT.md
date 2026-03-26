# Authentication & Account Management — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

The authentication system handles how users create accounts, log in, stay logged in, and manage their account lifecycle. Crosby uses Supabase Auth as the foundation — no custom auth system.

---

## Account Creation

### Flow
1. User arrives at landing page → taps "Get Started"
2. Two options:
   - **Sign in with Google** (preferred path) — single tap, OAuth consent screen, account created, lands in app. This is the happy path because they'll need Google for Gmail + Calendar anyway.
   - **Email + password** — enter email, create password, verify email, lands in app. They'll be prompted to connect Google later during onboarding.
3. After auth completes → Crosby's conversational onboarding takes over (see ONBOARDING.md)

### Why Google OAuth is the preferred path
- Users need to connect Gmail and Google Calendar regardless — doing it at sign-up eliminates a second OAuth prompt during onboarding
- One less password to remember
- Higher conversion (fewer steps)
- Crosby can start the email scan immediately, enabling the "wow" moment faster

### What happens on first sign-in
- User record created in Supabase Auth
- Crosby user profile row created (timezone defaults to browser/device, language defaults to English)
- If Google OAuth: Gmail and Calendar connections are automatically established from the OAuth scopes
- Onboarding conversation begins (see ONBOARDING.md)

---

## Login

### Web
- **Persistent session.** User stays logged in until they explicitly log out. No "remember me" checkbox — it's always remembered.
- Session token stored in an HTTP-only cookie (Supabase default behavior).
- Token refresh is automatic and silent — Supabase handles this.

### Mobile (iOS)
- **First login:** Email + password or Google OAuth, same as web.
- **Subsequent opens:** Biometric unlock (Face ID / Touch ID). The session token is stored in the iOS Keychain. If biometrics fail or aren't set up, fall back to password entry.
- Session persists indefinitely unless the user logs out or the refresh token expires (Supabase default: 7 days of inactivity).

### Multi-device
- Both web and mobile can be logged in simultaneously. This is the expected normal state.
- No device limit. No "you've been logged out on another device" messages.
- All state is server-side (see multi-device sync resolution in GAPS-AND-CONTRADICTIONS.md #3) — both clients read/write the same data.

---

## Password Management

### Reset flow
1. User taps "Forgot password" on login screen
2. Enters email → Supabase sends reset link
3. User clicks link → lands on reset page → enters new password → redirected to app (logged in)

### Change password (already logged in)
- Settings → Account → Change Password
- Or tell Crosby: "I want to change my password" → Crosby provides a link/button to the password change flow
- Requires current password confirmation

### Password requirements
- Minimum 8 characters
- No complexity rules beyond length (complexity rules don't improve security and frustrate users)

---

## Session Handling

| Platform | Session storage | Duration | Refresh |
|---|---|---|---|
| Web | HTTP-only cookie | Until logout or 7 days inactive | Automatic (Supabase) |
| Mobile | iOS Keychain | Until logout or 7 days inactive | Automatic (Supabase) |

### Session expiration
- If the refresh token expires (7 days of inactivity), the user is redirected to login on next app open.
- Crosby doesn't lose any data — everything is server-side. The user just needs to re-authenticate.
- On mobile, biometric unlock re-authenticates silently if the session is still valid.

### Logout
- Settings → Account → Log Out
- Or tell Crosby: "Log me out"
- Logout clears the session token on that device only. Other devices remain logged in.
- No confirmation dialog — just log out. (Account deletion has a confirmation; logout doesn't need one.)

---

## OAuth Scopes (Google)

When a user signs in with Google or connects Google later during onboarding, the OAuth consent screen requests:

| Scope | Purpose |
|---|---|
| `email` + `profile` | Basic identity for account creation |
| `gmail.readonly` | Email scanning (read inbox, no send permission at sign-up) |
| `gmail.send` | Email sending (requested separately when user first tries to send via Crosby) |
| `calendar.readonly` | Calendar reading (events, availability) |
| `calendar.events` | Calendar writing (event creation/modification, requested when user first creates an event) |

### Progressive scope requests
Not all scopes are requested at sign-up. The principle: **ask for permission when the user first needs it, not upfront.**

- **At sign-up (Google OAuth):** `email`, `profile`, `gmail.readonly`, `calendar.readonly` — enough to read email and calendar for the onboarding "wow" moment
- **First email send:** Crosby requests `gmail.send` scope via incremental authorization
- **First event creation:** Crosby requests `calendar.events` scope via incremental authorization

Each incremental authorization uses the bottom sheet OAuth flow (stays in-app, as specced in ONBOARDING.md).

---

## Account Deletion

Fully specced in DATA-DELETION-PRIVACY.md. Summary:
- Settings → Account → Delete Account
- 24-hour grace period
- Confirmation string: "BYE BYE CROSBY"
- Full data nuke after grace period

---

## What's NOT in v2

- **No team/org accounts.** Crosby v2 is single-user. Multi-user (household, team) is a future consideration.
- **No SSO/SAML.** Consumer product, not enterprise.
- **No two-factor authentication.** Google OAuth provides the security baseline. Dedicated 2FA (TOTP, SMS codes) can be added later if needed.
- **No magic link login.** Email + password or Google OAuth only. Magic links add complexity without clear benefit for this use case.
- **No social login beyond Google.** Apple Sign-In may be required for App Store compliance (if the app offers Google sign-in, Apple requires Apple sign-in as an option). Flag this during mobile development — may need to add Apple OAuth.

---

## Ripple Effects

- **Onboarding** — auth is the gate before onboarding begins. Google OAuth path enables faster "wow" moment.
- **Email management** — Gmail OAuth scopes are established at auth time (read) or incrementally (send).
- **Calendar integration** — same progressive scope model as email.
- **Settings** — Account tab shows profile, subscription, password change, logout, delete account.
- **Mobile experience** — biometric unlock, Keychain storage, bottom sheet OAuth for incremental scopes.
- **Error handling** — if OAuth token refresh fails, integration health degrades to "disconnected" and Crosby prompts reconnection (see ERROR-HANDLING-GRACEFUL-DEGRADATION.md).
- **App Store compliance** — may require Apple Sign-In alongside Google Sign-In for iOS app approval.

---

## Open Questions

- [ ] Apple Sign-In: is it required for App Store approval given we offer Google Sign-In? If yes, add it to v2 scope.
- [ ] Should the 7-day inactivity session expiration be longer? A user who goes on vacation for 2 weeks will need to re-login. Could extend to 30 days.
- [ ] Should Crosby detect a new device login and mention it? ("Looks like you're on a new device — welcome.") Nice touch but not critical.

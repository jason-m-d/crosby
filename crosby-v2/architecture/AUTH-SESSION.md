# Auth & Session Architecture — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

Authentication uses Supabase Auth with no custom auth layer. Google OAuth is the preferred sign-up path. Sessions are persistent (stay logged in). The mobile app uses biometric unlock after initial login.

---

## Auth Flow

### Sign Up (Google OAuth — Happy Path)

```
User taps "Sign in with Google"
  → Redirect to Google consent screen (web) or bottom sheet (mobile)
  → Google returns auth code
  → Supabase exchanges code for tokens
  → Supabase creates auth.users row
  → Our callback creates user_profiles row
  → Redirect to app → onboarding begins
```

**Scopes requested at sign-up:**
- `openid`, `email`, `profile` — identity
- `https://www.googleapis.com/auth/gmail.readonly` — email reading
- `https://www.googleapis.com/auth/calendar.readonly` — calendar reading

**Scopes deferred (requested on first use):**
- `https://www.googleapis.com/auth/gmail.send` — email sending
- `https://www.googleapis.com/auth/calendar.events` — event creation

### Sign Up (Email + Password)

```
User enters email + password
  → Supabase creates auth.users row with email/password
  → Supabase sends verification email
  → Our callback creates user_profiles row
  → Redirect to app → onboarding begins
  → Google OAuth prompted during onboarding for Gmail/Calendar
```

### Login (Returning User)

```
Web:
  → Session cookie exists → auto-authenticated → load app
  → Cookie expired → show login page → email/password or Google OAuth

Mobile:
  → Keychain token exists → biometric prompt (Face ID) → authenticated → load app
  → Token expired → show login screen → email/password or Google OAuth
```

---

## Supabase Auth Configuration

### Client Setup (Web)

```typescript
// packages/supabase/src/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Setup (API Routes)

```typescript
// packages/supabase/src/admin.ts
import { createClient } from '@supabase/supabase-js'

// Service role — bypasses RLS. Server-side only.
export const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Server Setup (SSR — reading user session)

```typescript
// packages/supabase/src/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}
```

---

## Session Management

### Web Sessions
- Supabase stores session in HTTP-only cookies (via `@supabase/ssr`)
- Access token: short-lived (1 hour default)
- Refresh token: long-lived (7 days of inactivity, configurable)
- Token refresh is automatic — Supabase middleware refreshes on every request
- No "remember me" toggle — always persistent

### Mobile Sessions
- Session token stored in iOS Keychain (via `expo-secure-store`)
- Biometric unlock (Face ID / Touch ID) gates access to the stored token
- If biometrics unavailable/declined → fall back to password entry
- Token refresh handled by Supabase JS client automatically

### Middleware (Web)

```typescript
// apps/web/src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const response = NextResponse.next()
  const supabase = createServerClient(/* ... cookie config ... */)

  // Refresh session if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except auth pages)
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron|api/webhooks).*)'],
}
```

---

## OAuth Callback Handler

```typescript
// apps/web/src/app/api/auth/callback/route.ts

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user_profiles row exists (first-time sign-up)
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // First sign-up — create profile
        await adminClient.from('user_profiles').insert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })

        // If Google OAuth, store Gmail tokens for email scanning
        if (data.session?.provider_token) {
          await adminClient.from('gmail_tokens').insert({
            user_id: data.user.id,
            access_token: data.session.provider_token,
            refresh_token: data.session.provider_refresh_token,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            scopes: ['gmail.readonly', 'calendar.readonly'],
          })
        }
      }
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
```

---

## Progressive Scope Requests

When the user first tries to send an email or create a calendar event, Crosby needs additional OAuth scopes.

### Flow

```
User: "Send that email to Roger"
  → Crosby detects gmail.send scope not granted
  → Response: "I need permission to send emails on your behalf. [Authorize]"
  → User taps [Authorize]
  → Bottom sheet OAuth opens with incremental scope request
  → Google returns new tokens with expanded scopes
  → Crosby stores updated tokens
  → Crosby sends the email
```

### Implementation

```typescript
// Incremental scope request
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
authUrl.searchParams.set('redirect_uri', `${APP_URL}/api/auth/callback`)
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send')
authUrl.searchParams.set('include_granted_scopes', 'true')  // Keep existing scopes
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')

// Return URL to frontend → frontend opens in bottom sheet (mobile) or popup (web)
```

---

## Cron Authentication

Cron jobs hit API routes via Vercel's cron system. They don't have a user session — they use a shared secret.

```typescript
// apps/web/src/app/api/cron/email-scan/route.ts

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Crons process ALL users (or just the single user in v2)
  // Use adminClient (service role) to bypass RLS
  const { data: users } = await adminClient
    .from('user_profiles')
    .select('id')

  for (const user of users ?? []) {
    await scanEmailsForUser(user.id)
  }

  return new Response('OK')
}
```

---

## Mobile Auth (API Client)

The mobile app authenticates with Supabase directly for auth operations, then uses the session token to call the web API.

```typescript
// packages/api-client/src/client.ts

export class ApiClient {
  private baseUrl: string
  private getToken: () => Promise<string | null>

  constructor(baseUrl: string, getToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl
    this.getToken = getToken
  }

  async fetch(path: string, options: RequestInit = {}) {
    const token = await this.getToken()
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }
}
```

Web API routes verify the token:

```typescript
// Utility: get authenticated user from request
export async function getAuthUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

---

## Security Considerations

- **Service role key** — never exposed to client. Only used in API routes and cron jobs.
- **Anon key** — safe for client-side. RLS enforces access control.
- **Gmail tokens** — stored in `gmail_tokens` table. Access restricted by RLS to the owning user. Service role used for cron email scanning.
- **CSRF** — Supabase Auth handles CSRF protection via PKCE flow.
- **Rate limiting** — Supabase Auth has built-in rate limits on auth endpoints. API routes should add their own rate limiting for chat/document endpoints.

---

## Relationship to Product Specs

| Product spec | Architecture mapping |
|---|---|
| AUTH-ACCOUNT.md | This entire spec |
| ONBOARDING.md | OAuth callback creates profile, triggers onboarding state |
| EMAIL-MANAGEMENT.md | Gmail tokens stored at sign-up (read) or incrementally (send) |
| CALENDAR-INTEGRATION.md | Calendar tokens stored at sign-up (read) or incrementally (write) |
| SETTINGS.md | user_profiles table holds all settings |
| MOBILE-EXPERIENCE.md | Biometric unlock, Keychain storage, API client auth |
| ERROR-HANDLING.md | OAuth expiry → integration health degraded → reconnect flow |

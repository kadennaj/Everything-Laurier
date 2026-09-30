# Email verification sign-in

The app uses Supabase Auth email OTP: an email address requests a code, and only successful server verification creates a signed-in session. The same flow supports new and returning users, with no domain restriction. Public browsing and local bookmarks remain available without signing in.

## Connect the project

1. Open the existing Supabase project and copy its Project URL and **publishable** key from the Connect dialog.
2. Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These two values are public client configuration. Never add a secret/service-role key, database password, or SMTP password to an Expo public variable.
3. In Authentication → Sign In / Providers, enable Email and allow new users to sign up. Keep email confirmation enabled. Keep code length at 8 (the app accepts 6–8 digits), a 600-second code expiry, and at least a 60-second send interval. The server must enforce limits; the UI countdown is only a convenience.
4. Under Authentication → Email Templates, use `supabase/templates/email-code.html` for **Magic Link**, with subject `Your Everything Laurier sign-in code`. Ensure any signup confirmation email used by the project also includes `{{ .Token }}`. A stock magic-link-only template won't work with the code entry screen.
5. Configure custom SMTP for emails to arbitrary users. The project dashboard currently requires custom SMTP (or a paid plan) to customize templates. Supabase's default sender is restricted to project team addresses and has low testing limits. Configure the SMTP provider's verified sender/domain in Supabase; SMTP credentials stay there. Do not send real test messages until a recipient is authorized.
6. Once the OTP email template and sender are ready, set `EXPO_PUBLIC_EMAIL_LOGIN_ENABLED=true`. Until then the login button stays disabled so users cannot accidentally receive a magic link on the code-entry flow. Restart Expo after changing `.env`. Rebuild deployed web/native artifacts when public configuration changes. The new SecureStore native dependency also requires rebuilding any existing custom development client.

Supabase manages `auth.users` and sessions. The student questionnaire stores profile details in `public.student_profiles`, which has Row Level Security: students can edit only their own row, and other signed-in students can read only discoverable rows. A contact email is stored and shown only when the student explicitly opts in; it must match the verified account email. Bookmarks remain on the device and are not synced to accounts.

## Everything Laurier sender

The verified Resend domain is `everythinglaurier.ca`. Use these settings in Supabase Authentication → Emails → SMTP Settings:

| Setting | Value |
| --- | --- |
| Sender email | `login@everythinglaurier.ca` |
| Sender name | `Everything Laurier` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key with Sending access for `everythinglaurier.ca` |
| Minimum interval per user | `60` seconds |

The password is entered directly in Supabase by the project owner and must never be committed or included in app configuration. The sender address does not require a purchased mailbox. The email template uses the app's purple, cream, lavender, and gold palette with email-safe fonts, a selectable code, and no external images or tracking links.

## Behavior

- Entry points: header account icon, Your space → Sign in with email, and `/login`.
- Wrong/expired code, email failure, connection failure, and server throttling show retry instructions without exposing raw backend errors.
- Resend has a 60-second countdown for the address that requested a code. The pending address and timer survive navigation and an app reload for the code's ten-minute lifetime. Switching to a different address lets that address request its own code.
- Session persistence uses Expo SecureStore on iOS/Android and Supabase browser storage on web. Native refresh runs while the app is active. Session tokens are never placed in a URL or logged.
- Sign-out uses local scope (this device/browser). Existing local bookmarks remain on the device and are shared by guests/accounts on that device.
- With missing Supabase configuration, the app still opens and browsing works; login shows an unavailable message and does not claim to send email.

## Connected project status

On September 28, 2026, the project owner saved the Resend SMTP credential in Supabase. Both Confirm sign up and Magic link or OTP templates were published with the branded code email. Email signups and confirmation are enabled, codes contain 8 digits and expire after 600 seconds, and the local app configuration enables email login.

## Validation

Run `npm run test:auth`, `npm run typecheck`, `npm run lint`, and `npm run export:web`.

Automated auth tests use the real Supabase client with a test-only HTTP transport. They cover signup requests, wrong codes, rate limits, missing sessions, restoring persisted sessions, and sign-out; they do not prove SMTP delivery.

Once connected, validate with an authorized real email: request code → receive email → enter wrong code → enter correct code → profile shows email → reload/relaunch retains sign-in → sign out → reload stays signed out. Also test resend/expired codes and a physical iPhone or simulator. No production bypass or hardcoded verification code is present in the app.

References: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [React Native auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

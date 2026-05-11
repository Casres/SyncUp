# GAP 1 — Onboarding Stack (R9-1 through R9-10)
# Spec: ANCHOR-DESIGN.txt Round 9
# Estimated time: ~90 minutes
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

Run start to finish without stopping. Spec is complete.
Make judgment calls consistent with existing codebase patterns.
Fix TypeScript errors and continue. Do not pause for confirmation.

================================================================
## MANDATORY PRE-FLIGHT — READ ALL BEFORE WRITING CODE

  ANCHOR-DESIGN.txt          (R9-1 through R9-10 + Onboarding Surface section)
  FRONTEND-HANDOFF.txt       (GAP 1 section)
  TYPES.ts                   (repo root)
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/navigation/AuthNavigator.tsx
  social-calendar-mobile/src/navigation/types.ts
  social-calendar-mobile/src/navigation/RootNavigator.tsx
  social-calendar-mobile/src/screens/auth/SignInScreen.tsx
  social-calendar-mobile/src/screens/auth/SignUpScreen.tsx
  social-calendar-mobile/src/components/profile/QuicksetGrid.tsx
  social-calendar-mobile/src/components/foundation/PillBtn.tsx
  social-calendar-mobile/src/auth/tokenCache.ts

================================================================
## CONTEXT — WHAT EXISTS VS WHAT'S MISSING

The codebase already has:
  - AuthNavigator.tsx (minimal — SignIn + SignUp only)
  - SignInScreen.tsx (shell — may be incomplete)
  - SignUpScreen.tsx (shell — may be incomplete)
  - AuthStackParamList in navigation/types.ts (may need extending)
  - Clerk auth wiring in RootNavigator + tokenCache

What's missing (the full R9 spec):
  - WelcomeScreen
  - 6-step sign-up flow (credential, OTP, identity, password, photo, availability nudge)
  - Forgot password sub-flow (request + confirmation)
  - InviteContextBanner component
  - AuthInputField component (if not already present)
  - OTPInput component
  - ProgressDots component
  - HandleInput component with real-time availability check

READ the existing auth screens in full before writing anything —
they may already implement parts of this. Do not duplicate.

================================================================
## WHAT YOU ARE BUILDING

Full Round 9 onboarding stack replacing the current minimal auth shells.

Files to create (verify each doesn't already exist first):
  social-calendar-mobile/src/screens/auth/WelcomeScreen.tsx
  social-calendar-mobile/src/screens/auth/SignUpStep1Screen.tsx   (credential)
  social-calendar-mobile/src/screens/auth/SignUpStep2Screen.tsx   (OTP)
  social-calendar-mobile/src/screens/auth/SignUpStep3Screen.tsx   (identity)
  social-calendar-mobile/src/screens/auth/SignUpStep4Screen.tsx   (password)
  social-calendar-mobile/src/screens/auth/SignUpStep5Screen.tsx   (photo)
  social-calendar-mobile/src/screens/auth/SignUpStep6Screen.tsx   (availability nudge)
  social-calendar-mobile/src/screens/auth/ForgotPasswordScreen.tsx
  social-calendar-mobile/src/screens/auth/ForgotPasswordConfirmScreen.tsx
  social-calendar-mobile/src/components/foundation/AuthInputField.tsx
  social-calendar-mobile/src/components/foundation/OTPInput.tsx
  social-calendar-mobile/src/components/foundation/ProgressDots.tsx
  social-calendar-mobile/src/components/foundation/HandleInput.tsx
  social-calendar-mobile/src/components/foundation/InviteContextBanner.tsx

Files to modify:
  social-calendar-mobile/src/navigation/AuthNavigator.tsx   (add all screens)
  social-calendar-mobile/src/navigation/types.ts             (extend AuthStackParamList)
  social-calendar-mobile/src/components/index.ts             (exports)

If SignInScreen or SignUpScreen already implement significant parts
of the spec, update them in place rather than replacing wholesale.

================================================================
## BUILD ORDER

  STEP 1 — Foundation components (AuthInputField, OTPInput,
            ProgressDots, HandleInput, InviteContextBanner)
  STEP 2 — WelcomeScreen
  STEP 3 — Sign-up steps 1–6
  STEP 4 — Sign-in screen (update existing)
  STEP 5 — Forgot password screens
  STEP 6 — AuthNavigator + types update
  STEP 7 — TypeScript check

================================================================
## STEP 1 — FOUNDATION COMPONENTS

─────────────────────────────────────────────
ProgressDots({ total: number, current: number, T? })
─────────────────────────────────────────────
  Row of `total` dots (8px diameter · radius 999).
  Active dot: accent fill.
  Inactive dot: hair fill (T.hair).
  6px gap between dots.
  Centered horizontally.
  Sign-up uses total=6.

─────────────────────────────────────────────
AuthInputField({ label, value, onChange, error?, type?, T? })
─────────────────────────────────────────────
  type: 'text' | 'email' | 'phone' | 'password'  (default 'text')
  Label: 12/500 ink2 above input · 4px gap.
  Input: bgSunken fill · radius 12 · 48px height · 16px h-padding ·
    15/500 T.ink.
  Password type: trailing eye Ionicons "eye-outline" / "eye-off-outline"
    toggle (44pt) that reveals/hides text.
  Error state: 1.5px danger border on input + error message
    12/500 danger with Ionicons "warning" leading icon 14px · 6px below.
  autoCapitalize based on type (none for email/phone/password).
  keyboardType based on type (email-address / phone-pad / default).

─────────────────────────────────────────────
OTPInput({ length: 6, value, onChange, T? })
─────────────────────────────────────────────
  6 individual cells · 48×56 · bgSunken fill · radius 12 ·
    1px hair border (active: 1.5px accent) · 8px gap.
  Single hidden TextInput behind the visual cells (focus-trap approach).
  Each cell shows one digit centered (24/700 ink) or empty.
  Auto-submits when 6th digit entered (calls onChange with full value;
  parent detects length=6 and submits).
  Paste support: if user pastes 6 digits, fill all cells.

─────────────────────────────────────────────
HandleInput({ value, onChange, availabilityState, T? })
─────────────────────────────────────────────
  availabilityState: 'idle' | 'checking' | 'available' | 'taken'
  "@" prefix chip (bgSunken · radius-l 12 · 48px height · 15/600 ink3).
  TextInput beside it: same height · bgSunken · radius-r 12 · 15/500 ink.
  maxLength 20. autoCapitalize none. autoCorrect false.
  Trailing indicator (right of input):
    checking  → 20px XS Spinner
    available → Ionicons "checkmark-circle" 20px limeInk
    taken     → Ionicons "close-circle" 20px popInk
    idle      → nothing
  Debounce onChange by 400ms (R9-6). Parent handles the actual
    availability API call and passes back availabilityState.
  For now, simulate availability check: after 400ms, 'available'
    unless the handle is exactly "taken" (for testing). Add a comment
    explaining real API wiring is deferred to auth integration pass.

─────────────────────────────────────────────
InviteContextBanner({ inviteContext?, T? })
─────────────────────────────────────────────
  inviteContext: { inviterName: string; eventName?: string } | null
  If null/undefined: renders nothing (null return).
  If present: accentSoft fill · radius 12 · 12px padding.
    Text: "{InviterName} invited you{eventName ? ' to {eventName}' : ''}."
    13/500 accent · centered.

================================================================
## STEP 2 — WelcomeScreen

File: social-calendar-mobile/src/screens/auth/WelcomeScreen.tsx

No progress dots. No back arrow. Full-screen centered layout.

  Logo wordmark: "SyncUp" · 28/800 · color T.accent · centered.
  Tagline: 15/500 ink2 · centered · 8px below logo.
    Text: "Know when your people are free."
  InviteContextBanner (if route params contain inviteContext) ·
    16px below tagline.
  "Get started" accent PillBtn · full-width · 32px below banner/tagline.
    Tap → navigate to SignUpStep1 · medium haptic.
  "Sign in" ghost PillBtn · full-width · 12px below "Get started."
    Tap → navigate to SignIn · light haptic.

================================================================
## STEP 3 — SIGN-UP STEPS 1–6

All steps share this shell:
  No tab bar. Back arrow (Ionicons "arrow-back") · top-left · 44pt ·
    light haptic · navigate back (preserves state per R9-3).
  ProgressDots total=6 current={stepN} · centered below back arrow.
  Title: 24/800 ink · left-aligned · 32px below dots.
  Sub (if present): 15/500 ink2 · left-aligned · 8px below title.
  Primary CTA: accent PillBtn · full-width · pinned above safe-area.
  Screen uses KeyboardAvoidingView (behavior='padding' on iOS).

─────────────────────────────────────────────
Step 1 — Credential (SignUpStep1Screen)
─────────────────────────────────────────────
  dot 1/6 active.
  Title: "Create your account"
  Sub: "We'll send you a code to verify."
  AuthInputField label="Phone or email" type='text' autoFocus.
  CTA "Continue": disabled until field non-empty + plausible format
    (contains @ for email, or ≥7 digits for phone). Light format check
    only — no real validation. Medium haptic + navigate to Step 2.

─────────────────────────────────────────────
Step 2 — OTP (SignUpStep2Screen)
─────────────────────────────────────────────
  dot 2/6 active.
  Title: "Enter the code"
  Sub: "Sent to {credential}" + inline "Change" text link (13/500 accent)
    → navigate back to Step 1.
  OTPInput length=6. Auto-submits on 6th digit → medium haptic +
    navigate to Step 3.
  "Resend code" text link (13/500 ink3) · centered · 24px below OTP.
    30s cooldown. Shows "Resend in {N}s" while cooling (countdown).
    On tap: success haptic + reset OTP input + restart cooldown.
  Primary CTA "Verify" (fallback — disabled until 6 digits entered).
  Simulate OTP: any 6-digit code advances. Code "000000" shows error
    (error haptic + OTP input error state + "Incorrect code" message).

─────────────────────────────────────────────
Step 3 — Identity (SignUpStep3Screen)
─────────────────────────────────────────────
  dot 3/6 active.
  Title: "What should we call you?"
  AuthInputField label="Full name" autoFocus.
  HandleInput below: auto-populates from name (lowercase, strip spaces,
    first 20 chars) when name changes. User can edit handle independently.
    availabilityState driven by local simulation (400ms debounce).
  CTA "Continue": disabled while handle check is 'checking' or 'taken',
    or name is empty. Medium haptic + navigate to Step 4.

─────────────────────────────────────────────
Step 4 — Password (SignUpStep4Screen)
─────────────────────────────────────────────
  dot 4/6 active.
  Title: "Set a password"
  AuthInputField label="Password" type='password' autoFocus.
  Requirement row 8px below field:
    Ionicons "checkmark-circle" (limeInk if met, ink3 if not) + "8+ characters".
  CTA "Create account": disabled until password.length ≥ 8.
    Tap → success haptic + navigate to Step 5.

─────────────────────────────────────────────
Step 5 — Profile photo (SignUpStep5Screen)
─────────────────────────────────────────────
  dot 5/6 active.
  Title: "Add a photo"
  Sub: "Help friends recognize you."
  AvatarUploadWell (80px circular View · bgSunken · radius 999 ·
    centered · 24px below sub):
    Default: Ionicons "person" 36px ink3 centered.
    After pick: show selected image (use expo-image-picker if available,
      otherwise simulate with a placeholder state).
    Tap well → trigger image picker (or simulate photo chosen state).
    Light haptic when photo chosen.
  CTA label: "Choose photo" (before pick) → "Continue" (after pick).
  Secondary "Skip for now" ghost pill · 12px below CTA.
    Both → medium haptic + navigate to Step 6.

─────────────────────────────────────────────
Step 6 — Availability nudge (SignUpStep6Screen)
─────────────────────────────────────────────
  dot 6/6 active.
  InviteContextBanner (if invite context) · above title.
  Title: "Set your availability"
  Sub (no invite ctx): "Let friends know when you're free."
  Sub (invite ctx):    "You can always set this up later."
  QuicksetGrid (BUILTIN_QUICKSETS only · 4 tiles) · 24px below sub.
    Import BUILTIN_QUICKSETS from QuicksetGrid.
    onApply does nothing here (nudge only — no real availability set).
    Add comment: // Quickset apply on this screen is a nudge only.
    // Real availability editing is in AvailabilityEditorScreen.
  Primary CTA: "Set availability" → navigate to AvailabilityEditor
    (if that screen exists in the navigator) OR stub with a TODO comment
    and navigate to the main app shell. Medium haptic.
  Secondary:
    No invite ctx: "Skip for now" ghost pill.
    Invite ctx:    "Skip for now" accent-ghost pill (more prominent per R9-7).
    Both → navigate to main app shell (pop AuthNavigator).

================================================================
## STEP 4 — SIGN-IN SCREEN (update existing)

Read SignInScreen.tsx first. Update to match spec if incomplete:

  No progress dots. No back arrow on body. Back from Welcome "Sign in"
    entry is handled by navigator stack.
  Title: "Welcome back"
  AuthInputField label="Phone, email, or @handle" autoFocus.
  AuthInputField label="Password" type='password'.
  "Forgot password?" text link (13/500 ink3) · 8px below password field.
    → navigate to ForgotPassword.
  Primary CTA "Sign in": disabled until both fields non-empty.
    Tap → light haptic + simulate sign-in → success haptic + dismiss auth.
    Wrong credentials (simulate with password "wrong"):
      error haptic + error state on both fields + "Incorrect credentials"
      inline error below password field.
  Footer: "New to SyncUp? Create account" text link (13/500 ink3) ·
    centered · 24px below CTA → navigate to SignUpStep1.

================================================================
## STEP 5 — FORGOT PASSWORD SCREENS

─────────────────────────────────────────────
ForgotPasswordScreen
─────────────────────────────────────────────
  No dots. Back arrow → SignIn.
  Title: "Reset your password"
  Sub: "Enter the phone or email on your account."
  AuthInputField label="Phone or email" autoFocus.
  CTA "Send reset link": disabled until non-empty. Tap → success haptic
    + navigate to ForgotPasswordConfirm passing credential.

─────────────────────────────────────────────
ForgotPasswordConfirmScreen (R9-10)
─────────────────────────────────────────────
  No dots. NO back arrow (R9-10).
  Icon tile: 56×56 bgSunken · radius 16 · centered.
    Ionicons "mail-outline" if credential contains @ (email).
    Ionicons "chatbubble-outline" if phone.
  Title: "Check your {email | messages}" (adapts to credential).
  Sub: "We sent a reset link to {credential}." · 13/500 ink2 · centered.
  "Back to sign in" ghost PillBtn · full-width · 24px below sub.
    → navigate to SignIn (clear stack).
  "Didn't get it? Resend" text link (13/500 ink3) · centered · 8px below pill.
    Tap → light haptic + show "Sent!" inline feedback for 2s.

================================================================
## STEP 6 — AuthNavigator + types

Update navigation/types.ts AuthStackParamList:
  Welcome: undefined
  SignUpStep1: undefined
  SignUpStep2: { credential: string }
  SignUpStep3: { credential: string }
  SignUpStep4: { credential: string; name: string; handle: string }
  SignUpStep5: { credential: string; name: string; handle: string; password: string }
  SignUpStep6: { inviteContext?: { inviterName: string; eventName?: string } }
  SignIn: undefined
  ForgotPassword: undefined
  ForgotPasswordConfirm: { credential: string }

Update AuthNavigator.tsx:
  initialRouteName="Welcome"
  Add all screens above.
  screenOptions: headerShown=false, animation='slide_from_right',
    gestureEnabled=false (back is custom per R9-3 — own back arrow).

================================================================
## STEP 7 — TypeScript CHECK

  cd social-calendar-mobile && npx tsc --noEmit

Exit 0 required. Fix all errors.

================================================================
## HARD RULES

1. Design tokens only. No hardcoded hex values.
2. Haptics via useHaptic() only. 6 types only.
3. No Zustand. Local state in each screen.
4. Back arrow preserves state (R9-3) — use navigation.goBack(), not reset.
5. Profile photo and availability steps are ALWAYS skippable (R9-7).
6. OTP auto-submits on 6th digit — never require a manual tap (R9-5).
7. Handle availability check debounced at 400ms (R9-6).
8. Forgot password confirmation has NO back arrow (R9-10).
9. Spinner only if loading states needed. No skeletons.
10. Auth is simulated (no real Clerk calls) — add clear TODO comments
    for each simulated action. Real Clerk wiring is a separate pass.

================================================================
## DEFINITION OF DONE

  ✓ tsc exits 0
  ✓ WelcomeScreen: logo + tagline + "Get started" + "Sign in"
  ✓ All 6 sign-up steps navigate correctly step-to-step
  ✓ ProgressDots shows correct active dot per step
  ✓ Back arrow on all steps preserves state (goBack())
  ✓ Step 1: CTA disabled until plausible credential
  ✓ Step 2: OTP auto-submits on 6th digit · resend cooldown 30s
  ✓ Step 3: HandleInput auto-populates from name · availability sim
  ✓ Step 4: password requirement indicator · CTA disabled < 8 chars
  ✓ Step 5: avatar well + photo/skip · CTA label changes after pick
  ✓ Step 6: QuicksetGrid (4 built-ins) · skip is prominent in invite ctx
  ✓ SignIn: both fields required · forgot password link · wrong-creds error
  ✓ ForgotPassword: CTA disabled until non-empty
  ✓ ForgotPasswordConfirm: no back arrow · icon adapts to credential type
  ✓ All haptics match spec
  ✓ All new components exported

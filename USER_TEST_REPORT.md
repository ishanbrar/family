# User Test Report – Full Flow Analysis

Summary of code-level tracing for **new user**, **existing user**, and **new user with existing family code** flows, plus pain points and suggested fixes.

---

## 1. New User (Create Family)

### Flow
- **Landing** → “Build your family network” or **Sign up** → Signup page (Create Family).
- **Email signup:** First/last name, gender, email, password, family name (required). Auth user + profile + family created; redirect to `/dashboard`.
- **Email confirmation on:** Account created, pending intent saved; user sees “Check your email”. After first login, `consume_pending_signup_intent` + `completeDeferredSetup` create family and profile; redirect to `/dashboard`.
- **Google signup:** “Continue with Google” → OAuth → `/auth/callback` → `ensureProfileForAuthUser` (profile with `family_id: null`) → redirect to `/dashboard`. **No family or family name is created** – user lands on dashboard with only themselves; onboarding wizard should open so they can add family name / create family via onboarding.

### Pain points
- **Google “Create Family”:** After OAuth, user is sent to dashboard with no family. They must complete onboarding to effectively “create” a family (name + invite code). Copy says “Create Family” but Google path doesn’t ask for family name up front – acceptable if onboarding is clear; otherwise consider asking for family name after OAuth for create mode.
- **Create with email but blank family name:** Not possible – family name is `required` in the form, so no bug here.
- **Dashboard when `family_id` is null:** `useFamilyData` sets `members = [viewer]`, `family = null`. Onboarding can show; tree and rest of app still work with single member.

---

## 2. Existing User (Sign In)

### Flow
- **Login** (email/password or Google) → `redirectPathBase` = `/dashboard` (no code in URL). After auth, redirect to dashboard. If email confirmation had been pending, `consume_pending_signup_intent` + `completeDeferredSetup` run and redirect accordingly.
- **Login with invite code in URL:** User opens `/join?code=XXX` (e.g. shared link) → middleware redirects to `/login?code=XXX` (query is preserved). Login page sets `redirectPathBase = /join?code=XXX`. After sign-in, user is sent to join page.

### Pain points
- **Landing “Sign In”:** Header “Sign In” goes to `/login` with no code. If an existing user has a join link and goes to landing first, they must use the join link directly to get `login?code=XXX`. No bug; just be aware.
- **“Load failed” on login:** Usually due to missing/invalid Supabase env (`NEXT_PUBLIC_SUPABASE_URL` / anon key). User-facing message is already softened to “Connection failed. Please check your internet and try again.”

---

## 3. New User With Existing Family Code

### Flow A – Signup with code in URL
- **Landing** “Already have a family code?” → submit → `/signup?mode=join&code=XXX`. Form shows “Join Family”, invite code pre-filled.
- **Email signup (join):** Auth user created; if no session (email confirmation), pending intent saved with `p_invite_code`; after first login, deferred setup runs and redirects to `/join?code=XXX`. If session exists, profile upserted with `family_id: null`, then redirect to `/join?code=XXX`.
- **Google signup (join):** `redirectPathBase = /join?code=XXX` → OAuth → callback → `ensureProfileForAuthUser` (profile, `family_id: null`) → redirect to `/join?code=XXX`. Join page loads; user can “Claim” a node or “Create My Node”.

### Flow B – Join page
- **/join?code=XXX** requires auth. No auth → redirect to `/login?code=XXX` (middleware keeps query).
- If user has `profile.family_id` already, join page redirects to `/dashboard` (cannot join a second family).
- Join: `getJoinFamilyPreview` → preview tree; `joinFamilyAsNewNode` or `claimFamilyMemberNode` → profile updated with `family_id`; optional `POST_JOIN_LINK_ONLY` in localStorage; redirect to `/dashboard`. Dashboard may show “link only” onboarding until a direct relationship is added.

### Pain points
- **Signup “Already have an account? Sign in”:** Link is `href="/login"`. If the user was on signup with `?mode=join&code=XXX`, the code is dropped and they land on `/login` without the code. **Fix:** Use something like `href={inviteCode ? `/login?code=${encodeURIComponent(inviteCode)}` : "/login"}` (or pass `inviteCode` from URL) so the code is preserved.
- **Landing “Join by Code”:** Sends everyone (new + existing) to `/signup?mode=join&code=XXX`. Existing users must then click “Already have an account? Sign in” – and without the fix above they lose the code. After fix, signup→login keeps the code.
- **Join “Back” button:** Goes to `/signup`. If user came via Google and then join, “Back” is a bit odd but harmless; consider “Back to dashboard” only when they already have a session with no family (optional polish).

---

## 4. Cross-Cutting / General

### Auth & profile
- **ensureProfileForAuthUser:** Creates profile from OAuth metadata (name, `family_id: null`). Idempotent; safe for callback.
- **Email confirmation:** Pending intent and `completeDeferredSetup` handle create/join after first login; redirect to dashboard or `/join?code=XXX` as intended.

### Middleware
- Unauthenticated access to `/join` redirects to `/login`; `request.nextUrl` clone keeps search params, so `/join?code=XXX` → `/login?code=XXX`. Correct.

### Dashboard / onboarding
- **postJoinLinkOnly:** After “Create My Node” join, localStorage flag can force “link only” onboarding until the user has a direct relationship; cleared when they do. Logic is consistent.
- **Onboarding snooze:** 24h snooze stored in localStorage; re-show when not completed. Fine.

### Tree / table / export
- Tree and table (Name, DOB, City) work with `useFamilyData`; admins can edit; CitySearch used in table; city save on dropdown `onChange` (no blur-only) so selection persists.
- Export uses ancestor root and canvas-based connectors; relationship labels (aunt, cousin, etc.) and spouse-as-parent inference are in place from prior work.

### Potential gaps (no bugs found, good to monitor)
- **RPCs:** `lookup_family_by_invite_code`, `get_join_family_preview`, `join_family_as_new_node`, `claim_family_member_node`, `upsert_pending_signup_intent`, `consume_pending_signup_intent` must exist and match expected signatures; migrations and Supabase config must be applied.
- **Profile not found after OAuth:** If `ensureProfileForAuthUser` failed (e.g. RLS), user would have auth but no profile; join page shows “Could not load your account profile.” Rare; ensure profile RLS allows insert/update for the auth user.

---

## 5. Recommended Fixes (Priority)

1. **Signup → Login link (high):** When signup is in join mode and URL has a code, make “Already have an account? Sign in” point to `/login?code=XXX` so existing users don’t lose the invite code.
2. **Optional – Landing:** If “Join by Code” is used and we detect or assume “existing user”, could redirect to `/login?code=XXX` instead of signup; or add a small line: “Already have an account? Sign in with this code” that goes to `/login?code=XXX` (with code from the form). Depends on product preference.
3. **Optional – Google create flow:** If you want family name up front for “Create Family” with Google, add a post-OAuth step (e.g. redirect to a short “Name your family” form when `next=/dashboard` and profile has no family) or clarify in onboarding that “creating a family” happens there.

---

## 6. Quick Test Checklist

- [ ] **New user – email create:** Sign up with family name → dashboard with family and tree.
- [ ] **New user – Google create:** Sign up with Google (create) → dashboard → onboarding → add family / members.
- [ ] **New user – email join:** Sign up with code → redirect to join → claim or create node → dashboard.
- [ ] **New user – Google join:** Sign up with code in URL, Google → join page → claim or create node → dashboard.
- [ ] **Existing user – login:** Email and Google → dashboard.
- [ ] **Existing user – login with code:** Open `/join?code=XXX` (logged out) → redirect to login with code → sign in → join page.
- [ ] **Signup with code → “Already have an account?”:** With fix, link goes to `/login?code=XXX` and code is preserved.
- [ ] **Email confirmation flow:** Sign up with “confirm email” on → confirm → first login → deferred create/join → correct redirect.
- [ ] **Join page – invalid code:** “Invalid or inactive invite code.”
- [ ] **Join page – already in family:** User with `family_id` → redirect to dashboard.

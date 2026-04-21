#!/usr/bin/env bash
# pre-ota-check.sh — run before every `eas update` push
# Usage: bash scripts/pre-ota-check.sh
# All checks must pass (exit 0) before pushing an OTA update.

set -euo pipefail
PASS=0
FAIL=0
WARNINGS=()

ok()   { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARNINGS+=("$1"); }

echo ""
echo "========================================"
echo "  Shift Tracker — Pre-OTA Check"
echo "========================================"

# ── 1. TypeScript compilation ─────────────────────────────────────────────────
echo ""
echo "1. TypeScript"
npx tsc --noEmit --pretty false 2>&1 > /tmp/tsc-out.txt || true
TS_ERROR_COUNT=$(grep -c "error TS" /tmp/tsc-out.txt 2>/dev/null || echo 0)
# Baseline: 30 pre-existing errors as of 2026-04-18 (Promise<Shift> misuse,
# missing type properties, third-party component prop mismatches, etc).
# Fail only if error count EXCEEDS baseline — catches NEW regressions.
TS_BASELINE=30
if [ "$TS_ERROR_COUNT" -gt "$TS_BASELINE" ]; then
  fail "TypeScript errors increased above baseline ($TS_ERROR_COUNT errors, baseline=$TS_BASELINE) — new errors introduced:"
  grep "error TS" /tmp/tsc-out.txt | head -20
elif [ "$TS_ERROR_COUNT" -gt 0 ]; then
  warn "TypeScript has $TS_ERROR_COUNT pre-existing error(s) (at or within baseline of $TS_BASELINE) — not blocking, but review if count grows"
else
  ok "No TypeScript errors"
fi

# ── 2. Banned patterns — bg-background on root screen views ──────────────────
echo ""
echo "2. CSS variable safety (bg-background on outermost screen views)"
# Screens in pages/ that are shown to unauthenticated users must NOT use
# className="...bg-background..." on their root View/KeyboardAvoidingView.
# These screens render before NativeWind VariableContext is populated on Android.
FLAGGED_FILES=()
for file in src/pages/*.tsx; do
  # Look for bg-background as a className on what looks like a root container
  if grep -qE 'className="[^"]*bg-background' "$file"; then
    FLAGGED_FILES+=("$file")
  fi
done
if [ ${#FLAGGED_FILES[@]} -gt 0 ]; then
  warn "bg-background className found in pages/ — verify these are NOT on the root View of auth/onboarding screens (use style={{ backgroundColor: colors.background }} instead):"
  for f in "${FLAGGED_FILES[@]}"; do
    echo "       $f"
    grep -n 'bg-background' "$f" | head -5
  done
else
  ok "No bg-background className in pages/ root views"
fi

# ── 3. EXPO_PUBLIC vars actually referenced in code ───────────────────────────
echo ""
echo "3. Environment variables"
if grep -r "EXPO_PUBLIC_SUPABASE_URL\|EXPO_PUBLIC_SUPABASE_ANON_KEY" src/integrations/supabase/client.ts > /dev/null 2>&1; then
  ok "Supabase env var references present in client.ts"
else
  fail "Supabase env var references MISSING from client.ts — check src/integrations/supabase/client.ts"
fi

# Check local .env has values (OTA builds use local .env)
if [ -f .env ]; then
  if grep -q "EXPO_PUBLIC_SUPABASE_URL=." .env && grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY=." .env; then
    ok ".env has Supabase values (used by eas update)"
  else
    fail ".env is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  fi
else
  warn ".env file not found — eas update needs it for EXPO_PUBLIC_* vars"
fi

# ── 4. Auth deep-link handler present ────────────────────────────────────────
echo ""
echo "4. Auth deep-link handler"
if grep -q "exchangeCodeForSession\|setSession" src/context/AuthContext.tsx; then
  ok "Email verification deep-link handler present in AuthContext"
else
  fail "Email verification handler missing from AuthContext — users can't verify email from app"
fi

# ── 5. Navigation linking config includes auth/callback ──────────────────────
echo ""
echo "5. Navigation linking"
if grep -q "auth/callback" src/navigation/linking.ts; then
  ok "auth/callback route in linking.ts"
else
  warn "auth/callback not found in linking.ts — email verification link may not open the app"
fi

# ── 6. Git status ─────────────────────────────────────────────────────────────
echo ""
echo "6. Git status"
UNCOMMITTED=$(git status --porcelain | grep -v "^?" | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  warn "$UNCOMMITTED file(s) with uncommitted changes — consider committing before pushing OTA"
  git status --short | grep -v "^?"
else
  ok "Working tree clean (or only untracked files)"
fi

# ── 7. Manual checklist ───────────────────────────────────────────────────────
echo ""
echo "========================================"
echo "  Manual Smoke Test Checklist"
echo "========================================"
echo "  Before pushing, verify on a physical device:"
echo ""
echo "  AUTH FLOW"
echo "  [ ] App opens to Onboarding (first install) — no blank/dark screen"
echo "  [ ] Onboarding slides advance and reach Sign Up"
echo "  [ ] Signup → confirmation email received → tapping link opens app & logs in"
echo "  [ ] Login with existing credentials works"
echo "  [ ] Forgot password email flow works"
echo ""
echo "  CORE APP"
echo "  [ ] Dashboard loads with correct data"
echo "  [ ] Start/stop shift works, shift saves to history"
echo "  [ ] History tab shows past shifts"
echo "  [ ] Tax Report tab loads (Monthly and Expenses sub-tabs)"
echo "  [ ] Settings tab loads without crash"
echo ""
echo "  PLATFORM CHECKS"
echo "  [ ] iOS: keyboard doesn't dismiss on each keystroke in inputs"
echo "  [ ] Android: no yellow autofill background on inputs"
echo "  [ ] Dark mode: background is correct color on all screens"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed, ${#WARNINGS[@]} warnings"
echo "========================================"

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo ""
  echo "  Warnings to review:"
  for w in "${WARNINGS[@]}"; do
    echo "    - $w"
  done
fi

echo ""

if [ $FAIL -gt 0 ]; then
  echo "  BLOCKED — fix $FAIL failing check(s) before pushing OTA."
  echo ""
  exit 1
else
  echo "  All automated checks passed."
  echo "  Complete the manual checklist above, then run:"
  echo "    eas update --branch production --message \"your message\""
  echo ""
  exit 0
fi

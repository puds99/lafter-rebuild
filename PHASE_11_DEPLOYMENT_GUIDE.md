# Phase 11 Deployment Guide
**Version:** 0.11.0-beta - Laugh Starter Integration  
**Date:** 2025-11-23  
**Status:** Ready for Database Setup & Testing

## Current State ✅

- **Code:** All components integrated (LaughStarterModal, ShareLaughDialog, LaughClipExtractor)
- **SessionPage:** Fully integrated with both modals
- **Version Files:** Updated to v0.11.0-beta
  - `VERSION.txt` → 0.11.0-beta
  - `package.json` → 0.11.0-beta  
  - `src/version.ts` → 0.11.0-beta
- **CHANGELOG:** Entry exists for v0.11.0-beta (lines 20-46)

---

## Deployment Steps

### Step 1: Database Migration (Manual - Required)

> **⚠️ IMPORTANT:** This requires Supabase dashboard access

#### 1.1 Create `laugh_clips` Table

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql)
2. Copy the contents of: `migrations/20231123_laugh_clips.sql`
3. Paste and click **"Run"**
4. Verify success with:

```sql
-- Should show table structure
\d laugh_clips  

-- Should list 6 indexes
\di laugh_clips*

-- Should show 5 RLS policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'laugh_clips';
```

Expected policies:
- `Public read approved clips` (SELECT)
- `Users can create their own clips` (INSERT)
- `Users can view their own clips` (SELECT)
- `Admins can review clips` (UPDATE)

#### 1.2 Create Storage Bucket

1. Navigate to: **Storage** → **Create bucket**
2. Configure:
   - **Name:** `laugh-starter-clips`
   - **Public:** ✅ YES (Enable public access)
   - **File size limit:** 500 KB
   - **Allowed MIME types:** `audio/mpeg`, `audio/mp3`, `audio/wav`
3. Click **"Create bucket"**
4. Verify: Bucket appears in list and shows "Public" badge

---

### Step 2: Build & Verify

#### 2.1 Run Production Build

```bash
npm run build
```

**Expected output:**
```
✓ Build completed successfully
dist/index.html                   ~0.66 kB
dist/assets/index-[hash].js       ~2.4 MB / gzip: ~605 KB
```

**Success criteria:**
- No TypeScript errors
- Bundle size ≤ 3MB (uncompressed)
- Gzipped size ≤ 700KB

#### 2.2 Test Locally

```bash
npm run dev
```

1. Open https://localhost:5173/session
2. Clear localStorage: `localStorage.removeItem('hasSeenLaughStarter')`
3. Refresh page
4. **Verify:** LaughStarterModal appears

---

### Step 3: Testing Checklist

#### Test Scenario A: New User Flow
**Setup:** Clear `localStorage.removeItem('hasSeenLaughStarter')`

1. Visit `/session`
2. ✅ LaughStarterModal opens automatically
3. ✅ (If clips exist) Play buttons work, audio plays
4. ✅ Click "Start Recording!" → modal closes
5. ✅ Record session with 3+ laughs
6. ✅ End session → ShareLaughDialog appears
7. ✅ Click "Share My Laugh!" → uploads to database
8. ✅ Check DB: `SELECT * FROM laugh_clips WHERE approval_status = 'pending' ORDER BY created_at DESC LIMIT 1;`

#### Test Scenario B: Returning User Flow
**Setup:** `localStorage.setItem('hasSeenLaughStarter', 'true')`

1. Visit `/session`
2. ✅ NO LaughStarterModal (skips directly to session)
3. ✅ Record 3+ laughs → ShareLaughDialog STILL appears

#### Test Scenario C: Low Laugh Count
1. Record session with 0-2 laughs
2. ✅ ShareLaughDialog does NOT appear

#### Test Scenario D: Cross-Browser
Test on:
- ✅ Chrome/Edge (Windows)
- ✅ Firefox (Windows)  
- ✅ Safari (macOS - if available)

For each: Run Scenario A and check console for errors

---

### Step 4: Git Tagging & Push

```bash
# Option 1: Manual Git Commands
git add .
git commit -m "chore(release): Finalize Phase 11 - v0.11.0-beta"
git tag -a v0.11.0-beta -m "Phase 11: Laugh Starter Integration"
git push origin main --tags

# Option 2: Automated Script (if desired)
node scripts/bump-version.js minor
# Note: This may re-bump the version, check if already at 0.11.0-beta first
```

**Verify:**
```bash
git tag -l "v0.11*"  # Should show: v0.11.0-beta
git log -1           # Should show release commit
```

---

### Step 5: Deploy to Vercel

#### 5.1 Push to GitHub
```bash
git push origin main
```

Vercel auto-deploys on push to `main` branch.

#### 5.2 Verify Deployment
1. Check Vercel dashboard for deployment status
2. Visit production URL: https://lafter-org.vercel.app (or your domain)
3. Run Scenario A (new user flow) in **incognito mode**
4. Check Supabase database for new clips

#### 5.3 Production Smoke Test
- ✅ Login works
- ✅ Session recording starts
- ✅ Laugh detection works (trigger 3+ laughs)
- ✅ ShareLaughDialog appears post-session
- ✅ Settings page shows "v0.11.0-beta"

---

## Rollback Procedures

### If Critical Bug Found

#### Quick Rollback (Revert Git)
```bash
git tag -d v0.11.0-beta
git push origin :refs/tags/v0.11.0-beta
git revert HEAD
git push origin main
```

#### Database Rollback (Last Resort)
```sql
-- ⚠️ WARNING: This deletes all user-contributed clips
DROP TABLE IF EXISTS laugh_clips CASCADE;

-- Storage bucket: Delete via Supabase Dashboard → Storage
```

---

## Common Issues

### Issue: "laugh_clips table does not exist"
**Solution:** Run Step 1.1 (database migration)

### Issue: "Storage bucket not found"  
**Solution:** Run Step 1.2 (create storage bucket)

### Issue: "No clips available yet"
**Solution:** Either:
1. Wait for users to contribute clips, OR
2. Manually seed database with test clips (see below)

### Issue: Build takes too long or hangs
**Solution:** 
- Upgrade Node.js to 20.19+ or 22.12+ (currently using 20.15.1)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

---

## Seeding Test Clips (Optional)

If you want to test the LaughStarterModal with actual audio before users contribute:

```sql
-- Insert dummy clip (you must upload a real MP3 to storage first)
INSERT INTO laugh_clips (
    session_id,
    user_id,
    storage_path,
    duration,
    file_size,
    mime_type,
    yamnet_score,
    approval_status
) VALUES (
    (SELECT id FROM sessions LIMIT 1),  -- Use any existing session
    (SELECT id FROM profiles LIMIT 1),  -- Use any existing user
    'laugh-starter-clips/seed_laugh_001.mp3',  -- Must exist in storage!
    2500,  -- 2.5 seconds
    48000,  -- 48KB
    'audio/mpeg',
    0.85,  -- High AI score
    'approved'  -- Pre-approved for testing
);
```

**Before running:** Upload a real MP3 file to the storage bucket at path `laugh-starter-clips/seed_laugh_001.mp3`

---

## Success Metrics

After deployment, monitor:
- ✅ At least 1 user sees LaughStarterModal (check logs)
- ✅ At least 1 clip contributed to database (check `laugh_clips` table)
- ✅ Zero critical errors in Sentry/Vercel logs
- ✅ Version shown in Settings: v0.11.0-beta

---

## Next Steps (Phase 12)

See `ROADMAP.txt` for Phase 12: Auto-Curation & Personalization
- Auto-approve high-quality clips (YAMNet score > 0.7)
- Personalized clip selection
- Admin dashboard for manual review

---

**Questions or Issues?** Check `PHASE_11_COMPLETION_CHECKLIST.txt` for detailed troubleshooting.

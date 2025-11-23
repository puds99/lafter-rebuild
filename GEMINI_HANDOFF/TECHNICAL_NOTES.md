# TECHNICAL NOTES & GOTCHAS

## 🎧 AUDIO ENGINE (`useAudioRecorder.ts`)
- **React 18 Strict Mode:** Causes `useEffect` to fire twice. We use `useRef` for the `AudioContext` to ensure we only create ONE instance.
- **Safari Compatibility:**
  - Must use `audio/mp4` MIME type.
  - `AudioContext` must be resumed after user interaction.
  - We check `isSecureContext` because iOS requires HTTPS for microphone access.
- **Volume Calculation:**
  - We use `getByteFrequencyData`.
  - We calculate RMS (Root Mean Square) and normalize to 0-100.
  - **Smoothing:** A factor of `0.8` is applied to prevent jittery animations.

## 🧪 TESTING
- **Environment:** `jsdom` v22.1.0.
- **Issue:** Newer `jsdom` versions use ESM, which conflicts with some CJS tools in this specific Vite setup.
- **Fix:** We pinned `jsdom` to v22.1.0.
- **Execution:** Use `node scripts/run-tests.js`. It uses `spawn` to stream output, preventing the "hanging" issue seen with `exec`.

## 📦 DEPLOYMENT
- **Vercel:** Configured via `vercel.json`.
- **SPA Routing:** `rewrites` rule sends all traffic to `index.html`.
- **Environment Variables:** Baked in at build time. For private hosting, rebuild if vars change.

## 💾 DATA & OFFLINE
- **IndexedDB:** Used via `idb` library.
- **Sync Strategy:** `useSessionManager` checks for pending uploads on mount.
- **Supabase:** RLS policies are set. `LEADERBOARD_MIGRATION.sql` must be applied for public leaderboards.
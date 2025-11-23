# GEMINI 3.0 HANDOFF: LAFTER.ORG REBUILD

**Status:** ✅ STABLE / FEATURE COMPLETE (Phase 8)
**Last Updated:** 2025-11-23
**Critical Success:** "Gold Standard" Audio Recorder is working perfectly on mobile.

## 🚀 QUICK START
1. **Install Dependencies:** `npm install` (Note: `jsdom` is pinned to v22.1.0)
2. **Start Dev Server:** `npm run dev`
3. **Run Tests:** `node scripts/run-tests.js` (Custom runner, do NOT use `npm test` directly if it hangs)

## 📂 PROJECT STRUCTURE
- `/src/hooks/useAudioRecorder.ts`: **THE CROWN JEWEL.** Do not touch logic without reading `TECHNICAL_NOTES.md`.
- `/src/lib/db.ts`: IndexedDB wrapper for offline support.
- `/scripts/run-tests.js`: Custom test runner using `spawn` to avoid buffer issues.
- `/testing/`: Test reports and templates.

## 🛑 MISTAKES TO AVOID (READ THIS!)
1. **DO NOT Upgrade `jsdom`**: It must stay at `22.1.0` to avoid `ERR_REQUIRE_ESM` with the current build tools.
2. **DO NOT Change Audio Thresholds**: The current values (Threshold: 20, Duration: 100ms) are "Goldilocks" tuned for mobile microphones.
3. **DO NOT Use `frequencyBinCount` for Volume**: We use Time Domain data for accurate waveform analysis, but the current working implementation uses `getByteFrequencyData` with a specific RMS calculation that IS WORKING. **Stick to the current `useAudioRecorder.ts` implementation.**

## 🎯 IMMEDIATE NEXT OBJECTIVE
**Phase 9: TensorFlow.js Upgrade**
The current amplitude-based detection is great ("counts ha's only"), but the next step is true ML classification using the Yamnet model to distinguish laughter from shouting/clapping.

See `ROADMAP.md` for the full plan.
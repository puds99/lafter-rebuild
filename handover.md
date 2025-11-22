# Lafter.org Rebuild - Handover Documentation

**Date:** November 22, 2025
**Status:** Phase 7 Complete (Social & Polish)

## 1. Project Overview
Lafter.org is a "Laughter Gym" application designed to help users practice laughter for mental health benefits. This rebuild transitions the project to a modern, robust stack using React, TypeScript, and Supabase.

## 2. Technology Stack
*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **Backend/Auth:** Supabase (Auth & Database)
*   **Storage:** Supabase Storage (Audio files)
*   **State/Offline:** IndexedDB (`idb`), React Context
*   **Visualization:** Recharts
*   **Animations:** Lottie-React

## 3. Key Features
*   **Authentication:** Magic Link login via Supabase.
*   **Session Recorder:**
    *   Real-time audio recording (Web Audio API).
    *   **AI Laugh Detection:** Client-side amplitude analysis to detect laughter.
    *   **Visual Feedback:** Avatar animation speed and "😂" emoji pop-ups based on volume/laughter.
    *   **Offline Support:** Saves sessions to IndexedDB if upload fails.
*   **Dashboard:**
    *   Session history chart.
    *   Metrics: Total Laughs, Laughs per Minute.
    *   **Gamification:** Daily Streak counter with Twitter sharing.
*   **Deployment:** Configured for Vercel (`vercel.json`).
*   **CI/CD:** GitHub Action for Linting and Building.

## 4. Environment Variables
Ensure these are set in `.env` (local) and Vercel Project Settings:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 5. Key Files & Directories
*   `src/hooks/useAudioRecorder.ts`: Core logic for recording and laugh detection.
*   `src/hooks/useSessionManager.ts`: Orchestrates recording, upload, and database saving.
*   `src/components/session/SessionRecorder.tsx`: Main UI for the recording experience.
*   `src/pages/Dashboard.tsx`: User stats and charts.
*   `src/lib/db.ts`: IndexedDB configuration for offline backup.

## 6. Commands
*   `npm run dev`: Start local development server.
*   `npm run build`: Type-check and build for production.
*   `npm run lint`: Run ESLint.

## 7. Known Issues / Future Work
*   **Laugh Detection Model:** Currently uses simple amplitude thresholding. Future phases should implement a TensorFlow.js model for true audio classification.
*   **Social Features:** Leaderboards and "Challenge a Friend" modes.
*   **PWA:** Add `manifest.json` and Service Workers for full installability.

## 8. Resources
*   [Deployment Verification Guide](./DEPLOYMENT_VERIFICATION.md)
*   [Blog Draft: How We Built It](./BLOG_DRAFT_LAUGH_DETECTION.md)
*   [Rebuild Log](./REBUILD_LOG.md)

---
*Built with joy by the Lafter.org Team.*

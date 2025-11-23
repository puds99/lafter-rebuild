# Laugh Starter Feature - Integration Guide

## Phase 1: Database Setup (5 minutes)

1. **Run Migration**
   ```bash
   # Execute the SQL migration in Supabase Dashboard
   # Or via CLI:
   supabase db reset  # If using local dev
   # Or manually paste contents of migrations/20231123_laugh_clips.sql
   ```

2. **Create Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create bucket: `laugh-starter-clips`
   - Set to **Public** (read access)
   - File size limit: 500KB
   - Allowed MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`

3. **Verify Setup**
   ```sql
   -- Check table exists
   SELECT * FROM laugh_clips LIMIT 1;
   
   -- Insert test clip (update IDs with real values)
   INSERT INTO laugh_clips (...) VALUES (...);
   ```

---

## Phase 2: Frontend Integration (15 minutes)

1. **Add Modal to SessionPage**
   ```typescript
   // src/pages/SessionPage.tsx
   
   import { useState, useEffect } from 'react';
   import { LaughStarterModal } from '../components/onboarding/LaughStarterModal';
   
   export function SessionPage() {
     const [showLaughStarter, setShowLaughStarter] = useState(false);
     
     // Check if first-time user
     useEffect(() => {
       const hasSeenStarter = localStorage.getItem('hasSeenLaughStarter');
       if (!hasSeenStarter) {
         setShowLaughStarter(true);
       }
     }, []);
     
     const handleCloseLaughStarter = () => {
       localStorage.setItem('hasSeenLaughStarter', 'true');
       setShowLaughStarter(false);
     };
     
     const handleStartRecording = () => {
       // Your existing startRecording logic
     };
     
     return (
       <div>
         <LaughStarterModal
           isOpen={showLaughStarter}
           onClose={handleCloseLaughStarter}
           onStart={handleStartRecording}
         />
         {/* Rest of SessionPage */}
       </div>
     );
   }
   ```

2. **Add Warmup Button (Optional)**
   ```typescript
   // src/pages/SessionPage.tsx
   
   const [showWarmup, setShowWarmup] = useState(false);
   
   <button
     onClick={() => setShowWarmup(true)}
     className="btn-primary"
   >
     🎧 Warm Up with Laughs
   </button>
   
   <LaughStarterModal
     isOpen={showWarmup}
     onClose={() => setShowWarmup(false)}
     onStart={handleStartRecording}
   />
   ```

3. **Add Post-Session Share Dialog**
   ```typescript
   // src/components/session/ShareLaughDialog.tsx (Create this)
   
   import { LaughClipExtractor } from '../../services/audio/LaughClipExtractor';
   import { supabase } from '../../lib/supabase';
   
   export function ShareLaughDialog({ 
     sessionBlob, 
     laughTimestamps, 
     sessionId, 
     userId,
     onClose 
   }) {
     const handleShare = async () => {
       const extractor = LaughClipExtractor.getInstance();
       const clip = await extractor.extractBestLaugh(sessionBlob, laughTimestamps);
       
       if (!clip) {
         alert('No suitable laugh found to share');
         return;
       }
       
       // Upload to Supabase Storage
       const fileName = `${userId}/${sessionId}_${Date.now()}.mp3`;
       const { error: uploadError } = await supabase.storage
         .from('laugh-starter-clips')
         .upload(fileName, clip.audioBlob);
       
       if (uploadError) throw uploadError;
       
       // Insert record
       const { error: insertError } = await supabase
         .from('laugh_clips')
         .insert({
           session_id: sessionId,
           user_id: userId,
           storage_path: fileName,
           duration: clip.duration,
           yamnet_score: clip.yamnetScore,
           approval_status: 'pending'
         });
       
       if (insertError) throw insertError;
       
       alert('Thank you! Your laugh is pending review.');
       onClose();
     };
     
     return (
       /* Dialog UI */
     );
   }
   ```

4. **Update `useSessionManager.ts`**
   ```typescript
   // src/hooks/useSessionManager.ts
   
   import { ShareLaughDialog } from '../components/session/ShareLaughDialog';
   
   const endSession = useCallback(async (userId: string) => {
     // ... existing code ...
     
     // After successful save, check if we should prompt for sharing
     if (recorder.laughCount >= 3) {
       // Show ShareLaughDialog (you'll need to manage this state)
       setShowShareDialog(true);
     }
   }, [recorder, state.sessionId]);
   ```

---

## Phase 3: Admin Review Queue (Optional, Manual for Now)

Create a simple admin page to review pending clips:

```typescript
// src/pages/AdminReviewPage.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function AdminReviewPage() {
  const [pendingClips, setPendingClips] = useState([]);
  
  useEffect(() => {
    fetchPending();
  }, []);
  
  const fetchPending = async () => {
    const { data } = await supabase
      .from('laugh_clips')
      .select('*')
      .eq('approval_status', 'pending')
      .order('yamnet_score', { ascending: false })
      .limit(20);
    
    setPendingClips(data || []);
  };
  
  const handleApprove = async (clipId: string) => {
    await supabase
      .from('laugh_clips')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', clipId);
    
    fetchPending();
  };
  
  const handleReject = async (clipId: string) => {
    await supabase
      .from('laugh_clips')
      .update({ 
        approval_status: 'rejected',
        reviewed_at: new Date().toISOString(),
        rejection_reason: 'Quality issue'
      })
      .eq('id', clipId);
    
    fetchPending();
  };
  
  return (
    <div>
      <h1>Review Pending Laughs</h1>
      {pendingClips.map(clip => (
        <div key={clip.id}>
          <audio controls src={/* fetch signed URL */} />
          <p>Score: {clip.yamnet_score.toFixed(2)}</p>
          <button onClick={() => handleApprove(clip.id)}>✅ Approve</button>
          <button onClick={() => handleReject(clip.id)}>❌ Reject</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 4: Testing Checklist

- [ ] Database migration runs successfully
- [ ] Storage bucket created and accessible
- [ ] LaughStarterModal opens on first session start
- [ ] Audio clips play sequentially
- [ ] Skip button enables after 2s
- [ ] Volume control works
- [ ] "Start Recording" CTA triggers session start
- [ ] Post-session share dialog appears (if 3+ laughs)
- [ ] Shared clips appear in `laugh_clips` table as pending
- [ ] Admin can review and approve clips
- [ ] Approved clips appear in next user's Laugh Starter

---

## Known Limitations & Future Enhancements

**Current Limitations:**
1. Manual admin review required (no auto-approval yet)
2. No personalization (random selection only)
3. No user feedback (thumbs up/down) UI
4. Demo mode uses placeholder URLs (no real audio)

**Roadmap:**
- **Phase 11**: Auto-approval for high-scoring clips (> 0.7)
- **Phase 12**: Embedding-based similarity matching
- **Phase 13**: Social features (share laughs publicly)
- **Phase 14**: "Laugh of the Day" featured content

-- Migration: Laugh Clips Feature for "Laugh Starter"
-- Purpose: Store, curate, and serve user-contributed laugh audio clips
-- Author: Lafter.org Team
-- Date: 2023-11-23

-- ============================================================================
-- TABLE: laugh_clips
-- ============================================================================
CREATE TABLE IF NOT EXISTS laugh_clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Storage & Metadata
    storage_path TEXT NOT NULL UNIQUE,
    duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 5000), -- milliseconds, max 5s
    file_size INTEGER, -- bytes, for analytics
    mime_type TEXT DEFAULT 'audio/mpeg',
    
    -- Quality Scoring
    yamnet_score FLOAT CHECK (yamnet_score >= 0 AND yamnet_score <= 1),
    yamnet_version TEXT DEFAULT '1.0', -- Track model version for future upgrades
    
    -- Curation Workflow
    approval_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'flagged')),
    reviewed_by UUID REFERENCES profiles(id), -- Admin who reviewed
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT, -- Optional: why rejected
    
    -- Engagement Metrics
    play_count INTEGER DEFAULT 0 CHECK (play_count >= 0),
    skip_count INTEGER DEFAULT 0 CHECK (skip_count >= 0), -- Times skipped during playback
    thumbs_up INTEGER DEFAULT 0,   -- Future: user feedback
    thumbs_down INTEGER DEFAULT 0, -- Future: user feedback
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Query Performance
-- ============================================================================

-- Primary query: Fetch random approved clips
CREATE INDEX idx_laugh_clips_approved_random 
    ON laugh_clips(approval_status, yamnet_score DESC, play_count ASC) 
    WHERE approval_status = 'approved';

-- Admin review queue: Pending clips sorted by quality
CREATE INDEX idx_laugh_clips_pending_review 
    ON laugh_clips(approval_status, yamnet_score DESC, created_at DESC) 
    WHERE approval_status = 'pending';

-- User's contributions
CREATE INDEX idx_laugh_clips_user 
    ON laugh_clips(user_id, created_at DESC);

-- Cleanup query: Old pending clips (TTL enforcement)
CREATE INDEX idx_laugh_clips_stale_pending 
    ON laugh_clips(created_at) 
    WHERE approval_status = 'pending';

-- Analytics: Top performing clips
CREATE INDEX idx_laugh_clips_performance 
    ON laugh_clips(play_count DESC, thumbs_up DESC) 
    WHERE approval_status = 'approved';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================================

ALTER TABLE laugh_clips ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can READ approved clips (for playback)
CREATE POLICY "Public read approved clips" 
    ON laugh_clips
    FOR SELECT
    USING (approval_status = 'approved');

-- Policy 2: Users can INSERT their own clips (opt-in after session)
CREATE POLICY "Users can create their own clips" 
    ON laugh_clips
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

-- Policy 3: Users can VIEW their own clips (all statuses)
CREATE POLICY "Users can view their own clips" 
    ON laugh_clips
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 4: Admins can do everything (UPDATE for approval, DELETE for moderation)
-- Note: You'll need to define an admin role. For now, using a specific user ID or custom claim.
-- Example: CREATE POLICY "Admins full access" ON laugh_clips USING (auth.jwt() ->> 'role' = 'admin');
-- Placeholder for when you implement admin roles:
CREATE POLICY "Admins can review clips" 
    ON laugh_clips
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email LIKE '%@lafter.org' -- Replace with actual admin check
        )
    );

-- ============================================================================
-- TRIGGER: Auto-update `updated_at` on row changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_laugh_clips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_laugh_clips_updated_at
    BEFORE UPDATE ON laugh_clips
    FOR EACH ROW
    EXECUTE FUNCTION update_laugh_clips_updated_at();

-- ============================================================================
-- SUPABASE STORAGE BUCKET: laugh-starter-clips
-- ============================================================================
-- Note: This is typically done via Supabase Dashboard or API, not pure SQL.
-- Below is the equivalent configuration you should apply:

-- Via Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Name: laugh-starter-clips
-- 3. Public: TRUE (for read access)
-- 4. File Size Limit: 500KB (enforced client-side, but good to set)
-- 5. Allowed MIME types: audio/mpeg, audio/mp3, audio/wav

-- Via Supabase API (if automating):
-- POST /rest/v1/rpc/create_bucket
-- { "name": "laugh-starter-clips", "public": true }

-- Storage RLS Policy (via SQL if bucket already exists):
-- This allows public SELECT, but only authenticated users can INSERT
-- Supabase handles this via bucket.public = true setting.

-- ============================================================================
-- SAMPLE INSERT for Testing
-- ============================================================================

-- Insert a test clip (you'll need to first create a session and upload a file)
-- Example assumes session_id and user_id exist, and file is uploaded to storage

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
    '00000000-0000-0000-0000-000000000001', -- Replace with real session_id
    '00000000-0000-0000-0000-000000000002', -- Replace with real user_id
    'laugh-starter-clips/test_laugh_001.mp3',
    2500, -- 2.5 seconds
    48000, -- 48KB
    'audio/mpeg',
    0.85, -- High quality laugh
    'approved' -- Pre-approved for testing
);

-- Query to verify:
SELECT 
    id, 
    storage_path, 
    duration, 
    yamnet_score, 
    approval_status, 
    play_count 
FROM laugh_clips 
WHERE approval_status = 'approved';

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Auto-Reject stale pending clips (run via cron job or Supabase Function)
UPDATE laugh_clips
SET 
    approval_status = 'rejected',
    rejection_reason = 'Auto-rejected: Pending too long (30+ days)',
    reviewed_at = NOW()
WHERE 
    approval_status = 'pending' 
    AND created_at < NOW() - INTERVAL '30 days';

-- Fetch 5 random approved clips (weighted by low play_count)
SELECT 
    id, 
    storage_path, 
    duration, 
    yamnet_score 
FROM laugh_clips
WHERE approval_status = 'approved'
ORDER BY play_count ASC, RANDOM()
LIMIT 5;

-- Increment play count (call after a clip is played)
UPDATE laugh_clips
SET play_count = play_count + 1
WHERE id = 'CLIP_ID_HERE';

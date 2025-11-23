import { useState, useCallback } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';

interface LaughClip {
    id: string;
    storage_path: string;
    duration: number;
    yamnet_score: number;
    signedUrl?: string;
}

interface UseLaughStarterReturn {
    clips: LaughClip[];
    isLoading: boolean;
    error: string | null;
    fetchClips: (count?: number) => Promise<void>;
    getSignedUrl: (storagePath: string) => Promise<string | null>;
    incrementPlayCount: (clipId: string) => Promise<void>;
}

/**
 * Hook to manage Laugh Starter clips
 * 
 * Features:
 * - Fetches random approved clips weighted by play_count
 * - Generates signed URLs for Supabase Storage
 * - Tracks analytics (play counts)
 * - Demo mode support (uses local mock data)
 */
export function useLaughStarter(): UseLaughStarterReturn {
    const [clips, setClips] = useState<LaughClip[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch random approved clips
     * Algorithm: Weighted random selection favoring less-played clips
     */
    const fetchClips = useCallback(async (count: number = 5) => {
        setIsLoading(true);
        setError(null);

        try {
            // Always use Local DB for Phase 12 (Personalization)
            const { getLaughClips, getAllInteractions } = await import('../lib/db');
            const [allClips, interactions] = await Promise.all([
                getLaughClips(),
                getAllInteractions()
            ]);

            // 1. Filter for approved clips
            const approvedClips = allClips.filter(c => c.approval_status === 'approved');

            if (approvedClips.length === 0) {
                // Fallback to mock if empty
                if (DEMO_MODE) {
                    const mockClips: LaughClip[] = [
                        { id: 'demo-1', storage_path: 'demo/laugh1.mp3', duration: 2500, yamnet_score: 0.85, signedUrl: '/demo-audio/laugh1.mp3' },
                        { id: 'demo-2', storage_path: 'demo/laugh2.mp3', duration: 3000, yamnet_score: 0.78, signedUrl: '/demo-audio/laugh2.mp3' },
                        { id: 'demo-3', storage_path: 'demo/laugh3.mp3', duration: 2800, yamnet_score: 0.92, signedUrl: '/demo-audio/laugh3.mp3' }
                    ];
                    setClips(mockClips.slice(0, count));
                    setIsLoading(false);
                    return;
                }
                setError('No approved clips available yet.');
                setClips([]);
                setIsLoading(false);
                return;
            }

            // 2. Calculate Weights
            const now = Date.now();
            const weightedClips = approvedClips.map(clip => {
                const interaction = interactions.find(i => i.clip_id === clip.id);
                let weight = 1.0;

                // Boosts
                if (interaction?.liked) weight += 2.0;
                if (clip.yamnet_score > 0.9) weight += 1.5;

                // Penalties
                if (interaction?.skipped_count && interaction.skipped_count > 2) weight -= 2.0;

                // Cool Down (Played in last hour)
                if (interaction?.last_played_at && (now - interaction.last_played_at) < 3600000) {
                    weight -= 5.0;
                }

                return { ...clip, weight: Math.max(0.1, weight) }; // Min weight 0.1
            });

            // 3. Weighted Random Selection
            const selected: LaughClip[] = [];
            const pool = [...weightedClips];

            for (let i = 0; i < count; i++) {
                if (pool.length === 0) break;

                const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
                let random = Math.random() * totalWeight;

                const index = pool.findIndex(c => {
                    random -= c.weight;
                    return random <= 0;
                });

                if (index !== -1) {
                    const chosen = pool[index];
                    selected.push({
                        id: chosen.id,
                        storage_path: chosen.storage_path,
                        duration: chosen.duration,
                        yamnet_score: chosen.yamnet_score,
                        signedUrl: URL.createObjectURL(chosen.blob)
                    });
                    pool.splice(index, 1); // Remove to avoid duplicates in this batch
                }
            }

            setClips(selected);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load laugh clips';
            setError(message);
            console.error('❌ Failed to fetch laugh clips:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Generate a signed URL for a storage path
     * Required for private buckets, but also works for public
     */
    const getSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
        try {
            if (DEMO_MODE) {
                return storagePath; // Demo mode uses direct paths
            }

            const { data, error } = await supabase.storage
                .from('laugh-starter-clips')
                .createSignedUrl(storagePath, 3600); // Valid for 1 hour

            if (error) throw error;
            return data.signedUrl;

        } catch (err) {
            console.error('❌ Failed to generate signed URL:', err);
            return null;
        }
    }, []);

    /**
     * Increment play count for analytics
     * Fired when a clip finishes playing
     */
    const incrementPlayCount = useCallback(async (clipId: string) => {
        if (DEMO_MODE) return; // Skip in demo mode

        try {
            // Fetch current count
            const { data: currentData } = await supabase
                .from('laugh_clips')
                .select('play_count')
                .eq('id', clipId)
                .single();

            if (!currentData) return;

            // Increment
            const { error } = await supabase
                .from('laugh_clips')
                .update({ play_count: (currentData.play_count || 0) + 1 })
                .eq('id', clipId);

            if (error) throw error;

        } catch (err) {
            console.error('❌ Failed to increment play count:', err);
            // Non-critical error, don't show user
        }
    }, []);

    return {
        clips,
        isLoading,
        error,
        fetchClips,
        getSignedUrl,
        incrementPlayCount
    };
}

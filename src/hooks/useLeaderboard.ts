import { useEffect, useState } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';

export interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    current_streak: number;
    total_laughs: number;
}

// Mock leaderboard for demo mode
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
    { user_id: 'demo-1', display_name: 'HappyHal', avatar_url: null, current_streak: 7, total_laughs: 42 },
    { user_id: 'demo-2', display_name: 'GigglyGina', avatar_url: null, current_streak: 5, total_laughs: 38 },
    { user_id: 'demo-3', display_name: 'JollyJim', avatar_url: null, current_streak: 4, total_laughs: 25 },
];

export function useLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // DEMO MODE: Return mock leaderboard
        if (DEMO_MODE) {
            setLeaderboard(DEMO_LEADERBOARD);
            setLoading(false);
            return;
        }

        async function fetchLeaderboard() {
            try {
                setLoading(true);
                // Call the RPC function we defined in SQL
                const { data, error } = await supabase
                    .rpc('get_top_streaks', { limit_count: 10 });

                if (error) throw error;

                setLeaderboard(data || []);
            } catch (err: any) {
                console.error('Error fetching leaderboard:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, []);

    return { leaderboard, loading, error };
}

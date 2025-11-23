import { useEffect, useState } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';

export interface SessionData {
    id: string;
    created_at: string;
    duration: number;
    laugh_count: number;
}

export function useAnalytics(userId: string | undefined) {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        // DEMO MODE: Return empty sessions (user can build history locally)
        if (DEMO_MODE) {
            setSessions([]);
            setLoading(false);
            return;
        }

        const fetchSessions = async () => {
            try {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setSessions(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, [userId]);

    const calculateStreak = (sessions: SessionData[]) => {
        if (sessions.length === 0) return 0;

        // Sort by date descending
        const sortedSessions = [...sessions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Get unique dates (YYYY-MM-DD)
        const uniqueDates = Array.from(new Set(sortedSessions.map(s =>
            new Date(s.created_at).toISOString().split('T')[0]
        )));

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if the most recent session was today or yesterday to keep streak alive
        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
            return 0;
        }

        // Count consecutive days
        let currentDate = new Date(uniqueDates[0]);

        for (let i = 0; i < uniqueDates.length; i++) {
            const sessionDate = new Date(uniqueDates[i]);
            const diffTime = Math.abs(currentDate.getTime() - sessionDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (i === 0) {
                streak++;
            } else if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
            currentDate = sessionDate;
        }

        return streak;
    };

    const streak = calculateStreak(sessions);

    return { sessions, loading, error, streak };
}

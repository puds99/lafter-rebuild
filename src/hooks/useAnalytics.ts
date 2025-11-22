import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

    return { sessions, loading, error };
}

-- RUN THIS IN SUPABASE SQL EDITOR
-- The leaderboard hook calls this function but it doesn't exist yet

CREATE OR REPLACE FUNCTION get_top_streaks(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    current_streak INTEGER,
    longest_streak INTEGER,
    total_sessions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.user_id,
        COALESCE(p.display_name, 'Anonymous') as display_name,
        s.current_streak,
        s.longest_streak,
        s.total_sessions
    FROM public.streaks s
    LEFT JOIN public.profiles p ON p.id = s.user_id
    WHERE s.current_streak > 0
    ORDER BY s.current_streak DESC, s.longest_streak DESC
    LIMIT limit_count;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_top_streaks TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_streaks TO anon;
